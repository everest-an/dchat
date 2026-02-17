package main

import (
	"context"
	"errors"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/everest-an/dchat-backend/internal/auth"
	"github.com/everest-an/dchat-backend/internal/config"
	"github.com/everest-an/dchat-backend/internal/database"
	"github.com/everest-an/dchat-backend/internal/handlers"
	"github.com/everest-an/dchat-backend/internal/logger"
	"github.com/everest-an/dchat-backend/internal/middleware"
	"github.com/everest-an/dchat-backend/internal/privadoid"
	privadoidHandlers "github.com/everest-an/dchat-backend/internal/privadoid/handlers"
	"github.com/everest-an/dchat-backend/internal/response"
	"github.com/everest-an/dchat-backend/pkg/utils"
	"github.com/gin-gonic/gin"
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

	// Initialize Redis.
	redis, err := utils.NewRedisClient(&cfg.Redis, log)
	if err != nil {
		log.Error("failed to connect to redis", "error", err)
		os.Exit(1)
	}
	defer redis.Close()

	// Initialize services.
	jwtService := auth.NewJWTService(&cfg.JWT)
	web3Service := auth.NewWeb3Service()
	userService := auth.NewUserService(db.DB)
	nonceStore := auth.NewNonceStore(redis, cfg.Web3.NonceExpiry)

	// Initialize handlers.
	authHandler := handlers.NewAuthHandler(userService, jwtService, web3Service, nonceStore, log)
	messageHandler := handlers.NewMessageHandler(db.DB, log)

	// Initialize Privado ID.
	privadoConfig := privadoid.NewConfigFromApp(&cfg.PrivadoID)
	sqlDB, _ := db.DB.DB()
	privadoHandler := privadoidHandlers.NewVerificationHandler(sqlDB, privadoConfig, log)

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
		dbErr := db.Ping()
		status := "ok"
		if dbErr != nil {
			status = "degraded"
		}
		response.OK(c, gin.H{
			"status":  status,
			"service": "dChat API",
			"version": "2.0.0-go",
		})
	})

	// Public routes.
	api := router.Group("/api")
	{
		api.POST("/auth/nonce", authHandler.GetNonce)
		api.POST("/auth/wallet-login", authHandler.WalletLogin)
	}

	// Protected routes.
	protected := api.Group("")
	protected.Use(middleware.AuthMiddleware(jwtService))
	{
		protected.GET("/auth/me", authHandler.GetCurrentUser)

		protected.POST("/messages/send", messageHandler.SendMessage)
		protected.GET("/messages/:user_id", messageHandler.GetMessages)
		protected.GET("/messages/conversations", messageHandler.GetConversations)
		protected.PUT("/messages/:sender_id/read", messageHandler.MarkAsRead)

		protected.POST("/verifications/request", privadoHandler.CreateRequest)
		protected.GET("/verifications/user/:userId", privadoHandler.GetUserVerifications)
		protected.DELETE("/verifications/:id", privadoHandler.DeleteVerification)
	}

	// Public Privado ID routes.
	api.POST("/verifications/verify", privadoHandler.VerifyProof)
	api.GET("/verifications/types", privadoHandler.GetVerificationTypes)

	// Graceful shutdown.
	addr := ":" + cfg.Server.APIPort
	srv := &http.Server{
		Addr:         addr,
		Handler:      router,
		ReadTimeout:  cfg.Server.ReadTimeout,
		WriteTimeout: cfg.Server.WriteTimeout,
		IdleTimeout:  cfg.Server.IdleTimeout,
	}

	go func() {
		log.Info("dChat API server starting", "addr", addr, "env", cfg.Server.Environment)
		if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			log.Error("server error", "error", err)
			os.Exit(1)
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	log.Info("shutting down server...")
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	if err := srv.Shutdown(ctx); err != nil {
		log.Error("server forced to shutdown", "error", err)
	}
	log.Info("server stopped")
}
