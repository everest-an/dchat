package websocket

import (
	"log/slog"
	"sync"
	"time"

	"github.com/everest-an/dchat-backend/internal/models"
	"gorm.io/gorm"
)

// Hub maintains the set of active WebSocket clients and routes messages.
type Hub struct {
	Clients    map[uint]*Client
	Register   chan *Client
	Unregister chan *Client
	mu         sync.RWMutex
	db         *gorm.DB
	log        *slog.Logger
}

// NewHub creates a Hub with the given database and logger.
func NewHub(db *gorm.DB, log *slog.Logger) *Hub {
	return &Hub{
		Clients:    make(map[uint]*Client),
		Register:   make(chan *Client),
		Unregister: make(chan *Client),
		db:         db,
		log:        log,
	}
}

// Run starts the hub event loop. It should be called in a goroutine.
func (h *Hub) Run() {
	for {
		select {
		case client := <-h.Register:
			h.registerClient(client)
		case client := <-h.Unregister:
			h.unregisterClient(client)
		}
	}
}

func (h *Hub) registerClient(client *Client) {
	h.mu.Lock()
	defer h.mu.Unlock()

	if old, exists := h.Clients[client.UserID]; exists {
		old.Close()
	}

	h.Clients[client.UserID] = client
	h.log.Info("client registered", "user_id", client.UserID, "total", len(h.Clients))

	h.broadcastStatusLocked(client.UserID, true)
}

func (h *Hub) unregisterClient(client *Client) {
	h.mu.Lock()
	defer h.mu.Unlock()

	if _, exists := h.Clients[client.UserID]; exists {
		delete(h.Clients, client.UserID)
		client.Close()
		h.log.Info("client unregistered", "user_id", client.UserID, "total", len(h.Clients))

		h.broadcastStatusLocked(client.UserID, false)
	}
}

// HandleMessage dispatches a message to the correct handler by type.
func (h *Hub) HandleMessage(client *Client, msg *Message) {
	switch msg.Type {
	case "chat":
		h.handleChatMessage(client, msg)
	case "typing":
		h.handleTypingIndicator(client, msg)
	case "read":
		h.handleReadReceipt(client, msg)
	case "recall":
		h.handleRecallMessage(client, msg)
	case "edit":
		h.handleEditMessage(client, msg)
	case "group_chat":
		h.handleGroupChatMessage(client, msg)
	case "group_typing":
		h.handleGroupTypingIndicator(client, msg)
	default:
		h.log.Warn("unknown message type", "type", msg.Type, "from", client.UserID)
	}
}

func (h *Hub) handleChatMessage(client *Client, msg *Message) {
	dbMessage := models.Message{
		SenderID:   msg.From,
		ReceiverID: msg.To,
		Content:    msg.Content,
		Encrypted:  msg.Encrypted,
		Read:       false,
	}

	if err := h.db.Create(&dbMessage).Error; err != nil {
		h.log.Error("failed to save message", "error", err, "from", msg.From, "to", msg.To)
		return
	}

	h.db.Preload("Sender").First(&dbMessage, dbMessage.ID)

	h.mu.RLock()
	recipientClient, online := h.Clients[msg.To]
	h.mu.RUnlock()

	if online {
		responseMsg := &Message{
			Type:      "chat",
			From:      msg.From,
			To:        msg.To,
			Content:   msg.Content,
			Encrypted: msg.Encrypted,
			Timestamp: dbMessage.CreatedAt,
			Data:      dbMessage,
		}
		recipientClient.SendMessage(responseMsg)
	}

	confirmMsg := &Message{
		Type:      "sent",
		From:      msg.From,
		To:        msg.To,
		Timestamp: dbMessage.CreatedAt,
		Data:      dbMessage,
	}
	client.SendMessage(confirmMsg)
}

func (h *Hub) handleTypingIndicator(client *Client, msg *Message) {
	h.mu.RLock()
	recipientClient, online := h.Clients[msg.To]
	h.mu.RUnlock()

	if online {
		recipientClient.SendMessage(&Message{
			Type:      "typing",
			From:      msg.From,
			To:        msg.To,
			Timestamp: msg.Timestamp,
		})
	}
}

