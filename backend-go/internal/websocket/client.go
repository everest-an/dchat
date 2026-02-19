package websocket

import (
	"encoding/json"
	"log/slog"
	"sync"
	"time"

	"github.com/gorilla/websocket"
)

const (
	writeWait      = 10 * time.Second
	pongWait       = 60 * time.Second
	pingPeriod     = (pongWait * 9) / 10
	maxMessageSize = 512 * 1024 // 512 KB
)

// Client represents a single WebSocket connection.
type Client struct {
	ID        string
	UserID    uint
	Conn      *websocket.Conn
	Hub       *Hub
	Send      chan []byte
	log       *slog.Logger
	mu        sync.Mutex
	isClosing bool
}

type Message struct {
	Type      string      `json:"type"`
	From      uint        `json:"from"`
	To        uint        `json:"to"`
	GroupID   uint        `json:"group_id,omitempty"`
	Content   string      `json:"content"`
	Encrypted bool        `json:"encrypted"`
	Timestamp time.Time   `json:"timestamp"`
	Data      interface{} `json:"data,omitempty"`
	MessageID uint        `json:"message_id,omitempty"`
}

// NewClient creates a Client with the given connection and hub.
func NewClient(id string, userID uint, conn *websocket.Conn, hub *Hub, log *slog.Logger) *Client {
	return &Client{
		ID:     id,
		UserID: userID,
		Conn:   conn,
		Hub:    hub,
		Send:   make(chan []byte, 256),
		log:    log,
	}
}

func (c *Client) ReadPump() {
	defer func() {
		c.Hub.Unregister <- c
		c.Conn.Close()
	}()

	c.Conn.SetReadDeadline(time.Now().Add(pongWait))
	c.Conn.SetPongHandler(func(string) error {
		c.Conn.SetReadDeadline(time.Now().Add(pongWait))
		return nil
	})

	c.Conn.SetReadLimit(maxMessageSize)

	for {
		_, messageData, err := c.Conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				c.log.Warn("websocket unexpected close", "error", err, "user_id", c.UserID)
			}
			break
		}

		var msg Message
		if err := json.Unmarshal(messageData, &msg); err != nil {
			c.log.Warn("failed to unmarshal message", "error", err, "user_id", c.UserID)
			continue
		}

		// Set sender and timestamp
		msg.From = c.UserID
		msg.Timestamp = time.Now()

		// Handle message based on type
		c.Hub.HandleMessage(c, &msg)
	}
}

func (c *Client) WritePump() {
	ticker := time.NewTicker(pingPeriod)
	defer func() {
		ticker.Stop()
		c.Conn.Close()
	}()

	for {
		select {
		case message, ok := <-c.Send:
			c.Conn.SetWriteDeadline(time.Now().Add(writeWait))
			if !ok {
				c.Conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}

			w, err := c.Conn.NextWriter(websocket.TextMessage)
			if err != nil {
				return
			}
			w.Write(message)

			// Add queued messages to the current websocket message
			n := len(c.Send)
			for i := 0; i < n; i++ {
				w.Write([]byte{'\n'})
				w.Write(<-c.Send)
			}

			if err := w.Close(); err != nil {
				return
			}

		case <-ticker.C:
			c.Conn.SetWriteDeadline(time.Now().Add(writeWait))
			if err := c.Conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}

func (c *Client) SendMessage(msg *Message) error {
	c.mu.Lock()
	defer c.mu.Unlock()

	if c.isClosing {
		return nil
	}

	data, err := json.Marshal(msg)
	if err != nil {
		return err
	}

	select {
	case c.Send <- data:
		return nil
	default:
		// Channel is full, close the client
		close(c.Send)
		c.isClosing = true
		return nil
	}
}

func (c *Client) Close() {
	c.mu.Lock()
	defer c.mu.Unlock()

	if !c.isClosing {
		c.isClosing = true
		close(c.Send)
	}
}
