package websocket

import (
	"log"
	"sync"
	"time"

	"github.com/everest-an/dchat-backend/internal/models"
	"gorm.io/gorm"
)

type Hub struct {
	// Registered clients by user ID
	Clients map[uint]*Client

	// Register requests from clients
	Register chan *Client

	// Unregister requests from clients
	Unregister chan *Client

	// Mutex for thread-safe operations
	mu sync.RWMutex

	// Database connection
	db *gorm.DB
}

func NewHub(db *gorm.DB) *Hub {
	return &Hub{
		Clients:    make(map[uint]*Client),
		Register:   make(chan *Client),
		Unregister: make(chan *Client),
		db:         db,
	}
}

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

	// If user already has a connection, close the old one
	if oldClient, exists := h.Clients[client.UserID]; exists {
		oldClient.Close()
	}

	h.Clients[client.UserID] = client
	log.Printf("✅ Client registered: UserID=%d, Total=%d", client.UserID, len(h.Clients))

	// Send online status
	h.broadcastStatus(client.UserID, true)
}

func (h *Hub) unregisterClient(client *Client) {
	h.mu.Lock()
	defer h.mu.Unlock()

	if _, exists := h.Clients[client.UserID]; exists {
		delete(h.Clients, client.UserID)
		client.Close()
		log.Printf("❌ Client unregistered: UserID=%d, Total=%d", client.UserID, len(h.Clients))

		// Send offline status
		h.broadcastStatus(client.UserID, false)
	}
}

func (h *Hub) HandleMessage(client *Client, msg *Message) {
	switch msg.Type {
	case "chat":
		h.handleChatMessage(client, msg)
	case "typing":
		h.handleTypingIndicator(client, msg)
	case "read":
		h.handleReadReceipt(client, msg)
	default:
		log.Printf("Unknown message type: %s", msg.Type)
	}
}

func (h *Hub) handleChatMessage(client *Client, msg *Message) {
	// Save message to database
	dbMessage := models.Message{
		SenderID:   msg.From,
		ReceiverID: msg.To,
		Content:    msg.Content,
		Encrypted:  msg.Encrypted,
		Read:       false,
	}

	if err := h.db.Create(&dbMessage).Error; err != nil {
		log.Printf("Failed to save message: %v", err)
		return
	}

	// Load sender info
	h.db.Preload("Sender").First(&dbMessage, dbMessage.ID)

	// Send to recipient if online
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

	// Send confirmation to sender
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
		typingMsg := &Message{
			Type:      "typing",
			From:      msg.From,
			To:        msg.To,
			Timestamp: msg.Timestamp,
		}
		recipientClient.SendMessage(typingMsg)
	}
}

func (h *Hub) handleReadReceipt(client *Client, msg *Message) {
	// Mark messages as read in database
	h.db.Model(&models.Message{}).
		Where("sender_id = ? AND receiver_id = ? AND read = false", msg.From, client.UserID).
		Update("read", true)

	// Notify sender
	h.mu.RLock()
	senderClient, online := h.Clients[msg.From]
	h.mu.RUnlock()

	if online {
		readMsg := &Message{
			Type:      "read",
			From:      client.UserID,
			To:        msg.From,
			Timestamp: msg.Timestamp,
		}
		senderClient.SendMessage(readMsg)
	}
}

func (h *Hub) broadcastStatus(userID uint, online bool) {
	statusMsg := &Message{
		Type:      "status",
		From:      userID,
		Timestamp: time.Now(),
		Data: map[string]interface{}{
			"user_id": userID,
			"online":  online,
		},
	}

	h.mu.RLock()
	defer h.mu.RUnlock()

	for _, client := range h.Clients {
		if client.UserID != userID {
			client.SendMessage(statusMsg)
		}
	}
}

func (h *Hub) GetOnlineUsers() []uint {
	h.mu.RLock()
	defer h.mu.RUnlock()

	users := make([]uint, 0, len(h.Clients))
	for userID := range h.Clients {
		users = append(users, userID)
	}
	return users
}

func (h *Hub) IsUserOnline(userID uint) bool {
	h.mu.RLock()
	defer h.mu.RUnlock()

	_, exists := h.Clients[userID]
	return exists
}
