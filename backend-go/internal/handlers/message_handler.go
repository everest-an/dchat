package handlers

import (
	"net/http"
	"strconv"

	"github.com/everest-an/dchat-backend/internal/models"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type MessageHandler struct {
	db *gorm.DB
}

func NewMessageHandler(db *gorm.DB) *MessageHandler {
	return &MessageHandler{db: db}
}

type SendMessageRequest struct {
	ReceiverID uint   `json:"receiver_id" binding:"required"`
	Content    string `json:"content" binding:"required"`
	Encrypted  bool   `json:"encrypted"`
}

// SendMessage handles sending a new message
func (h *MessageHandler) SendMessage(c *gin.Context) {
	userID, _ := c.Get("user_id")
	senderID := userID.(uint)

	var req SendMessageRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
		return
	}

	message := models.Message{
		SenderID:   senderID,
		ReceiverID: req.ReceiverID,
		Content:    req.Content,
		Encrypted:  req.Encrypted,
		Read:       false,
	}

	if err := h.db.Create(&message).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to send message"})
		return
	}

	// Load sender and receiver info
	h.db.Preload("Sender").Preload("Receiver").First(&message, message.ID)

	c.JSON(http.StatusOK, message)
}

// GetMessages retrieves messages between two users
func (h *MessageHandler) GetMessages(c *gin.Context) {
	userID, _ := c.Get("user_id")
	currentUserID := userID.(uint)

	otherUserIDStr := c.Param("user_id")
	otherUserID, err := strconv.ParseUint(otherUserIDStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
		return
	}

	var messages []models.Message
	err = h.db.
		Where("(sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?)",
			currentUserID, otherUserID, otherUserID, currentUserID).
		Order("created_at ASC").
		Preload("Sender").
		Preload("Receiver").
		Find(&messages).Error

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve messages"})
		return
	}

	c.JSON(http.StatusOK, messages)
}

// GetConversations retrieves all conversations for the current user
func (h *MessageHandler) GetConversations(c *gin.Context) {
	userID, _ := c.Get("user_id")
	currentUserID := userID.(uint)

	// Get distinct users who have conversations with current user
	var conversations []struct {
		UserID    uint   `json:"user_id"`
		Name      string `json:"name"`
		Username  string `json:"username"`
		LastMessage string `json:"last_message"`
		Timestamp string `json:"timestamp"`
		Unread    int64  `json:"unread"`
	}

	err := h.db.Raw(`
		SELECT DISTINCT
			CASE 
				WHEN m.sender_id = ? THEN m.receiver_id 
				ELSE m.sender_id 
			END as user_id,
			u.name,
			u.username,
			(SELECT content FROM message 
			 WHERE (sender_id = ? AND receiver_id = u.id) 
			    OR (sender_id = u.id AND receiver_id = ?)
			 ORDER BY created_at DESC LIMIT 1) as last_message,
			(SELECT created_at FROM message 
			 WHERE (sender_id = ? AND receiver_id = u.id) 
			    OR (sender_id = u.id AND receiver_id = ?)
			 ORDER BY created_at DESC LIMIT 1) as timestamp,
			(SELECT COUNT(*) FROM message 
			 WHERE sender_id = u.id AND receiver_id = ? AND read = false) as unread
		FROM message m
		JOIN "user" u ON u.id = CASE 
			WHEN m.sender_id = ? THEN m.receiver_id 
			ELSE m.sender_id 
		END
		WHERE m.sender_id = ? OR m.receiver_id = ?
		ORDER BY timestamp DESC
	`, currentUserID, currentUserID, currentUserID, currentUserID, currentUserID, currentUserID, currentUserID, currentUserID, currentUserID).
		Scan(&conversations).Error

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve conversations"})
		return
	}

	c.JSON(http.StatusOK, conversations)
}

// MarkAsRead marks messages as read
func (h *MessageHandler) MarkAsRead(c *gin.Context) {
	userID, _ := c.Get("user_id")
	currentUserID := userID.(uint)

	senderIDStr := c.Param("sender_id")
	senderID, err := strconv.ParseUint(senderIDStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid sender ID"})
		return
	}

	err = h.db.Model(&models.Message{}).
		Where("sender_id = ? AND receiver_id = ? AND read = false", senderID, currentUserID).
		Update("read", true).Error

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to mark messages as read"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Messages marked as read"})
}
