package main

import (
	"log"
	"net/http"

	"github.com/everest-an/dchat-backend/internal/auth"
	"github.com/everest-an/dchat-backend/internal/config"
	"github.com/everest-an/dchat-backend/internal/database"
	"github.com/everest-an/dchat-backend/internal/middleware"
	"github.com/everest-an/dchat-backend/internal/websocket"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	gorilla_websocket "github.com/gorilla/websocket"
)

var upgrader = gorilla_websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		return true // Allow all origins in production, configure properly
	},
}

func main() {
	// Load configuration
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("Failed to load config: %v", err)
	}

	// Initialize database
	db, err := database.New(&cfg.Database)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer db.Close()

	// Initialize JWT service
	jwtService := auth.NewJWTService(&cfg.JWT)

	// Initialize WebSocket hub
	hub := websocket.NewHub(db.DB)
	go hub.Run()

	// Setup Gin router
	if cfg.Server.Environment == "production" {
		gin.SetMode(gin.ReleaseMode)
	}

	router := gin.Default()
	router.Use(middleware.CORSMiddleware())

	// Health check
	router.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{
			"status":        "ok",
			"service":       "dChat WebSocket",
			"version":       "2.0.0-go",
			"online_users":  len(hub.Clients),
		})
	})

	// WebSocket endpoint
	router.GET("/ws", middleware.AuthMiddleware(jwtService), func(c *gin.Context) {
		userID, exists := c.Get("user_id")
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
			return
		}

		conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
		if err != nil {
			log.Printf("Failed to upgrade connection: %v", err)
			return
		}

		clientID := uuid.New().String()
		client := websocket.NewClient(clientID, userID.(uint), conn, hub)

		hub.Register <- client

		// Start client goroutines
		go client.WritePump()
		go client.ReadPump()
	})

	// Start server
	port := ":" + cfg.Server.WebSocketPort
	log.Printf("🚀 dChat WebSocket server starting on port %s", port)
	if err := router.Run(port); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}
