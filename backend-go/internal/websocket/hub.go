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
