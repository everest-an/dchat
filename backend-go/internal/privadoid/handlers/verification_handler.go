package handlers

import (
	"database/sql"
	"log/slog"
	"strconv"

	"github.com/everest-an/dchat-backend/internal/privadoid"
	"github.com/everest-an/dchat-backend/internal/privadoid/models"
	"github.com/everest-an/dchat-backend/internal/privadoid/services"
	"github.com/everest-an/dchat-backend/internal/response"

	"github.com/gin-gonic/gin"
)

// VerificationHandler handles HTTP requests for Privado ID verifications.
type VerificationHandler struct {
	service *services.VerifierService
	log     *slog.Logger
}

// NewVerificationHandler creates a new verification handler.
func NewVerificationHandler(db *sql.DB, config *privadoid.Config, log *slog.Logger) *VerificationHandler {
	return &VerificationHandler{
		service: services.NewVerifierService(db, config),
		log:     log,
	}
}

// CreateRequest handles POST /api/verifications/request
func (h *VerificationHandler) CreateRequest(c *gin.Context) {
	userID := getUserIDFromContext(c)
	if userID == 0 {
		response.Unauthorized(c, "authentication required")
		return
	}

	var req models.VerificationRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ValidationError(c, "invalid request body")
		return
	}

	if req.Type == "" {
		response.ValidationError(c, "verification type is required")
		return
	}

	resp, err := h.service.CreateVerificationRequest(c.Request.Context(), userID, &req)
	if err != nil {
		h.log.Error("create verification request failed", "error", err, "user_id", userID)
		response.InternalError(c, "failed to create verification request")
		return
	}

	response.OK(c, resp)
}

// VerifyProof handles POST /api/verifications/verify
func (h *VerificationHandler) VerifyProof(c *gin.Context) {
	var submission models.ProofSubmission
	if err := c.ShouldBindJSON(&submission); err != nil {
		response.ValidationError(c, "invalid request body")
		return
	}

	// TODO: In production, extract user ID from the proof's DID.
	userID := int64(1)

	verification, err := h.service.VerifyProof(c.Request.Context(), userID, &submission)
	if err != nil {
		h.log.Error("verify proof failed", "error", err)
		response.InternalError(c, "failed to verify proof")
		return
	}

	response.OK(c, verification)
}

// GetUserVerifications handles GET /api/verifications/user/{userId}
func (h *VerificationHandler) GetUserVerifications(c *gin.Context) {
	userIDStr := c.Param("userId")
	userID, err := strconv.ParseInt(userIDStr, 10, 64)
	if err != nil {
		response.ValidationError(c, "invalid user ID")
		return
	}

	requestUserID := getUserIDFromContext(c)
	if requestUserID != userID {
		response.Forbidden(c, "you can only view your own verifications")
		return
	}

	verifications, err := h.service.GetUserVerifications(c.Request.Context(), userID)
	if err != nil {
		h.log.Error("get verifications failed", "error", err, "user_id", userID)
		response.InternalError(c, "failed to retrieve verifications")
		return
	}

	response.OK(c, verifications)
}

// DeleteVerification handles DELETE /api/verifications/{id}
func (h *VerificationHandler) DeleteVerification(c *gin.Context) {
	userID := getUserIDFromContext(c)
	if userID == 0 {
		response.Unauthorized(c, "authentication required")
		return
	}

	verificationIDStr := c.Param("id")
	verificationID, err := strconv.ParseInt(verificationIDStr, 10, 64)
	if err != nil {
		response.ValidationError(c, "invalid verification ID")
		return
	}

	err = h.service.DeleteVerification(c.Request.Context(), userID, verificationID)
	if err != nil {
		h.log.Error("delete verification failed", "error", err, "user_id", userID, "verification_id", verificationID)
		response.InternalError(c, "failed to delete verification")
		return
	}

	response.NoContent(c)
}

// GetVerificationTypes handles GET /api/verifications/types
func (h *VerificationHandler) GetVerificationTypes(c *gin.Context) {
	types := []map[string]string{
		{"type": "company", "label": "Company Affiliation", "description": "Verify your employment at a company"},
		{"type": "project", "label": "Project Participation", "description": "Verify your participation in a project"},
		{"type": "skill", "label": "Professional Skill", "description": "Verify your professional skills or certifications"},
		{"type": "education", "label": "Education Background", "description": "Verify your educational credentials"},
		{"type": "humanity", "label": "Proof of Humanity", "description": "Verify that you are a real human (anti-bot)"},
	}

	response.OK(c, types)
}

// getUserIDFromContext extracts user ID from Gin context.
// The auth middleware sets user_id as uint, so we handle both uint and int64.
func getUserIDFromContext(c *gin.Context) int64 {
	userID, exists := c.Get("user_id")
	if !exists {
		return 0
	}

	switch id := userID.(type) {
	case uint:
		return int64(id)
	case int64:
		return id
	case float64:
		return int64(id)
	default:
		return 0
	}
}
