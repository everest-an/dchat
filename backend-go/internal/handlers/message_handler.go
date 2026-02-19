package handlers

import (
	"fmt"
	"log/slog"
	"strconv"
	"time"

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
	ReceiverID  uint    `json:"receiver_id" binding:"required"`
	Content     string  `json:"content" binding:"required"`
	MessageType string  `json:"message_type"`
	Encrypted   bool    `json:"encrypted"`
	FileURL     string  `json:"file_url"`
	FileName    string  `json:"file_name"`
	FileSize    int64   `json:"file_size"`
	Duration    float64 `json:"duration"`
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

	msgType := req.MessageType
	if msgType == "" {
		msgType = "text"
	}

	message := models.Message{
		SenderID:    senderID,
		ReceiverID:  req.ReceiverID,
		Content:     req.Content,
		MessageType: msgType,
		Encrypted:   req.Encrypted,
		Read:        false,
		FileURL:     req.FileURL,
		FileName:    req.FileName,
		FileSize:    req.FileSize,
		Duration:    req.Duration,
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

// RecallMessage recalls a message within 2 minutes.
// PUT /api/messages/:id/recall
func (h *MessageHandler) RecallMessage(c *gin.Context) {
	userID := mustUserID(c)

	messageID, err := parseUintParam(c, "id")
	if err != nil {
		response.ValidationError(c, "invalid message id")
		return
	}

	var msg models.Message
	if err := h.db.First(&msg, messageID).Error; err != nil {
		response.NotFound(c, "message not found")
		return
	}

	if msg.SenderID != userID {
		response.Forbidden(c, "you can only recall your own messages")
		return
	}

	if msg.Recalled {
		response.BadRequest(c, "message already recalled")
		return
	}

	if time.Since(msg.CreatedAt) > 2*time.Minute {
		response.BadRequest(c, "recall window expired (2 minutes)")
		return
	}

	now := time.Now()
	err = h.db.Model(&msg).Updates(map[string]interface{}{
		"recalled":    true,
		"recalled_at": now,
		"content":     "This message has been recalled",
	}).Error
	if err != nil {
		h.log.Error("failed to recall message", "error", err, "id", messageID)
		response.InternalError(c, "failed to recall message")
		return
	}

	msg.Recalled = true
	msg.RecalledAt = &now
	msg.Content = "This message has been recalled"

	h.db.Preload("Sender").Preload("Receiver").First(&msg, msg.ID)
	response.OK(c, msg)
}

// EditMessageRequest is the body for PUT /api/messages/:id/edit.
type EditMessageRequest struct {
	Content string `json:"content" binding:"required"`
}

// EditMessage edits a text message within 5 minutes.
// PUT /api/messages/:id/edit
func (h *MessageHandler) EditMessage(c *gin.Context) {
	userID := mustUserID(c)

	messageID, err := parseUintParam(c, "id")
	if err != nil {
		response.ValidationError(c, "invalid message id")
		return
	}

	var req EditMessageRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ValidationError(c, "content is required")
		return
	}

	if len(req.Content) > maxMessageContentLen {
		response.ValidationError(c, "message content exceeds maximum length")
		return
	}

	var msg models.Message
	if err := h.db.First(&msg, messageID).Error; err != nil {
		response.NotFound(c, "message not found")
		return
	}

	if msg.SenderID != userID {
		response.Forbidden(c, "you can only edit your own messages")
		return
	}

	if msg.Recalled {
		response.BadRequest(c, "cannot edit a recalled message")
		return
	}

	if time.Since(msg.CreatedAt) > 5*time.Minute {
		response.BadRequest(c, "edit window expired (5 minutes)")
		return
	}

	now := time.Now()
	originalContent := msg.Content
	err = h.db.Model(&msg).Updates(map[string]interface{}{
		"original_content": originalContent,
		"content":          req.Content,
		"edited":           true,
		"edited_at":        now,
	}).Error
	if err != nil {
		h.log.Error("failed to edit message", "error", err, "id", messageID)
		response.InternalError(c, "failed to edit message")
		return
	}

	msg.Content = req.Content
	msg.Edited = true
	msg.EditedAt = &now

	h.db.Preload("Sender").Preload("Receiver").First(&msg, msg.ID)
	response.OK(c, msg)
}

// ForwardMessageRequest is the body for POST /api/messages/forward.
type ForwardMessageRequest struct {
	MessageIDs  []uint `json:"message_ids" binding:"required"`
	ReceiverIDs []uint `json:"receiver_ids"` // DM targets
	GroupIDs    []uint `json:"group_ids"`    // Group targets
}

// ForwardMessage forwards one or more messages to specified users/groups.
// POST /api/messages/forward
func (h *MessageHandler) ForwardMessage(c *gin.Context) {
	senderID := mustUserID(c)

	var req ForwardMessageRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ValidationError(c, "message_ids is required")
		return
	}

	if len(req.MessageIDs) == 0 {
		response.ValidationError(c, "at least one message_id is required")
		return
	}
	if len(req.MessageIDs) > 50 {
		response.ValidationError(c, "cannot forward more than 50 messages at once")
		return
	}
	if len(req.ReceiverIDs) == 0 && len(req.GroupIDs) == 0 {
		response.ValidationError(c, "at least one receiver_id or group_id is required")
		return
	}

	// Fetch original messages.
	var originals []models.Message
	if err := h.db.Where("id IN ?", req.MessageIDs).
		Preload("Sender").
		Find(&originals).Error; err != nil {
		h.log.Error("failed to fetch messages for forwarding", "error", err)
		response.InternalError(c, "failed to forward messages")
		return
	}

	if len(originals) == 0 {
		response.NotFound(c, "no messages found")
		return
	}

	var forwarded []models.Message

	// Forward to DM recipients.
	for _, receiverID := range req.ReceiverIDs {
		if receiverID == senderID {
			continue
		}
		for _, orig := range originals {
			origID := orig.ID
			msg := models.Message{
				SenderID:        senderID,
				ReceiverID:      receiverID,
				Content:         orig.Content,
				MessageType:     orig.MessageType,
				Encrypted:       false,
				Read:            false,
				ForwardedFromID: &origID,
				FileURL:         orig.FileURL,
				FileName:        orig.FileName,
				FileSize:        orig.FileSize,
				Duration:        orig.Duration,
			}
			if err := h.db.Create(&msg).Error; err != nil {
				h.log.Error("failed to create forwarded message", "error", err, "receiver", receiverID)
				continue
			}
			h.db.Preload("Sender").Preload("Receiver").First(&msg, msg.ID)
			forwarded = append(forwarded, msg)
		}
	}

	// Forward to groups.
	for _, groupID := range req.GroupIDs {
		for _, orig := range originals {
			origID := orig.ID
			groupMsg := models.GroupMessage{
				GroupID:     groupID,
				SenderID:    senderID,
				Content:     orig.Content,
				MessageType: orig.MessageType,
			}
			_ = origID // group messages don't have forwarded_from_id yet
			if err := h.db.Create(&groupMsg).Error; err != nil {
				h.log.Error("failed to create forwarded group message", "error", err, "group", groupID)
				continue
			}
		}
	}

	response.Created(c, gin.H{
		"forwarded_count": len(forwarded),
		"messages":        forwarded,
	})
}

