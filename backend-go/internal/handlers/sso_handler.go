package handlers

import (
	"crypto/rand"
	"encoding/hex"
	"log/slog"
	"time"

	"github.com/everest-an/dchat-backend/internal/auth"
	"github.com/everest-an/dchat-backend/internal/models"
	"github.com/everest-an/dchat-backend/internal/response"
	"github.com/everest-an/dchat-backend/internal/sso"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// SSOHandler handles enterprise SSO endpoints.
type SSOHandler struct {
	db         *gorm.DB
	log        *slog.Logger
	oidc       *sso.OIDCClient
	jwtService *auth.JWTService
}

// NewSSOHandler creates an SSOHandler.
func NewSSOHandler(db *gorm.DB, jwtService *auth.JWTService, log *slog.Logger) *SSOHandler {
	return &SSOHandler{
		db:         db,
		log:        log,
		oidc:       sso.NewOIDCClient(),
		jwtService: jwtService,
	}
}

// GetProviders returns all enabled SSO providers (public info only).
// GET /api/sso/providers
func (h *SSOHandler) GetProviders(c *gin.Context) {
	var providers []models.SSOProvider
	h.db.Where("enabled = ?", true).
		Select("id, name, protocol, domain, sso_url, callback_url, created_at").
		Find(&providers)

	response.OK(c, providers)
}

// GetProviderByDomain returns the SSO provider for an email domain.
// GET /api/sso/providers/domain/:domain
func (h *SSOHandler) GetProviderByDomain(c *gin.Context) {
	domain := c.Param("domain")

	var provider models.SSOProvider
	if err := h.db.Where("domain = ? AND enabled = ?", domain, true).First(&provider).Error; err != nil {
		response.NotFound(c, "no SSO provider for this domain")
		return
	}

	response.OK(c, gin.H{
		"id":       provider.ID,
		"name":     provider.Name,
		"protocol": provider.Protocol,
		"sso_url":  provider.SSOURL,
	})
}

// InitiateSSO starts the SSO login flow.
// POST /api/sso/initiate
func (h *SSOHandler) InitiateSSO(c *gin.Context) {
	var req struct {
		ProviderID uint `json:"provider_id" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ValidationError(c, "provider_id is required")
		return
	}

	var provider models.SSOProvider
	if err := h.db.First(&provider, req.ProviderID).Error; err != nil {
		response.NotFound(c, "SSO provider not found")
		return
	}

	if !provider.Enabled {
		response.Forbidden(c, "SSO provider is disabled")
		return
	}

	// Generate state token for CSRF protection.
	state := generateRandomToken(32)

	if provider.Protocol == "oidc" {
		redirectURL := h.oidc.AuthorizationURL(
			provider.SSOURL, provider.ClientID, provider.CallbackURL, state,
		)
		response.OK(c, gin.H{
			"redirect_url": redirectURL,
			"state":        state,
		})
		return
	}

	// For SAML, return the IdP SSO URL for the frontend to redirect to.
	response.OK(c, gin.H{
		"redirect_url": provider.SSOURL,
		"state":        state,
	})
}

// CallbackOIDC handles the OIDC callback after IdP authentication.
// POST /api/sso/callback/oidc
func (h *SSOHandler) CallbackOIDC(c *gin.Context) {
	var req struct {
		Code       string `json:"code" binding:"required"`
		State      string `json:"state" binding:"required"`
		ProviderID uint   `json:"provider_id" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ValidationError(c, "code, state, and provider_id are required")
		return
	}

	var provider models.SSOProvider
	if err := h.db.First(&provider, req.ProviderID).Error; err != nil {
		response.NotFound(c, "SSO provider not found")
		return
	}

	// Exchange code for tokens.
	tokenResp, err := h.oidc.ExchangeCode(
		provider.TokenURL, provider.ClientID, provider.ClientSecret,
		req.Code, provider.CallbackURL,
	)
	if err != nil {
		h.log.Error("OIDC code exchange failed", "error", err)
		response.InternalError(c, "SSO authentication failed")
		return
	}

	// Get user info.
	userInfo, err := h.oidc.GetUserInfo(provider.UserInfoURL, tokenResp.AccessToken)
	if err != nil {
		h.log.Error("OIDC userinfo failed", "error", err)
		response.InternalError(c, "failed to get user info from SSO provider")
		return
	}

	// Find or create user by email.
	var user models.User
	err = h.db.Where("email = ?", userInfo.Email).First(&user).Error
	if err != nil {
		// Create new user from SSO.
		user = models.User{
			Email:           userInfo.Email,
			Name:            userInfo.Name,
			IsEmailVerified: true,
		}
		if err := h.db.Create(&user).Error; err != nil {
			h.log.Error("failed to create SSO user", "error", err)
			response.InternalError(c, "failed to create user account")
			return
		}
	}

	// Create SSO session.
	sessionID := generateRandomToken(32)
	ssoSession := models.SSOSession{
		UserID:     user.ID,
		ProviderID: provider.ID,
		ExternalID: userInfo.Sub,
		Email:      userInfo.Email,
		SessionID:  sessionID,
		ExpiresAt:  time.Now().Add(24 * time.Hour),
	}
	h.db.Create(&ssoSession)

	// Generate JWT token.
	token, err := h.jwtService.GenerateToken(user.ID, user.WalletAddress, user.Role)
	if err != nil {
		h.log.Error("failed to generate JWT for SSO user", "error", err)
		response.InternalError(c, "failed to generate authentication token")
		return
	}

	response.OK(c, gin.H{
		"token": token,
		"user":  user,
	})
}

// --- Admin endpoints ---

// CreateProvider creates a new SSO provider (admin only).
// POST /api/admin/sso/providers
func (h *SSOHandler) CreateProvider(c *gin.Context) {
	var provider models.SSOProvider
	if err := c.ShouldBindJSON(&provider); err != nil {
		response.ValidationError(c, "invalid provider configuration")
		return
	}

	if err := h.db.Create(&provider).Error; err != nil {
		h.log.Error("failed to create SSO provider", "error", err)
		response.InternalError(c, "failed to create SSO provider")
		return
	}

	response.Created(c, provider)
}

// UpdateProvider updates an SSO provider (admin only).
// PUT /api/admin/sso/providers/:id
func (h *SSOHandler) UpdateProvider(c *gin.Context) {
	providerID, err := parseUintParam(c, "id")
	if err != nil {
		response.ValidationError(c, "invalid provider id")
		return
	}

	var provider models.SSOProvider
	if err := h.db.First(&provider, providerID).Error; err != nil {
		response.NotFound(c, "SSO provider not found")
		return
	}

	var updates map[string]interface{}
	if err := c.ShouldBindJSON(&updates); err != nil {
		response.ValidationError(c, "invalid request body")
		return
	}

	if err := h.db.Model(&provider).Updates(updates).Error; err != nil {
		h.log.Error("failed to update SSO provider", "error", err)
		response.InternalError(c, "failed to update SSO provider")
		return
	}

	h.db.First(&provider, providerID)
	response.OK(c, provider)
}

// DeleteProvider deletes an SSO provider (admin only).
// DELETE /api/admin/sso/providers/:id
func (h *SSOHandler) DeleteProvider(c *gin.Context) {
	providerID, err := parseUintParam(c, "id")
	if err != nil {
		response.ValidationError(c, "invalid provider id")
		return
	}

	result := h.db.Delete(&models.SSOProvider{}, providerID)
	if result.RowsAffected == 0 {
		response.NotFound(c, "SSO provider not found")
		return
	}

	response.OK(c, gin.H{"message": "SSO provider deleted"})
}

func generateRandomToken(length int) string {
	b := make([]byte, length)
	rand.Read(b)
	return hex.EncodeToString(b)
}
