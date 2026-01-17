package handlers

import (
	"database/sql"
	"net/http"
	"strconv"

	"github.com/everest-an/dchat-backend/internal/privadoid"
	"github.com/everest-an/dchat-backend/internal/privadoid/models"
	"github.com/everest-an/dchat-backend/internal/privadoid/services"

	"github.com/gin-gonic/gin"
)

// VerificationHandler handles HTTP requests for Privado ID verifications
type VerificationHandler struct {
	service *services.VerifierService
}

// NewVerificationHandler creates a new verification handler
func NewVerificationHandler(db *sql.DB, config *privadoid.Config) *VerificationHandler {
	return &VerificationHandler{
		service: services.NewVerifierService(db, config),
	}
}

// CreateRequest handles POST /api/verifications/request
func (h *VerificationHandler) CreateRequest(c *gin.Context) {
	// Get user ID from context (set by auth middleware)
	userID := getUserIDFromContext(c)
	if userID == 0 {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	// Parse request body
	var req models.VerificationRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	// Validate request
	if req.Type == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Verification type is required"})
		return
	}

	// Create verification request
	response, err := h.service.CreateVerificationRequest(c.Request.Context(), userID, &req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Return response
	c.JSON(http.StatusOK, response)
}

// VerifyProof handles POST /api/verifications/verify
func (h *VerificationHandler) VerifyProof(c *gin.Context) {
	// Parse proof submission
	var submission models.ProofSubmission
	if err := c.ShouldBindJSON(&submission); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	// For now, extract user ID from proof or use a temporary approach
	// In production, this would be extracted from the proof's DID
	userID := int64(1) // TODO: Extract from proof

	// Verify proof
	verification, err := h.service.VerifyProof(c.Request.Context(), userID, &submission)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Return verification
	c.JSON(http.StatusOK, verification)
}

// GetUserVerifications handles GET /api/verifications/user/{userId}
func (h *VerificationHandler) GetUserVerifications(c *gin.Context) {
	// Get user ID from URL
	userIDStr := c.Param("userId")
	userID, err := strconv.ParseInt(userIDStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
		return
	}

	// Check authorization (user can only view their own verifications)
	requestUserID := getUserIDFromContext(c)
	if requestUserID != userID {
		c.JSON(http.StatusForbidden, gin.H{"error": "Forbidden"})
		return
	}

	// Get verifications
	verifications, err := h.service.GetUserVerifications(c.Request.Context(), userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Return verifications
	c.JSON(http.StatusOK, verifications)
}

// DeleteVerification handles DELETE /api/verifications/{id}
func (h *VerificationHandler) DeleteVerification(c *gin.Context) {
	// Get user ID from context
	userID := getUserIDFromContext(c)
	if userID == 0 {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	// Get verification ID from URL
	verificationIDStr := c.Param("id")
	verificationID, err := strconv.ParseInt(verificationIDStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid verification ID"})
		return
	}

	// Delete verification
	err = h.service.DeleteVerification(c.Request.Context(), userID, verificationID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Return success
	c.Status(http.StatusNoContent)
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

	c.JSON(http.StatusOK, types)
}

// getUserIDFromContext extracts user ID from Gin context
// This should be set by the authentication middleware
func getUserIDFromContext(c *gin.Context) int64 {
	// In production, this would extract from JWT or session
	// The auth middleware should set this in the context
	userID, exists := c.Get("user_id")
	if !exists {
		return 0
	}
	
	if id, ok := userID.(int64); ok {
		return id
	}
	
	// Try float64 (JSON numbers are decoded as float64)
	if id, ok := userID.(float64); ok {
		return int64(id)
	}
	
	return 0
}