// ExportMessages exports chat history between the current user and another user.
// GET /api/messages/export/:user_id?format=json|txt&from=2024-01-01&to=2024-12-31
func (h *MessageHandler) ExportMessages(c *gin.Context) {
	currentUserID := mustUserID(c)

	otherUserID, err := parseUintParam(c, "user_id")
	if err != nil {
		response.ValidationError(c, "invalid user_id parameter")
		return
	}

	format := c.DefaultQuery("format", "json")
	if format != "json" && format != "txt" {
		response.ValidationError(c, "format must be 'json' or 'txt'")
		return
	}

	query := h.db.Model(&models.Message{}).
		Where("(sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?)",
			currentUserID, otherUserID, otherUserID, currentUserID)

	if from := c.Query("from"); from != "" {
		if t, err := time.Parse("2006-01-02", from); err == nil {
			query = query.Where("created_at >= ?", t)
		}
	}
	if to := c.Query("to"); to != "" {
		if t, err := time.Parse("2006-01-02", to); err == nil {
			query = query.Where("created_at <= ?", t.Add(24*time.Hour))
		}
	}

	var messages []models.Message
	if err := query.Order("created_at ASC").
		Preload("Sender").
		Preload("Receiver").
		Find(&messages).Error; err != nil {
		h.log.Error("failed to export messages", "error", err)
		response.InternalError(c, "failed to export messages")
		return
	}

	if format == "txt" {
		c.Header("Content-Type", "text/plain; charset=utf-8")
		c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=chat_export_%d_%d.txt", currentUserID, otherUserID))
		for _, m := range messages {
			senderName := m.Sender.Name
			if senderName == "" {
				senderName = fmt.Sprintf("User#%d", m.SenderID)
			}
			line := fmt.Sprintf("[%s] %s: %s\n", m.CreatedAt.Format("2006-01-02 15:04:05"), senderName, m.Content)
			c.Writer.WriteString(line)
		}
		return
	}

	// JSON format
	c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=chat_export_%d_%d.json", currentUserID, otherUserID))
	c.JSON(200, gin.H{
		"export_date": time.Now().Format(time.RFC3339),
		"count":       len(messages),
		"messages":    messages,
	})
}

// ExportGroupMessages exports group chat history.
// GET /api/groups/:id/messages/export?format=json|txt&from=2024-01-01&to=2024-12-31
func (h *MessageHandler) ExportGroupMessages(c *gin.Context) {
	_ = mustUserID(c)

	groupID, err := parseUintParam(c, "id")
	if err != nil {
		response.ValidationError(c, "invalid group id")
		return
	}

	format := c.DefaultQuery("format", "json")
	if format != "json" && format != "txt" {
		response.ValidationError(c, "format must be 'json' or 'txt'")
		return
	}

	query := h.db.Model(&models.GroupMessage{}).Where("group_id = ?", groupID)

	if from := c.Query("from"); from != "" {
		if t, err := time.Parse("2006-01-02", from); err == nil {
			query = query.Where("created_at >= ?", t)
		}
	}
	if to := c.Query("to"); to != "" {
		if t, err := time.Parse("2006-01-02", to); err == nil {
			query = query.Where("created_at <= ?", t.Add(24*time.Hour))
		}
	}

	var messages []models.GroupMessage
	if err := query.Order("created_at ASC").
		Preload("Sender").
		Find(&messages).Error; err != nil {
		h.log.Error("failed to export group messages", "error", err)
		response.InternalError(c, "failed to export group messages")
		return
	}

	if format == "txt" {
		c.Header("Content-Type", "text/plain; charset=utf-8")
		c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=group_export_%d.txt", groupID))
		for _, m := range messages {
			senderName := m.Sender.Name
			if senderName == "" {
				senderName = fmt.Sprintf("User#%d", m.SenderID)
			}
			line := fmt.Sprintf("[%s] %s: %s\n", m.CreatedAt.Format("2006-01-02 15:04:05"), senderName, m.Content)
			c.Writer.WriteString(line)
		}
		return
	}

	c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=group_export_%d.json", groupID))
	c.JSON(200, gin.H{
		"export_date": time.Now().Format(time.RFC3339),
		"group_id":    groupID,
		"count":       len(messages),
		"messages":    messages,
	})
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
