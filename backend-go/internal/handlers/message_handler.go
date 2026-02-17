package handlers

import (
	"log/slog"
	"strconv"

	"github.com/everest-an/dchat-backend/internal/models"
	"github.com/everest-an/dchat-backend/internal/response"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

const (
	maxMessageContentLen = 10000
	defaultPageSize      = 50
	maxPageSize          = 100
)

// MessageHandler handles message-related API endpoints.
type MessageHandler struct {
	db  *gorm.DB
	log *slog.Logger
}

// NewMessageHandler creates a MessageHandler.
func NewMessageHandler(db *gorm.DB, log *slog.Logger) *MessageHandler {
	return &MessageHandler{db: db, log: log}
}

// SendMessageRequest is the body for POST /api/messages.
type SendMessageRequest struct {
	ReceiverID uint   `json:"receiver_id" binding:"required"`
	Content    string `json:"content" binding:"required"`
	Encrypted  bool   `json:"encrypted"`
}

// SendMessage creates a new message.
// POST /api/messages
func (h *MessageHandler) SendMessage(c *gin.Context) {
	senderID := mustUserID(c)

	var req SendMessageRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ValidationError(c, "receiver_id and content are required")
		return
	}

	if len(req.Content) > maxMessageContentLen {
		response.ValidationError(c, "message content exceeds maximum length")
		return
	}

	if req.ReceiverID == senderID {
		response.ValidationError(c, "cannot send a message to yourself")
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
		h.log.Error("failed to create message", "error", err, "sender", senderID, "receiver", req.ReceiverID)
		response.InternalError(c, "failed to send message")
		return
	}

	h.db.Preload("Sender").Preload("Receiver").First(&message, message.ID)

	response.Created(c, message)
}

// GetMessages retrieves the message history between two users.
// GET /api/messages/:user_id
func (h *MessageHandler) GetMessages(c *gin.Context) {
	currentUserID := mustUserID(c)

	otherUserID, err := parseUintParam(c, "user_id")
	if err != nil {
		response.ValidationError(c, "invalid user_id parameter")
		return
	}

	page, pageSize := parsePagination(c)
	offset := (page - 1) * pageSize

	var total int64
	h.db.Model(&models.Message{}).
		Where("(sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?)",
			currentUserID, otherUserID, otherUserID, currentUserID).
		Count(&total)

	var messages []models.Message
	err = h.db.
		Where("(sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?)",
			currentUserID, otherUserID, otherUserID, currentUserID).
		Order("created_at ASC").
		Offset(offset).
		Limit(pageSize).
		Preload("Sender").
		Preload("Receiver").
		Find(&messages).Error

	if err != nil {
		h.log.Error("failed to retrieve messages", "error", err, "user", currentUserID, "other", otherUserID)
		response.InternalError(c, "failed to retrieve messages")
		return
	}

	response.Paginated(c, messages, total, page, pageSize)
}

// GetConversations lists all conversations for the current user.
// GET /api/conversations
func (h *MessageHandler) GetConversations(c *gin.Context) {
	currentUserID := mustUserID(c)

	type ConversationRow struct {
		UserID      uint   `json:"user_id"`
		Name        string `json:"name"`
		Username    string `json:"username"`
		LastMessage string `json:"last_message"`
		Timestamp   string `json:"timestamp"`
		Unread      int64  `json:"unread"`
	}

	var conversations []ConversationRow

	// All parameters are the same currentUserID (uint), safe from SQL injection.
	err := h.db.Raw(`
		SELECT DISTINCT
			CASE
				WHEN m.sender_id = ? THEN m.receiver_id
				ELSE m.sender_id
			END AS user_id,
			u.name,
			u.username,
			(SELECT content FROM message
			 WHERE (sender_id = ? AND receiver_id = u.id)
			    OR (sender_id = u.id AND receiver_id = ?)
			 ORDER BY created_at DESC LIMIT 1) AS last_message,
			(SELECT created_at FROM message
			 WHERE (sender_id = ? AND receiver_id = u.id)
			    OR (sender_id = u.id AND receiver_id = ?)
			 ORDER BY created_at DESC LIMIT 1) AS timestamp,
			(SELECT COUNT(*) FROM message
			 WHERE sender_id = u.id AND receiver_id = ? AND read = false) AS unread
		FROM message m
		JOIN "user" u ON u.id = CASE
			WHEN m.sender_id = ? THEN m.receiver_id
			ELSE m.sender_id
		END
		WHERE m.sender_id = ? OR m.receiver_id = ?
		ORDER BY timestamp DESC
	`, currentUserID, currentUserID, currentUserID,
		currentUserID, currentUserID, currentUserID,
		currentUserID, currentUserID, currentUserID).
		Scan(&conversations).Error

	if err != nil {
		h.log.Error("failed to retrieve conversations", "error", err, "user", currentUserID)
		response.InternalError(c, "failed to retrieve conversations")
		return
	}

	response.OK(c, conversations)
}

// MarkAsRead marks all messages from a sender as read.
// PUT /api/messages/read/:sender_id
func (h *MessageHandler) MarkAsRead(c *gin.Context) {
	currentUserID := mustUserID(c)

	senderID, err := parseUintParam(c, "sender_id")
	if err != nil {
		response.ValidationError(c, "invalid sender_id parameter")
		return
	}

	err = h.db.Model(&models.Message{}).
		Where("sender_id = ? AND receiver_id = ? AND read = false", senderID, currentUserID).
		Update("read", true).Error

	if err != nil {
		h.log.Error("failed to mark messages as read", "error", err, "sender", senderID, "receiver", currentUserID)
		response.InternalError(c, "failed to mark messages as read")
		return
	}

	response.OK(c, gin.H{"message": "messages marked as read"})
}

// --- Helpers ---

// mustUserID extracts the authenticated user ID from the Gin context.
func mustUserID(c *gin.Context) uint {
	v, _ := c.Get("user_id")
	return v.(uint)
}

func parseUintParam(c *gin.Context, name string) (uint, error) {
	raw := c.Param(name)
	id, err := strconv.ParseUint(raw, 10, 32)
	if err != nil {
		return 0, err
	}
	return uint(id), nil
}

func parsePagination(c *gin.Context) (page, pageSize int) {
	page = 1
	pageSize = defaultPageSize

	if p, err := strconv.Atoi(c.DefaultQuery("page", "1")); err == nil && p > 0 {
		page = p
	}
	if ps, err := strconv.Atoi(c.DefaultQuery("page_size", strconv.Itoa(defaultPageSize))); err == nil && ps > 0 {
		pageSize = ps
	}
	if pageSize > maxPageSize {
		pageSize = maxPageSize
	}
	return
}
