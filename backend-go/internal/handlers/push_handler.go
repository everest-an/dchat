package handlers

import (
	"log/slog"

	"github.com/everest-an/dchat-backend/internal/models"
	"github.com/everest-an/dchat-backend/internal/response"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// PushHandler handles push notification endpoints.
type PushHandler struct {
	db  *gorm.DB
	log *slog.Logger
}

// NewPushHandler creates a PushHandler.
func NewPushHandler(db *gorm.DB, log *slog.Logger) *PushHandler {
	return &PushHandler{db: db, log: log}
}

// RegisterToken registers a device token for push notifications.
// POST /api/push-notifications/register-token
func (h *PushHandler) RegisterToken(c *gin.Context) {
	userID := mustUserID(c)

	var req struct {
		Token      string `json:"token" binding:"required"`
		Platform   string `json:"platform"`
		DeviceName string `json:"device_name"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ValidationError(c, "token is required")
		return
	}

	platform := coalesce(req.Platform, "web")

	// Upsert: if token already exists, update user and device info.
	var existing models.DeviceToken
	err := h.db.Where("token = ?", req.Token).First(&existing).Error
	if err == nil {
		h.db.Model(&existing).Updates(map[string]interface{}{
			"user_id":     userID,
			"platform":    platform,
			"device_name": req.DeviceName,
		})
		response.OK(c, existing)
		return
	}

	dt := models.DeviceToken{
		UserID:     userID,
		Token:      req.Token,
		Platform:   platform,
		DeviceName: req.DeviceName,
	}
	if err := h.db.Create(&dt).Error; err != nil {
		h.log.Error("failed to register device token", "error", err)
		response.InternalError(c, "failed to register device token")
		return
	}

	response.Created(c, dt)
}

// UnregisterToken removes a device token.
// POST /api/push-notifications/unregister-token
func (h *PushHandler) UnregisterToken(c *gin.Context) {
	userID := mustUserID(c)

	var req struct {
		Token string `json:"token" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ValidationError(c, "token is required")
		return
	}

	h.db.Where("user_id = ? AND token = ?", userID, req.Token).Delete(&models.DeviceToken{})
	response.OK(c, gin.H{"message": "token unregistered"})
}

// SendNotification sends a push notification to a user.
// POST /api/push-notifications/send
func (h *PushHandler) SendNotification(c *gin.Context) {
	var req struct {
		RecipientID uint              `json:"recipient_id" binding:"required"`
		Title       string            `json:"title" binding:"required"`
		Body        string            `json:"body" binding:"required"`
		Data        map[string]string `json:"data"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ValidationError(c, "recipient_id, title, and body are required")
		return
	}

	// Get recipient's device tokens.
	var tokens []models.DeviceToken
	h.db.Where("user_id = ?", req.RecipientID).Find(&tokens)

	if len(tokens) == 0 {
		response.OK(c, gin.H{"message": "no registered devices", "sent": 0})
		return
	}

	// TODO: Integrate with FCM/APNs to actually deliver push notifications.
	// For now, log and acknowledge.
	h.log.Info("push notification queued",
		"recipient", req.RecipientID,
		"title", req.Title,
		"devices", len(tokens),
	)

	response.OK(c, gin.H{"message": "notification queued", "sent": len(tokens)})
}

// GetPreferences returns the user's notification preferences.
// GET /api/push-notifications/preferences
func (h *PushHandler) GetPreferences(c *gin.Context) {
	userID := mustUserID(c)

	var pref models.NotificationPreference
	err := h.db.Where("user_id = ?", userID).First(&pref).Error
	if err != nil {
		// Return defaults.
		pref = models.NotificationPreference{
			UserID:        userID,
			Messages:      true,
			GroupMessages: true,
			Mentions:      true,
			Payments:      true,
			SystemUpdates: true,
			Sound:         true,
			Vibrate:       true,
		}
	}

	response.OK(c, pref)
}

// UpdatePreferences updates the user's notification preferences.
// PUT /api/push-notifications/preferences
func (h *PushHandler) UpdatePreferences(c *gin.Context) {
	userID := mustUserID(c)

	var req struct {
		Messages       *bool   `json:"messages"`
		GroupMessages  *bool   `json:"group_messages"`
		Mentions       *bool   `json:"mentions"`
		Payments       *bool   `json:"payments"`
		SystemUpdates  *bool   `json:"system_updates"`
		Sound          *bool   `json:"sound"`
		Vibrate        *bool   `json:"vibrate"`
		QuietHoursFrom *string `json:"quiet_hours_from"`
		QuietHoursTo   *string `json:"quiet_hours_to"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ValidationError(c, "invalid request body")
		return
	}

	var pref models.NotificationPreference
	err := h.db.Where("user_id = ?", userID).First(&pref).Error
	if err != nil {
		// Create with defaults, then apply updates.
		pref = models.NotificationPreference{
			UserID: userID, Messages: true, GroupMessages: true,
			Mentions: true, Payments: true, SystemUpdates: true,
			Sound: true, Vibrate: true,
		}
		h.db.Create(&pref)
	}

	updates := map[string]interface{}{}
	if req.Messages != nil {
		updates["messages"] = *req.Messages
	}
	if req.GroupMessages != nil {
		updates["group_messages"] = *req.GroupMessages
	}
	if req.Mentions != nil {
		updates["mentions"] = *req.Mentions
	}
	if req.Payments != nil {
		updates["payments"] = *req.Payments
	}
	if req.SystemUpdates != nil {
		updates["system_updates"] = *req.SystemUpdates
	}
	if req.Sound != nil {
		updates["sound"] = *req.Sound
	}
	if req.Vibrate != nil {
		updates["vibrate"] = *req.Vibrate
	}
	if req.QuietHoursFrom != nil {
		updates["quiet_hours_from"] = *req.QuietHoursFrom
	}
	if req.QuietHoursTo != nil {
		updates["quiet_hours_to"] = *req.QuietHoursTo
	}

	if len(updates) > 0 {
		h.db.Model(&pref).Updates(updates)
	}

	h.db.Where("user_id = ?", userID).First(&pref)
	response.OK(c, pref)
}

// TestNotification sends a test notification to the current user's devices.
// POST /api/push-notifications/test
func (h *PushHandler) TestNotification(c *gin.Context) {
	userID := mustUserID(c)

	var tokens []models.DeviceToken
	h.db.Where("user_id = ?", userID).Find(&tokens)

	if len(tokens) == 0 {
		response.OK(c, gin.H{"message": "no registered devices", "sent": 0})
		return
	}

	// TODO: Send real push via FCM/APNs.
	h.log.Info("test push notification sent", "user", userID, "devices", len(tokens))

	response.OK(c, gin.H{"message": "test notification sent", "sent": len(tokens)})
}
