package handlers

import (
	"net/http"

	"github.com/everest-an/dchat-backend/internal/auth"
	"github.com/gin-gonic/gin"
)

type AuthHandler struct {
	userService *auth.UserService
	jwtService  *auth.JWTService
	web3Service *auth.Web3Service
}

func NewAuthHandler(userService *auth.UserService, jwtService *auth.JWTService, web3Service *auth.Web3Service) *AuthHandler {
	return &AuthHandler{
		userService: userService,
		jwtService:  jwtService,
		web3Service: web3Service,
	}
}

type WalletLoginRequest struct {
	WalletAddress string `json:"wallet_address" binding:"required"`
	Signature     string `json:"signature" binding:"required"`
	Message       string `json:"message" binding:"required"`
}

type LoginResponse struct {
	Token   string      `json:"token"`
	User    interface{} `json:"user"`
	IsNewUser bool      `json:"is_new_user"`
}

// WalletLogin handles MetaMask wallet login
func (h *AuthHandler) WalletLogin(c *gin.Context) {
	var req WalletLoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
		return
	}

	// Verify signature
	valid, err := h.web3Service.VerifySignature(req.WalletAddress, req.Message, req.Signature)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Failed to verify signature"})
		return
	}

	if !valid {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid signature"})
		return
	}

	// Get or create user (ensures one wallet = one account)
	user, isNew, err := h.userService.GetOrCreateUserByWallet(req.WalletAddress)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to process user"})
		return
	}

	// Generate JWT token
	token, err := h.jwtService.GenerateToken(user.ID, user.WalletAddress)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate token"})
		return
	}

	c.JSON(http.StatusOK, LoginResponse{
		Token:     token,
		User:      user,
		IsNewUser: isNew,
	})
}

type GetNonceRequest struct{
	WalletAddress string `json:"wallet_address" binding:"required"`
}

type NonceResponse struct {
	Nonce   string `json:"nonce"`
	Message string `json:"message"`
}

// GetNonce generates a nonce for wallet signature
func (h *AuthHandler) GetNonce(c *gin.Context) {
	var req GetNonceRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
		return
	}

	nonce, err := h.web3Service.GenerateNonce()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate nonce"})
		return
	}

	message := "Sign this message to authenticate with dChat: " + nonce

	c.JSON(http.StatusOK, NonceResponse{
		Nonce:   nonce,
		Message: message,
	})
}

// GetCurrentUser returns the currently authenticated user
func (h *AuthHandler) GetCurrentUser(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	user, err := h.userService.GetUserByID(userID.(uint))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	c.JSON(http.StatusOK, user)
}
