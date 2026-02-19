package handlers

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/base32"
	"encoding/hex"
	"fmt"
	"log/slog"
	"strings"

	"github.com/everest-an/dchat-backend/internal/models"
	"github.com/everest-an/dchat-backend/internal/response"
	"github.com/gin-gonic/gin"
	"github.com/pquerna/otp/totp"
	"gorm.io/gorm"
)

const (
	totpIssuer      = "dChat"
	backupCodeCount = 8
	backupCodeLen   = 8 // characters per backup code
)

// TwoFAHandler handles two-factor authentication endpoints.
type TwoFAHandler struct {
	db  *gorm.DB
	log *slog.Logger
}

// NewTwoFAHandler creates a TwoFAHandler.
func NewTwoFAHandler(db *gorm.DB, log *slog.Logger) *TwoFAHandler {
	return &TwoFAHandler{db: db, log: log}
}

// SetupResponse is returned by Setup2FA.
type SetupResponse struct {
	Secret  string `json:"secret"`
	QRCodeURL string `json:"qr_code_url"`
}

// Setup2FA generates a TOTP secret and returns it with a QR code URL.
// POST /api/auth/2fa/setup
func (h *TwoFAHandler) Setup2FA(c *gin.Context) {
	userID := mustUserID(c)

	var user models.User
	if err := h.db.First(&user, userID).Error; err != nil {
		response.NotFound(c, "user not found")
		return
	}

	if user.Is2FAEnabled {
		response.BadRequest(c, "2FA is already enabled")
		return
	}

	// Generate a random secret.
	secret := generateTOTPSecret()

	// Store the secret (not yet enabled — user must verify first).
	if err := h.db.Model(&user).Update("totp_secret", secret).Error; err != nil {
		h.log.Error("failed to store TOTP secret", "error", err, "user", userID)
		response.InternalError(c, "failed to setup 2FA")
		return
	}

	// Build otpauth URL for QR code generation on the frontend.
	accountName := user.WalletAddress
	if user.Username != "" {
		accountName = user.Username
	}
	otpauthURL := fmt.Sprintf("otpauth://totp/%s:%s?secret=%s&issuer=%s&digits=6&period=30",
		totpIssuer, accountName, secret, totpIssuer)

	response.OK(c, SetupResponse{
		Secret:    secret,
		QRCodeURL: otpauthURL,
	})
}

// Verify2FARequest is the body for POST /api/auth/2fa/verify.
type Verify2FARequest struct {
	Code string `json:"code" binding:"required"`
}

// Verify2FA verifies the TOTP code and activates 2FA.
// POST /api/auth/2fa/verify
func (h *TwoFAHandler) Verify2FA(c *gin.Context) {
	userID := mustUserID(c)

	var req Verify2FARequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ValidationError(c, "code is required")
		return
	}

	var user models.User
	if err := h.db.First(&user, userID).Error; err != nil {
		response.NotFound(c, "user not found")
		return
	}

	if user.TotpSecret == "" {
		response.BadRequest(c, "please call setup first")
		return
	}

	if user.Is2FAEnabled {
		response.BadRequest(c, "2FA is already enabled")
		return
	}

	// Validate the code.
	if !totp.Validate(req.Code, user.TotpSecret) {
		response.BadRequest(c, "invalid verification code")
		return
	}

	// Generate backup codes.
	codes, hashedCSV := generateBackupCodes()

	err := h.db.Model(&user).Updates(map[string]interface{}{
		"is_2fa_enabled": true,
		"backup_codes":   hashedCSV,
	}).Error
	if err != nil {
		h.log.Error("failed to enable 2FA", "error", err, "user", userID)
		response.InternalError(c, "failed to enable 2FA")
		return
	}

	h.log.Info("2FA enabled", "user", userID)
	response.OK(c, gin.H{
		"message":      "2FA enabled successfully",
		"backup_codes": codes, // show plaintext once, user must save them
	})
}

// Disable2FARequest is the body for POST /api/auth/2fa/disable.
type Disable2FARequest struct {
	Code string `json:"code" binding:"required"`
}

