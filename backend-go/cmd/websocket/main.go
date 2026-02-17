package main

import (
	"context"
	"errors"
	"net/http"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"time"

	"github.com/everest-an/dchat-backend/internal/auth"
	"github.com/everest-an/dchat-backend/internal/config"
	"github.com/everest-an/dchat-backend/internal/database"
	"github.com/everest-an/dchat-backend/internal/logger"
	"github.com/everest-an/dchat-backend/internal/middleware"
	"github.com/everest-an/dchat-backend/internal/response"
	"github.com/everest-an/dchat-backend/internal/websocket"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	gorilla "github.com/gorilla/websocket"
)

func main() {
	// Load configuration.
	cfg, err := config.Load()
	if err != nil {
		panic("failed to load config: " + err.Error())
	}

	// Initialize structured logger.
	log := logger.New(cfg.Log.Level, cfg.Log.Format)

	// Initialize database.
	db, err := database.New(&cfg.Database, log)
	if err != nil {
		log.Error("failed to connect to database", "error", err)
		os.Exit(1)
	}
	defer db.Close()

	// Initialize JWT service.
	jwtService := auth.NewJWTService(&cfg.JWT)

	// Initialize WebSocket hub.
	hub := websocket.NewHub(db.DB, log)
	go hub.Run()

	// WebSocket upgrader with config-driven origin check.
	allowedOrigins := cfg.CORS.AllowedOrigins
	upgrader := gorilla.Upgrader{
		ReadBufferSize:  1024,
		WriteBufferSize: 1024,
		CheckOrigin: func(r *http.Request) bool {
			origin := r.Header.Get("Origin")
			for _, a := range allowedOrigins {
				if a == "*" || strings.EqualFold(a, origin) {
					return true
				}
			}
			return false
		},
	}

	// Setup Gin router.
	if cfg.IsProd() {
		gin.SetMode(gin.ReleaseMode)
	}

	router := gin.New()
	router.Use(gin.Recovery())
	router.Use(response.RequestIDMiddleware())
	router.Use(middleware.CORSMiddleware(&cfg.CORS))

	// Health check.
	router.GET("/health", func(c *gin.Context) {
		response.OK(c, gin.H{
			"status":       "ok",
			"service":      "dChat WebSocket",
			"version":      "2.0.0-go",
			"online_users": len(hub.GetOnlineUsers()),
		})
	})

	// WebSocket endpoint.
	router.GET("/ws", middleware.AuthMiddleware(jwtService), func(c *gin.Context) {
		userID, exists := c.Get("user_id")
		if !exists {
			response.Unauthorized(c, "authentication required")
			return
		}

		conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
		if err != nil {
			log.Error("websocket upgrade failed", "error", err)
			return
		}

		clientID := uuid.New().String()
		client := websocket.NewClient(clientID, userID.(uint), conn, hub, log)

		hub.Register <- client

		go client.WritePump()
		go client.ReadPump()
	})

	// Graceful shutdown.
	addr := ":" + cfg.Server.WebSocketPort
	srv := &http.Server{
		Addr:         addr,
		Handler:      router,
		ReadTimeout:  cfg.Server.ReadTimeout,
		WriteTimeout: cfg.Server.WriteTimeout,
		IdleTimeout:  cfg.Server.IdleTimeout,
	}

	go func() {
		log.Info("dChat WebSocket server starting", "addr", addr, "env", cfg.Server.Environment)
		if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			log.Error("server error", "error", err)
			os.Exit(1)
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	log.Info("shutting down websocket server...")
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	if err := srv.Shutdown(ctx); err != nil {
		log.Error("server forced to shutdown", "error", err)
	}
	log.Info("websocket server stopped")
}
