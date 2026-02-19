package handlers

import (
	"fmt"
	"log/slog"
	"regexp"
	"strings"

	"github.com/everest-an/dchat-backend/internal/auth"
	"github.com/everest-an/dchat-backend/internal/response"
	"github.com/everest-an/dchat-backend/internal/services"
	"github.com/gin-gonic/gin"
)

var ethAddressRe = regexp.MustCompile(`^0x[0-9a-fA-F]{40}$`)

// AuthHandler handles wallet-based authentication endpoints.
type AuthHandler struct {
	userService  *auth.UserService
	jwtService   *auth.JWTService
	web3Service  *auth.Web3Service
	nonceStore   *auth.NonceStore
	twofaHandler *TwoFAHandler
	auditService *services.AuditService
	log          *slog.Logger
}

// NewAuthHandler creates an AuthHandler with all required dependencies.
func NewAuthHandler(
	userService *auth.UserService,
	jwtService *auth.JWTService,
	web3Service *auth.Web3Service,
	nonceStore *auth.NonceStore,
	log *slog.Logger,
) *AuthHandler {
	return &AuthHandler{
		userService: userService,
		jwtService:  jwtService,
		web3Service: web3Service,
		nonceStore:  nonceStore,
		log:         log,
	}
}

// SetTwoFAHandler injects the 2FA handler for login verification.
func (h *AuthHandler) SetTwoFAHandler(tfa *TwoFAHandler) {
	h.twofaHandler = tfa
}

// SetAuditService injects the audit service for login event logging.
func (h *AuthHandler) SetAuditService(as *services.AuditService) {
	h.auditService = as
}

// --- Request / Response DTOs ---

// GetNonceRequest is the body for POST /api/auth/nonce.
type GetNonceRequest struct {
	WalletAddress string `json:"wallet_address" binding:"required"`
}

// NonceResponse is returned by GetNonce.
type NonceResponse struct {
	Nonce   string `json:"nonce"`
	Message string `json:"message"`
}

// WalletLoginRequest is the body for POST /api/auth/wallet-login.
type WalletLoginRequest struct {
	WalletAddress string `json:"wallet_address" binding:"required"`
	Signature     string `json:"signature" binding:"required"`
	Nonce         string `json:"nonce" binding:"required"`
	TotpCode      string `json:"totp_code"` // optional, required when 2FA is enabled
}

// LoginResponse is returned by WalletLogin.
type LoginResponse struct {
	Token       string      `json:"token"`
	User        interface{} `json:"user"`
	IsNewUser   bool        `json:"is_new_user"`
	Requires2FA bool        `json:"requires_2fa,omitempty"`
}

// --- Handlers ---

// GetNonce generates a nonce for wallet signature verification.
// POST /api/auth/nonce
func (h *AuthHandler) GetNonce(c *gin.Context) {
	var req GetNonceRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ValidationError(c, "wallet_address is required")
		return
	}

	if !ethAddressRe.MatchString(req.WalletAddress) {
		response.ValidationError(c, "invalid Ethereum wallet address format")
		return
	}

	nonce, err := h.nonceStore.Generate(strings.ToLower(req.WalletAddress))
	if err != nil {
		h.log.Error("failed to generate nonce", "error", err, "wallet", req.WalletAddress)
		response.InternalError(c, "failed to generate nonce")
		return
	}

	message := "Sign this message to authenticate with dChat: " + nonce

	response.OK(c, NonceResponse{
		Nonce:   nonce,
		Message: message,
	})
}

// WalletLogin verifies a wallet signature and returns a JWT.
// POST /api/auth/wallet-login
func (h *AuthHandler) WalletLogin(c *gin.Context) {
	var req WalletLoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ValidationError(c, "wallet_address, signature, and nonce are required")
		return
	}

	if !ethAddressRe.MatchString(req.WalletAddress) {
		response.ValidationError(c, "invalid Ethereum wallet address format")
		return
	}

	wallet := strings.ToLower(req.WalletAddress)

	// Validate nonce from Redis (one-time use).
	valid, err := h.nonceStore.Validate(wallet, req.Nonce)
	if err != nil {
		h.log.Error("nonce validation error", "error", err, "wallet", wallet)
		response.InternalError(c, "failed to validate nonce")
		return
	}
	if !valid {
		response.ErrorWithCode(c, 401, response.ErrCodeNonceInvalid, "nonce is invalid or expired")
		return
	}

	// Reconstruct the signed message and verify the signature.
	message := "Sign this message to authenticate with dChat: " + req.Nonce
	sigValid, err := h.web3Service.VerifySignature(req.WalletAddress, message, req.Signature)
	if err != nil {
		h.log.Error("signature verification error", "error", err, "wallet", wallet)
		response.BadRequest(c, "failed to verify signature")
		return
	}
	if !sigValid {
		response.ErrorWithCode(c, 401, response.ErrCodeSignature, "invalid wallet signature")
		return
	}

	// Get or create user.
	user, isNew, err := h.userService.GetOrCreateUserByWallet(wallet)
	if err != nil {
		h.log.Error("user lookup/create failed", "error", err, "wallet", wallet)
		response.InternalError(c, "failed to process user account")
		return
	}

	// Check 2FA requirement.
	if user.Is2FAEnabled && h.twofaHandler != nil {
		if req.TotpCode == "" {
			// 2FA is required but no code provided — tell client.
			response.OK(c, LoginResponse{
				Requires2FA: true,
			})
			return
		}
		if !h.twofaHandler.Validate2FALogin(user, req.TotpCode) {
			response.ErrorWithCode(c, 401, response.ErrCodeUnauthorized, "invalid 2FA code")
			return
		}
	}

	// Generate JWT.
	token, err := h.jwtService.GenerateToken(user.ID, user.WalletAddress, user.Role)
	if err != nil {
		h.log.Error("token generation failed", "error", err, "user_id", user.ID)
		response.InternalError(c, "failed to generate authentication token")
		return
	}

	h.log.Info("user authenticated", "user_id", user.ID, "wallet", wallet, "is_new", isNew)

	// Audit log: user login.
	if h.auditService != nil {
		action := "user_login"
		if isNew {
			action = "user_register"
		}
		h.auditService.Log(user.ID, action, fmt.Sprintf("user:%d", user.ID), wallet, c.ClientIP())
	}

	response.OK(c, LoginResponse{
		Token:     token,
		User:      user,
		IsNewUser: isNew,
	})
}

// GetCurrentUser returns the profile of the authenticated user.
// GET /api/user/me
func (h *AuthHandler) GetCurrentUser(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		response.Unauthorized(c, "authentication required")
		return
	}

	user, err := h.userService.GetUserByID(userID.(uint))
	if err != nil {
		response.NotFound(c, "user not found")
		return
	}

	response.OK(c, user)
}