func (h *Hub) handleReadReceipt(client *Client, msg *Message) {
	h.db.Model(&models.Message{}).
		Where("sender_id = ? AND receiver_id = ? AND read = false", msg.From, client.UserID).
		Update("read", true)

	h.mu.RLock()
	senderClient, online := h.Clients[msg.From]
	h.mu.RUnlock()

	if online {
		senderClient.SendMessage(&Message{
			Type:      "read",
			From:      client.UserID,
			To:        msg.From,
			Timestamp: msg.Timestamp,
		})
	}
}

func (h *Hub) handleRecallMessage(client *Client, msg *Message) {
	if msg.MessageID == 0 {
		h.log.Warn("recall: missing message_id", "from", client.UserID)
		return
	}

	var dbMsg models.Message
	if err := h.db.First(&dbMsg, msg.MessageID).Error; err != nil {
		h.log.Warn("recall: message not found", "id", msg.MessageID)
		return
	}

	if dbMsg.SenderID != client.UserID {
		h.log.Warn("recall: not the sender", "user", client.UserID, "msg", msg.MessageID)
		return
	}

	if dbMsg.Recalled {
		return
	}

	if time.Since(dbMsg.CreatedAt) > 2*time.Minute {
		h.log.Warn("recall: window expired", "msg", msg.MessageID)
		return
	}

	now := time.Now()
	h.db.Model(&dbMsg).Updates(map[string]interface{}{
		"recalled":    true,
		"recalled_at": now,
		"content":     "This message has been recalled",
	})

	// Notify recipient
	h.mu.RLock()
	recipientClient, online := h.Clients[dbMsg.ReceiverID]
	h.mu.RUnlock()

	if online {
		recipientClient.SendMessage(&Message{
			Type:      "recall",
			From:      client.UserID,
			To:        dbMsg.ReceiverID,
			MessageID: msg.MessageID,
			Timestamp: now,
		})
	}

	// Confirm to sender
	client.SendMessage(&Message{
		Type:      "recall_confirmed",
		From:      client.UserID,
		To:        dbMsg.ReceiverID,
		MessageID: msg.MessageID,
		Timestamp: now,
	})
}

func (h *Hub) handleEditMessage(client *Client, msg *Message) {
	if msg.MessageID == 0 {
		h.log.Warn("edit: missing message_id", "from", client.UserID)
		return
	}

	if msg.Content == "" {
		h.log.Warn("edit: empty content", "from", client.UserID)
		return
	}

	var dbMsg models.Message
	if err := h.db.First(&dbMsg, msg.MessageID).Error; err != nil {
		h.log.Warn("edit: message not found", "id", msg.MessageID)
		return
	}

	if dbMsg.SenderID != client.UserID {
		h.log.Warn("edit: not the sender", "user", client.UserID, "msg", msg.MessageID)
		return
	}

	if dbMsg.Recalled {
		h.log.Warn("edit: message already recalled", "msg", msg.MessageID)
		return
	}

	if time.Since(dbMsg.CreatedAt) > 5*time.Minute {
		h.log.Warn("edit: window expired", "msg", msg.MessageID)
		return
	}

	now := time.Now()
	h.db.Model(&dbMsg).Updates(map[string]interface{}{
		"original_content": dbMsg.Content,
		"content":          msg.Content,
		"edited":           true,
		"edited_at":        now,
	})

	// Notify recipient
	h.mu.RLock()
	recipientClient, online := h.Clients[dbMsg.ReceiverID]
	h.mu.RUnlock()

	if online {
		recipientClient.SendMessage(&Message{
			Type:      "edit",
			From:      client.UserID,
			To:        dbMsg.ReceiverID,
			MessageID: msg.MessageID,
			Content:   msg.Content,
			Timestamp: now,
		})
	}

	// Confirm to sender
	client.SendMessage(&Message{
		Type:      "edit_confirmed",
		From:      client.UserID,
		To:        dbMsg.ReceiverID,
		MessageID: msg.MessageID,
		Content:   msg.Content,
		Timestamp: now,
	})
}

