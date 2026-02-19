package handlers

import (
	"log/slog"
	"time"

	"github.com/everest-an/dchat-backend/internal/models"
	"github.com/everest-an/dchat-backend/internal/response"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// PinHandler handles conversation pinning endpoints.
type PinHandler struct {
	db  *gorm.DB
	log *slog.Logger
}

// NewPinHandler creates a PinHandler.
func NewPinHandler(db *gorm.DB, log *slog.Logger) *PinHandler {
	return &PinHandler{db: db, log: log}
}

type PinRequest struct {
	TargetID   string `json:"target_id" binding:"required"`
	TargetType string `json:"target_type" binding:"required"` // "user" or "group"
}

// PinConversation pins a conversation for the current user.
// POST /api/conversations/pin
func (h *PinHandler) PinConversation(c *gin.Context) {
	userID := mustUserID(c)

	var req PinRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ValidationError(c, "target_id and target_type are required")
		return
	}

	if req.TargetType != "user" && req.TargetType != "group" {
		response.ValidationError(c, "target_type must be 'user' or 'group'")
		return
	}

	// Check if already pinned.
	var existing models.PinnedConversation
	err := h.db.Where("user_id = ? AND target_id = ? AND target_type = ?", userID, req.TargetID, req.TargetType).
		First(&existing).Error
	if err == nil {
		response.OK(c, existing)
		return
	}

	pin := models.PinnedConversation{
		UserID:     userID,
		TargetID:   req.TargetID,
		TargetType: req.TargetType,
		PinnedAt:   time.Now(),
	}

	if err := h.db.Create(&pin).Error; err != nil {
		h.log.Error("failed to pin conversation", "error", err)
		response.InternalError(c, "failed to pin conversation")
		return
	}

	response.Created(c, pin)
}

// UnpinConversation removes a pin for the current user.
// DELETE /api/conversations/pin/:id
func (h *PinHandler) UnpinConversation(c *gin.Context) {
	userID := mustUserID(c)

	pinID, err := parseUintParam(c, "id")
	if err != nil {
		response.ValidationError(c, "invalid pin id")
		return
	}

	result := h.db.Where("id = ? AND user_id = ?", pinID, userID).Delete(&models.PinnedConversation{})
	if result.Error != nil {
		h.log.Error("failed to unpin conversation", "error", result.Error)
		response.InternalError(c, "failed to unpin conversation")
		return
	}

	if result.RowsAffected == 0 {
		response.NotFound(c, "pin not found")
		return
	}

	response.OK(c, gin.H{"message": "unpinned"})
}

// GetPinnedConversations returns all pinned conversations for the current user.
// GET /api/conversations/pinned
func (h *PinHandler) GetPinnedConversations(c *gin.Context) {
	userID := mustUserID(c)

	var pins []models.PinnedConversation
	if err := h.db.Where("user_id = ?", userID).
		Order("pinned_at ASC").
		Find(&pins).Error; err != nil {
		h.log.Error("failed to get pinned conversations", "error", err)
		response.InternalError(c, "failed to get pinned conversations")
		return
	}

	response.OK(c, pins)
}