// Disable2FA turns off 2FA after verifying a current code.
// POST /api/auth/2fa/disable
func (h *TwoFAHandler) Disable2FA(c *gin.Context) {
	userID := mustUserID(c)

	var req Disable2FARequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ValidationError(c, "code is required")
		return
	}

	var user models.User
	if err := h.db.First(&user, userID).Error; err != nil {
		response.NotFound(c, "user not found")
		return
	}

	if !user.Is2FAEnabled {
		response.BadRequest(c, "2FA is not enabled")
		return
	}

	if !totp.Validate(req.Code, user.TotpSecret) {
		response.BadRequest(c, "invalid verification code")
		return
	}

	err := h.db.Model(&user).Updates(map[string]interface{}{
		"is_2fa_enabled": false,
		"totp_secret":    "",
		"backup_codes":   "",
	}).Error
	if err != nil {
		h.log.Error("failed to disable 2FA", "error", err, "user", userID)
		response.InternalError(c, "failed to disable 2FA")
		return
	}

	h.log.Info("2FA disabled", "user", userID)
	response.OK(c, gin.H{"message": "2FA has been disabled"})
}

// RegenerateBackupCodes generates new backup codes (requires valid TOTP code).
// POST /api/auth/2fa/backup-codes
func (h *TwoFAHandler) RegenerateBackupCodes(c *gin.Context) {
	userID := mustUserID(c)

	var req Verify2FARequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ValidationError(c, "code is required")
		return
	}

	var user models.User
	if err := h.db.First(&user, userID).Error; err != nil {
		response.NotFound(c, "user not found")
		return
	}

	if !user.Is2FAEnabled {
		response.BadRequest(c, "2FA is not enabled")
		return
	}

	if !totp.Validate(req.Code, user.TotpSecret) {
		response.BadRequest(c, "invalid verification code")
		return
	}

	codes, hashedCSV := generateBackupCodes()

	if err := h.db.Model(&user).Update("backup_codes", hashedCSV).Error; err != nil {
		h.log.Error("failed to regenerate backup codes", "error", err, "user", userID)
		response.InternalError(c, "failed to regenerate backup codes")
		return
	}

	response.OK(c, gin.H{"backup_codes": codes})
}

// Validate2FALogin checks a TOTP code or backup code during login.
// This is called internally by the auth handler, not as a standalone endpoint.
func (h *TwoFAHandler) Validate2FALogin(user *models.User, code string) bool {
	// Try TOTP first.
	if totp.Validate(code, user.TotpSecret) {
		return true
	}

	// Try backup codes.
	if user.BackupCodes == "" {
		return false
	}

	hashed := hashCode(code)
	storedCodes := strings.Split(user.BackupCodes, ",")
	for i, sc := range storedCodes {
		if sc == hashed {
			// Remove used backup code.
			remaining := append(storedCodes[:i], storedCodes[i+1:]...)
			h.db.Model(user).Update("backup_codes", strings.Join(remaining, ","))
			return true
		}
	}
	return false
}

// --- Helpers ---

func generateTOTPSecret() string {
	b := make([]byte, 20)
	rand.Read(b)
	return base32.StdEncoding.WithPadding(base32.NoPadding).EncodeToString(b)
}

func generateBackupCodes() (plainCodes []string, hashedCSV string) {
	codes := make([]string, backupCodeCount)
	hashed := make([]string, backupCodeCount)
	for i := 0; i < backupCodeCount; i++ {
		code := randomAlphaNum(backupCodeLen)
		codes[i] = code
		hashed[i] = hashCode(code)
	}
	return codes, strings.Join(hashed, ",")
}

func hashCode(code string) string {
	h := sha256.Sum256([]byte(code))
	return hex.EncodeToString(h[:])
}

func randomAlphaNum(n int) string {
	const charset = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789" // no confusing chars
	b := make([]byte, n)
	rand.Read(b)
	for i := range b {
		b[i] = charset[int(b[i])%len(charset)]
	}
	return string(b)
}