// broadcastStatusLocked sends an online/offline status to all connected
// clients except the subject. Caller MUST hold h.mu (at least RLock).
func (h *Hub) broadcastStatusLocked(userID uint, online bool) {
	statusMsg := &Message{
		Type:      "status",
		From:      userID,
		Timestamp: time.Now(),
		Data: map[string]interface{}{
			"user_id": userID,
			"online":  online,
		},
	}

	for _, client := range h.Clients {
		if client.UserID != userID {
			client.SendMessage(statusMsg)
		}
	}
}

// --- Group message handlers ---

func (h *Hub) handleGroupChatMessage(client *Client, msg *Message) {
	if msg.GroupID == 0 {
		h.log.Warn("group_chat: missing group_id", "from", client.UserID)
		return
	}

	// Check membership.
	var memberCount int64
	h.db.Model(&models.GroupMember{}).
		Where("group_id = ? AND user_id = ?", msg.GroupID, client.UserID).
		Count(&memberCount)
	if memberCount == 0 {
		h.log.Warn("group_chat: not a member", "user", client.UserID, "group", msg.GroupID)
		return
	}

	// Check mute.
	var member models.GroupMember
	h.db.Where("group_id = ? AND user_id = ?", msg.GroupID, client.UserID).First(&member)
	if member.IsMuted {
		if member.MutedUntil == nil || member.MutedUntil.After(time.Now()) {
			h.log.Warn("group_chat: user is muted", "user", client.UserID, "group", msg.GroupID)
			return
		}
	}

	// Save message.
	dbMsg := models.GroupMessage{
		GroupID:     msg.GroupID,
		SenderID:    client.UserID,
		Content:     msg.Content,
		MessageType: "text",
		Encrypted:   msg.Encrypted,
	}
	if err := h.db.Create(&dbMsg).Error; err != nil {
		h.log.Error("failed to save group message", "error", err, "group", msg.GroupID)
		return
	}
	h.db.Preload("Sender").First(&dbMsg, dbMsg.ID)

	// Get all group member IDs.
	var memberIDs []uint
	h.db.Model(&models.GroupMember{}).
		Where("group_id = ?", msg.GroupID).
		Pluck("user_id", &memberIDs)

	// Broadcast to all online group members.
	outMsg := &Message{
		Type:      "group_chat",
		From:      client.UserID,
		GroupID:   msg.GroupID,
		Content:   msg.Content,
		Encrypted: msg.Encrypted,
		Timestamp: dbMsg.CreatedAt,
		Data:      dbMsg,
	}

	h.mu.RLock()
	for _, uid := range memberIDs {
		if c, online := h.Clients[uid]; online {
			c.SendMessage(outMsg)
		}
	}
	h.mu.RUnlock()
}

func (h *Hub) handleGroupTypingIndicator(client *Client, msg *Message) {
	if msg.GroupID == 0 {
		return
	}

	var memberIDs []uint
	h.db.Model(&models.GroupMember{}).
		Where("group_id = ?", msg.GroupID).
		Pluck("user_id", &memberIDs)

	outMsg := &Message{
		Type:      "group_typing",
		From:      client.UserID,
		GroupID:   msg.GroupID,
		Timestamp: time.Now(),
	}

	h.mu.RLock()
	for _, uid := range memberIDs {
		if uid != client.UserID {
			if c, online := h.Clients[uid]; online {
				c.SendMessage(outMsg)
			}
		}
	}
	h.mu.RUnlock()
}

// GetOnlineUsers returns a slice of currently connected user IDs.
func (h *Hub) GetOnlineUsers() []uint {
	h.mu.RLock()
	defer h.mu.RUnlock()

	users := make([]uint, 0, len(h.Clients))
	for userID := range h.Clients {
		users = append(users, userID)
	}
	return users
}

// IsUserOnline checks whether a user has an active WebSocket connection.
func (h *Hub) IsUserOnline(userID uint) bool {
	h.mu.RLock()
	defer h.mu.RUnlock()
	_, exists := h.Clients[userID]
	return exists
}
