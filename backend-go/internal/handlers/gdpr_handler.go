package handlers

import (
	"encoding/json"
	"log/slog"

	"github.com/everest-an/dchat-backend/internal/models"
	"github.com/everest-an/dchat-backend/internal/response"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// GDPRHandler handles GDPR data export and deletion endpoints.
type GDPRHandler struct {
	db  *gorm.DB
	log *slog.Logger
}

// NewGDPRHandler creates a GDPRHandler.
func NewGDPRHandler(db *gorm.DB, log *slog.Logger) *GDPRHandler {
	return &GDPRHandler{db: db, log: log}
}

// ExportMyData exports all user data as JSON (GDPR Article 20 - right to data portability).
// GET /api/gdpr/export
func (h *GDPRHandler) ExportMyData(c *gin.Context) {
	userID := mustUserID(c)

	var user models.User
	if err := h.db.First(&user, userID).Error; err != nil {
		response.NotFound(c, "user not found")
		return
	}

	// Collect all user data.
	var messages []models.Message
	h.db.Where("sender_id = ? OR receiver_id = ?", userID, userID).
		Order("created_at ASC").Find(&messages)

	var tasks []models.Task
	h.db.Where("creator_id = ? OR assignee_id = ?", userID, userID).Find(&tasks)

	var tickets []models.Ticket
	h.db.Where("user_id = ?", userID).Preload("Messages").Find(&tickets)

	var events []models.CalendarEvent
	h.db.Joins("LEFT JOIN event_participant ON event_participant.event_id = calendar_event.id").
		Where("calendar_event.creator_id = ? OR event_participant.user_id = ?", userID, userID).
		Group("calendar_event.id").Find(&events)

	export := map[string]interface{}{
		"user": map[string]interface{}{
			"id":             user.ID,
			"email":          user.Email,
			"name":           user.Name,
			"username":       user.Username,
			"wallet_address": user.WalletAddress,
			"company":        user.Company,
			"position":       user.Position,
			"created_at":     user.CreatedAt,
		},
		"messages": messages,
		"tasks":    tasks,
		"tickets":  tickets,
		"events":   events,
	}

	data, _ := json.MarshalIndent(export, "", "  ")

	c.Header("Content-Disposition", "attachment; filename=dchat_data_export.json")
	c.Data(200, "application/json", data)
}

// DeleteMyAccount deletes the user account and all associated data (GDPR Article 17).
// DELETE /api/gdpr/delete-account
func (h *GDPRHandler) DeleteMyAccount(c *gin.Context) {
	userID := mustUserID(c)

	var req struct {
		Confirm string `json:"confirm" binding:"required"` // Must be "DELETE"
	}
	if err := c.ShouldBindJSON(&req); err != nil || req.Confirm != "DELETE" {
		response.ValidationError(c, "confirm must be 'DELETE' to proceed")
		return
	}

	tx := h.db.Begin()

	// Delete user-related data in order (foreign key constraints).
	tx.Where("user_id = ?", userID).Delete(&models.DeviceToken{})
	tx.Where("user_id = ?", userID).Delete(&models.NotificationPreference{})
	tx.Where("user_id = ?", userID).Delete(&models.PinnedConversation{})
	tx.Where("user_id = ?", userID).Delete(&models.Ticket{})
	tx.Where("creator_id = ? OR assignee_id = ?", userID, userID).Delete(&models.Task{})
	tx.Where("user_id = ?", userID).Delete(&models.EventParticipant{})
	tx.Where("creator_id = ?", userID).Delete(&models.CalendarEvent{})

	// Anonymize messages (keep for other users but remove sender identity).
	tx.Model(&models.Message{}).Where("sender_id = ?", userID).
		Updates(map[string]interface{}{"content": "[deleted]", "sender_id": 0})

	// Delete user account.
	if err := tx.Delete(&models.User{}, userID).Error; err != nil {
		tx.Rollback()
		h.log.Error("failed to delete user account", "error", err, "user_id", userID)
		response.InternalError(c, "failed to delete account")
		return
	}

	tx.Commit()
	h.log.Info("user account deleted (GDPR)", "user_id", userID)

	response.OK(c, gin.H{"message": "account and associated data deleted"})
}
