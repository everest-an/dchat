package main

import (
	"context"
	"errors"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/everest-an/dchat-backend/internal/ai"
	"github.com/everest-an/dchat-backend/internal/auth"
	"github.com/everest-an/dchat-backend/internal/config"
	"github.com/everest-an/dchat-backend/internal/transcription"
	"github.com/everest-an/dchat-backend/internal/database"
	"github.com/everest-an/dchat-backend/internal/handlers"
	"github.com/everest-an/dchat-backend/internal/notification"
	"github.com/everest-an/dchat-backend/internal/logger"
	"github.com/everest-an/dchat-backend/internal/middleware"
	"github.com/everest-an/dchat-backend/internal/models"
	"github.com/everest-an/dchat-backend/internal/privadoid"
	"github.com/everest-an/dchat-backend/internal/services"
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

	// Auto-migrate new models.
	db.DB.AutoMigrate(
		&models.Report{}, &models.AuditLog{}, &models.SystemSetting{},
		&models.Group{}, &models.GroupMember{}, &models.GroupAnnouncement{},
		&models.GroupMessage{}, &models.GroupJoinRequest{},
		&models.Mention{},
		&models.Meeting{},
		&models.PinnedConversation{},
		&models.Ticket{}, &models.TicketMessage{},
		&models.Task{}, &models.CalendarEvent{}, &models.EventParticipant{},
		&models.DeviceToken{}, &models.NotificationPreference{},
		&models.SSOProvider{}, &models.SSOSession{},
		&models.Proposal{}, &models.Vote{}, &models.TreasuryTransaction{},
		&models.CRMContact{}, &models.CRMDeal{}, &models.CRMActivity{},
		&models.Bot{}, &models.BotEvent{},
		&models.UserSkill{}, &models.UserProject{}, &models.UserResource{},
		&models.UserSeeking{}, &models.UserBusiness{},
		&models.FriendRequest{}, &models.Friendship{},
	)

	// Initialize handlers.
	authHandler := handlers.NewAuthHandler(userService, jwtService, web3Service, nonceStore, log)
	messageHandler := handlers.NewMessageHandler(db.DB, log)
	reportHandler := handlers.NewReportHandler(db.DB, log)
	groupHandler := handlers.NewGroupHandler(db.DB, log)
	mentionHandler := handlers.NewMentionHandler(db.DB, log)
	fileHandler := handlers.NewFileHandler(cfg.Upload.Dir, cfg.Upload.MaxSize, log)
	twofaHandler := handlers.NewTwoFAHandler(db.DB, log)
	adminHandler := handlers.NewAdminHandler(db.DB, log)
	analyticsHandler := handlers.NewAnalyticsHandler(db.DB, log)
	aiClient := ai.NewClient(&cfg.AI)
	aiHandler := handlers.NewAIHandler(db.DB, aiClient, log)
	transcriber := transcription.NewService(&cfg.AI)
	meetingHandler := handlers.NewMeetingHandler(db.DB, aiClient, transcriber, log)
	pinHandler := handlers.NewPinHandler(db.DB, log)
	ticketHandler := handlers.NewTicketHandler(db.DB, log)
	taskHandler := handlers.NewTaskHandler(db.DB, log)
	calendarHandler := handlers.NewCalendarHandler(db.DB, log)
	pushHandler := handlers.NewPushHandler(db.DB, log)
	ssoHandler := handlers.NewSSOHandler(db.DB, jwtService, log)
	gdprHandler := handlers.NewGDPRHandler(db.DB, log)
	daoHandler := handlers.NewDAOHandler(db.DB, log)
	crmHandler := handlers.NewCRMHandler(db.DB, log)
	matchingHandler := handlers.NewMatchingHandler(db.DB, log)
	botHandler := handlers.NewBotHandler(db.DB, log)
	profileHandler := handlers.NewProfileHandler(db.DB, log)
	friendHandler := handlers.NewFriendHandler(db.DB, log)

	// Initialize notification service (email + SMS).
	notifService := notification.NewService(&notification.Config{
		Email: notification.EmailConfig{
			Host:     cfg.Notification.EmailHost,
			Port:     cfg.Notification.EmailPort,
			Username: cfg.Notification.EmailUsername,
			Password: cfg.Notification.EmailPassword,
			From:     cfg.Notification.EmailFrom,
			FromName: cfg.Notification.EmailFromName,
		},
		SMS: notification.SMSConfig{
			AccountSID: cfg.Notification.SMSAccountSID,
			AuthToken:  cfg.Notification.SMSAuthToken,
			FromNumber: cfg.Notification.SMSFromNumber,
		},
	}, log)
	_ = notifService // Available for injection into handlers as needed.

	// Initialize async audit service.
	auditService := services.NewAuditService(db.DB, log)
	defer auditService.Close()

	// Wire 2FA and audit service into auth handler.
	authHandler.SetTwoFAHandler(twofaHandler)
	authHandler.SetAuditService(auditService)

	// Seed super_admin from env vars.
	adminHandler.SeedAdmin()

	// Initialize rate limiters.
	reportRateLimiter := middleware.NewRateLimiter(10, 1*time.Hour) // 10 reports per hour per user

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

		// SSO public routes.
		api.GET("/sso/providers", ssoHandler.GetProviders)
		api.GET("/sso/providers/domain/:domain", ssoHandler.GetProviderByDomain)
		api.POST("/sso/initiate", ssoHandler.InitiateSSO)
		api.POST("/sso/callback/oidc", ssoHandler.CallbackOIDC)
	}

	// Protected routes.
	protected := api.Group("")
	protected.Use(middleware.AuthMiddleware(jwtService))
	{
		protected.GET("/auth/me", authHandler.GetCurrentUser)

		// 2FA routes.
		protected.POST("/auth/2fa/setup", twofaHandler.Setup2FA)
		protected.POST("/auth/2fa/verify", twofaHandler.Verify2FA)
		protected.POST("/auth/2fa/disable", twofaHandler.Disable2FA)
		protected.POST("/auth/2fa/backup-codes", twofaHandler.RegenerateBackupCodes)

		protected.POST("/messages/send", messageHandler.SendMessage)
		protected.POST("/messages/forward", messageHandler.ForwardMessage)
		protected.GET("/messages/conversations", messageHandler.GetConversations)
		protected.GET("/messages/export/:user_id", messageHandler.ExportMessages)
		protected.GET("/messages/:id", messageHandler.GetMessages)
		protected.PUT("/messages/:id/read", messageHandler.MarkAsRead)
		protected.PUT("/messages/:id/recall", messageHandler.RecallMessage)
		protected.PUT("/messages/:id/edit", messageHandler.EditMessage)

		// Pin conversation routes.
		protected.POST("/conversations/pin", pinHandler.PinConversation)
		protected.GET("/conversations/pinned", pinHandler.GetPinnedConversations)
		protected.DELETE("/conversations/pin/:id", pinHandler.UnpinConversation)

		protected.POST("/verifications/request", privadoHandler.CreateRequest)
		protected.GET("/verifications/user/:userId", privadoHandler.GetUserVerifications)
		protected.DELETE("/verifications/:id", privadoHandler.DeleteVerification)

		// Group routes.
		groups := protected.Group("/groups")
		{
			groups.POST("", groupHandler.CreateGroup)
			groups.GET("", groupHandler.GetMyGroups)
			groups.GET("/:id", groupHandler.GetGroup)
			groups.PUT("/:id", groupHandler.UpdateGroup)
			groups.DELETE("/:id", groupHandler.DeleteGroup)
			groups.POST("/:id/members", groupHandler.AddMember)
			groups.DELETE("/:id/members/:userId", groupHandler.RemoveMember)
			groups.PUT("/:id/members/:userId/role", groupHandler.SetMemberRole)
			groups.PUT("/:id/members/:userId/mute", groupHandler.MuteMember)
			groups.POST("/:id/announcements", groupHandler.CreateAnnouncement)
			groups.GET("/:id/announcements", groupHandler.GetAnnouncements)
			groups.POST("/:id/join-request", groupHandler.CreateJoinRequest)
			groups.GET("/:id/join-requests", groupHandler.GetJoinRequests)
			groups.PUT("/:id/join-requests/:requestId", groupHandler.ReviewJoinRequest)
			groups.GET("/:id/messages", groupHandler.GetGroupMessages)
			groups.POST("/:id/messages", groupHandler.SendGroupMessage)
			groups.GET("/:id/messages/export", messageHandler.ExportGroupMessages)
		}

		// Mention routes.
		mentions := protected.Group("/mentions")
		{
			mentions.GET("/unread", mentionHandler.GetUnreadMentions)
			mentions.GET("/unread/count", mentionHandler.GetUnreadMentionCount)
			mentions.PUT("/:id/read", mentionHandler.MarkMentionRead)
			mentions.PUT("/read-all", mentionHandler.MarkAllMentionsRead)
		}

		// File upload route (authenticated).
		protected.POST("/files/upload", fileHandler.UploadFile)

		// Meeting routes.
		meetings := protected.Group("/meetings")
		{
			meetings.POST("", meetingHandler.CreateMeeting)
			meetings.GET("", meetingHandler.ListMeetings)
			meetings.GET("/:id", meetingHandler.GetMeeting)
			meetings.PUT("/:id/end", meetingHandler.EndMeeting)
			meetings.PUT("/:id/transcript", meetingHandler.UpdateTranscript)
			meetings.POST("/:id/transcribe", meetingHandler.TranscribeAudio)
			meetings.POST("/:id/summarize", meetingHandler.Summarize)
		}

		// AI assistant routes.
		aiRoutes := protected.Group("/ai")
		{
			aiRoutes.POST("/summarize", aiHandler.Summarize)
			aiRoutes.POST("/suggest-reply", aiHandler.SuggestReply)
			aiRoutes.POST("/translate", aiHandler.Translate)
			aiRoutes.POST("/draft", aiHandler.Draft)
		}

		// Ticket (support) routes.
		tickets := protected.Group("/tickets")
		{
			tickets.POST("", ticketHandler.CreateTicket)
			tickets.GET("", ticketHandler.GetMyTickets)
			tickets.GET("/:id", ticketHandler.GetTicket)
			tickets.POST("/:id/reply", ticketHandler.ReplyToTicket)
			tickets.PUT("/:id/status", ticketHandler.UpdateTicketStatus)
		}

		// Task routes.
		tasks := protected.Group("/tasks")
		{
			tasks.POST("", taskHandler.CreateTask)
			tasks.GET("", taskHandler.GetMyTasks)
			tasks.GET("/:id", taskHandler.GetTask)
			tasks.PUT("/:id", taskHandler.UpdateTask)
			tasks.DELETE("/:id", taskHandler.DeleteTask)
		}

		// Calendar routes.
		calendar := protected.Group("/calendar/events")
		{
			calendar.POST("", calendarHandler.CreateEvent)
			calendar.GET("", calendarHandler.GetEvents)
			calendar.GET("/:id", calendarHandler.GetEvent)
			calendar.PUT("/:id", calendarHandler.UpdateEvent)
			calendar.DELETE("/:id", calendarHandler.DeleteEvent)
			calendar.PUT("/:id/respond", calendarHandler.RespondToEvent)
		}

		// Push notification routes.
		push := protected.Group("/push-notifications")
		{
			push.POST("/register-token", pushHandler.RegisterToken)
			push.POST("/unregister-token", pushHandler.UnregisterToken)
			push.POST("/send", pushHandler.SendNotification)
			push.GET("/preferences", pushHandler.GetPreferences)
			push.PUT("/preferences", pushHandler.UpdatePreferences)
			push.POST("/test", pushHandler.TestNotification)
		}

		// GDPR data export / account deletion routes.
		protected.GET("/gdpr/export", gdprHandler.ExportMyData)
		protected.DELETE("/gdpr/delete-account", gdprHandler.DeleteMyAccount)

		// DAO governance routes.
		dao := protected.Group("/dao")
		{
			dao.POST("/proposals", daoHandler.CreateProposal)
			dao.GET("/proposals", daoHandler.ListProposals)
			dao.GET("/proposals/:id", daoHandler.GetProposal)
			dao.POST("/proposals/:id/vote", daoHandler.CastVote)
			dao.GET("/treasury", daoHandler.GetTreasury)
		}

		// CRM routes.
		crm := protected.Group("/crm")
		{
			crm.POST("/contacts", crmHandler.CreateContact)
			crm.GET("/contacts", crmHandler.ListContacts)
			crm.GET("/contacts/:id", crmHandler.GetContact)
			crm.PUT("/contacts/:id", crmHandler.UpdateContact)
			crm.DELETE("/contacts/:id", crmHandler.DeleteContact)

			crm.POST("/deals", crmHandler.CreateDeal)
			crm.GET("/deals", crmHandler.ListDeals)
			crm.PUT("/deals/:id", crmHandler.UpdateDeal)
			crm.DELETE("/deals/:id", crmHandler.DeleteDeal)

			crm.POST("/activities", crmHandler.CreateActivity)
			crm.GET("/activities", crmHandler.ListActivities)
		}

		// User profile update.
		protected.PUT("/user/me", profileHandler.UpdateMe)

		// Profile sub-resource routes.
		profile := protected.Group("/profile")
		{
			profile.GET("/skills", profileHandler.ListSkills)
			profile.POST("/skills", profileHandler.CreateSkill)
			profile.PUT("/skills/:id", profileHandler.UpdateSkill)
			profile.DELETE("/skills/:id", profileHandler.DeleteSkill)

			profile.GET("/projects", profileHandler.ListProjects)
			profile.POST("/projects", profileHandler.CreateProject)
			profile.PUT("/projects/:id", profileHandler.UpdateProject)
			profile.DELETE("/projects/:id", profileHandler.DeleteProject)

			profile.GET("/resources", profileHandler.ListResources)
			profile.POST("/resources", profileHandler.CreateResource)
			profile.PUT("/resources/:id", profileHandler.UpdateResource)
			profile.DELETE("/resources/:id", profileHandler.DeleteResource)

			profile.GET("/seeking", profileHandler.ListSeeking)
			profile.POST("/seeking", profileHandler.CreateSeeking)
			profile.PUT("/seeking/:id", profileHandler.UpdateSeeking)
			profile.DELETE("/seeking/:id", profileHandler.DeleteSeeking)

			profile.GET("/business", profileHandler.GetBusiness)
			profile.PUT("/business", profileHandler.UpsertBusiness)
		}

		// Friend routes.
		friends := protected.Group("/friends")
		{
			friends.GET("", friendHandler.ListFriends)
			friends.DELETE("/:id", friendHandler.RemoveFriend)
			friends.GET("/search", friendHandler.SearchUsers)
			friends.POST("/request", friendHandler.SendFriendRequest)
			friends.POST("/request-by-wallet", friendHandler.SendFriendRequestByWallet)
			friends.GET("/requests", friendHandler.ListFriendRequests)
			friends.POST("/requests/:id/accept", friendHandler.AcceptFriendRequest)
			friends.POST("/requests/:id/reject", friendHandler.RejectFriendRequest)
		}

		// Invite friend (public-facing endpoint for email/phone invites).
		protected.POST("/account/invite-friend", friendHandler.InviteFriend)

		// Smart matching routes.
		protected.GET("/matching/recommendations", matchingHandler.GetRecommendations)
		protected.POST("/matching/feedback", matchingHandler.RecordFeedback)

		// Bot & webhook routes.
		bots := protected.Group("/bots")
		{
			bots.POST("", botHandler.CreateBot)
			bots.GET("", botHandler.ListBots)
			bots.GET("/:id", botHandler.GetBot)
			bots.PUT("/:id", botHandler.UpdateBot)
			bots.DELETE("/:id", botHandler.DeleteBot)
			bots.POST("/:id/regenerate-token", botHandler.RegenerateToken)
			bots.GET("/:id/events", botHandler.GetBotEvents)
		}

		// Report routes.
		reports := protected.Group("/reports")
		reports.Use(reportRateLimiter.Middleware())
		{
			reports.POST("", reportHandler.CreateReport)
			reports.GET("/mine", reportHandler.GetMyReports)
			reports.GET("", reportHandler.GetReports)
			reports.GET("/stats", reportHandler.GetReportStats)
			reports.PUT("/:id/review", reportHandler.ReviewReport)
		}
	}

	// Public file serving route.
	api.GET("/files/:subdir/:filename", fileHandler.ServeFile)

	// Public Privado ID routes.
	api.POST("/verifications/verify", privadoHandler.VerifyProof)
	api.GET("/verifications/types", privadoHandler.GetVerificationTypes)

	// Admin routes.
	admin := api.Group("/admin")
	{
		admin.POST("/login", handlers.JWTMiddlewareInjector(jwtService), adminHandler.Login)
	}
	adminProtected := admin.Group("")
	adminProtected.Use(middleware.AuthMiddleware(jwtService))
	adminProtected.Use(middleware.AdminMiddleware())
	{
		adminProtected.GET("/me", adminHandler.GetMe)
		adminProtected.GET("/dashboard/stats", adminHandler.GetDashboardStats)
		adminProtected.GET("/users", adminHandler.ListUsers)
		adminProtected.GET("/users/:id", adminHandler.GetUser)
		adminProtected.PUT("/users/:id/role", adminHandler.UpdateUserRole)
		adminProtected.PUT("/users/:id/ban", adminHandler.BanUser)
		adminProtected.PUT("/users/:id/unban", adminHandler.UnbanUser)
		adminProtected.DELETE("/users/:id", adminHandler.DeleteUser)
		adminProtected.GET("/messages", adminHandler.ListMessages)
		adminProtected.GET("/messages/:id", adminHandler.GetMessage)
		adminProtected.DELETE("/messages/:id", adminHandler.DeleteMessage)
		adminProtected.GET("/settings", adminHandler.GetSettings)
		adminProtected.PUT("/settings", adminHandler.UpdateSettings)
		adminProtected.GET("/audit-logs", adminHandler.GetAuditLogs)

		// Analytics routes.
		adminProtected.GET("/analytics/user-growth", analyticsHandler.UserGrowth)
		adminProtected.GET("/analytics/message-trends", analyticsHandler.MessageTrends)
		adminProtected.GET("/analytics/active-users", analyticsHandler.ActiveUsers)
		adminProtected.GET("/analytics/group-stats", analyticsHandler.GroupStats)
		adminProtected.GET("/analytics/retention", analyticsHandler.Retention)

		// Admin ticket routes.
		adminProtected.GET("/tickets", ticketHandler.GetAllTickets)
		adminProtected.PUT("/tickets/:id/assign", ticketHandler.AssignTicket)

		// Admin SSO routes.
		adminProtected.POST("/sso/providers", ssoHandler.CreateProvider)
		adminProtected.PUT("/sso/providers/:id", ssoHandler.UpdateProvider)
		adminProtected.DELETE("/sso/providers/:id", ssoHandler.DeleteProvider)
	}

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
