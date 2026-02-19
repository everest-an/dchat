package handlers

import (
	"fmt"
	"log/slog"
	"os"
	"time"

	"github.com/everest-an/dchat-backend/internal/models"
	"github.com/everest-an/dchat-backend/internal/response"
	"github.com/gin-gonic/gin"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

// AdminHandler handles admin dashboard API endpoints.
type AdminHandler struct {
	db  *gorm.DB
	log *slog.Logger
}

// NewAdminHandler creates an AdminHandler.
func NewAdminHandler(db *gorm.DB, log *slog.Logger) *AdminHandler {
	return &AdminHandler{db: db, log: log}
}

// SeedAdmin creates the initial super_admin user from environment variables.
func (h *AdminHandler) SeedAdmin() {
	email := os.Getenv("ADMIN_EMAIL")
	password := os.Getenv("ADMIN_PASSWORD")
	if email == "" || password == "" {
		h.log.Info("ADMIN_EMAIL or ADMIN_PASSWORD not set, skipping admin seed")
		return
	}

	var existing models.User
	if err := h.db.Where("email = ? AND role = ?", email, "super_admin").First(&existing).Error; err == nil {
		h.log.Info("super_admin already exists", "email", email)
		return
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		h.log.Error("failed to hash admin password", "error", err)
		return
	}

	admin := models.User{
		Email:        email,
		Username:     "admin",
		Name:         "Super Admin",
		PasswordHash: string(hash),
		Role:         "super_admin",
	}

	if err := h.db.Create(&admin).Error; err != nil {
		h.log.Error("failed to seed admin user", "error", err)
		return
	}

	h.log.Info("super_admin user seeded", "email", email)
}

// --- Admin Auth ---

type AdminLoginRequest struct {
	Email    string `json:"email" binding:"required"`
	Password string `json:"password" binding:"required"`
}

// Login authenticates an admin user via email/password.
// POST /api/admin/login
func (h *AdminHandler) Login(c *gin.Context) {
	var req AdminLoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ValidationError(c, "email and password are required")
		return
	}

	var user models.User
	if err := h.db.Where("email = ?", req.Email).First(&user).Error; err != nil {
		response.Unauthorized(c, "invalid credentials")
		return
	}

	if user.Role != "admin" && user.Role != "super_admin" && user.Role != "moderator" {
		response.Forbidden(c, "admin access required")
		return
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password)); err != nil {
		response.Unauthorized(c, "invalid credentials")
		return
	}

	// Use the JWT service to generate token — but since AdminHandler doesn't hold jwtService,
	// we generate a simple response. The caller in main.go will wire the jwtService.
	// For now, store jwt in context approach: we accept jwtService via Login wrapper.
	jwtService, exists := c.Get("jwt_service")
	if !exists {
		response.InternalError(c, "authentication service unavailable")
		return
	}

	svc, ok := jwtService.(adminJWTService)
	if !ok {
		response.InternalError(c, "authentication service unavailable")
		return
	}

	token, err := svc.GenerateToken(user.ID, user.WalletAddress, user.Role)
	if err != nil {
		h.log.Error("failed to generate admin token", "error", err, "user_id", user.ID)
		response.InternalError(c, "failed to generate token")
		return
	}

	h.log.Info("admin user authenticated", "user_id", user.ID, "email", req.Email)

	response.OK(c, gin.H{
		"token": token,
		"user": gin.H{
			"id": user.ID, "email": user.Email, "username": user.Username,
			"name": user.Name, "role": user.Role, "wallet_address": user.WalletAddress,
		},
	})
}

// adminJWTService is an interface adapter so admin_handler doesn't import auth package directly.
type adminJWTService interface {
	GenerateToken(userID uint, walletAddress string, role string) (string, error)
}

// JWTMiddlewareInjector injects the JWT service into the Gin context for admin login.
func JWTMiddlewareInjector(jwtSvc interface{}) gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Set("jwt_service", jwtSvc)
		c.Next()
	}
}

// GetMe returns the current admin's profile.
// GET /api/admin/me
func (h *AdminHandler) GetMe(c *gin.Context) {
	userID := mustUserID(c)

	var user models.User
	if err := h.db.First(&user, userID).Error; err != nil {
		response.NotFound(c, "user not found")
		return
	}

	response.OK(c, gin.H{
		"id": user.ID, "email": user.Email, "username": user.Username,
		"name": user.Name, "role": user.Role, "wallet_address": user.WalletAddress,
	})
}

// --- Dashboard ---

type DashboardStats struct {
	TotalUsers     int64 `json:"total_users"`
	TotalMessages  int64 `json:"total_messages"`
	MessagesToday  int64 `json:"messages_today"`
	ActiveUsers24h int64 `json:"active_users_24h"`
	NewUsers7d     int64 `json:"new_users_7d"`
	BannedUsers    int64 `json:"banned_users"`
}

// GetDashboardStats returns platform statistics.
// GET /api/admin/dashboard/stats
func (h *AdminHandler) GetDashboardStats(c *gin.Context) {
	var stats DashboardStats

	h.db.Model(&models.User{}).Count(&stats.TotalUsers)
	h.db.Model(&models.Message{}).Count(&stats.TotalMessages)

	today := time.Now().Truncate(24 * time.Hour)
	h.db.Model(&models.Message{}).Where("created_at >= ?", today).Count(&stats.MessagesToday)

	h.db.Model(&models.User{}).Where("last_seen_at >= ?", time.Now().Add(-24*time.Hour)).Count(&stats.ActiveUsers24h)
	h.db.Model(&models.User{}).Where("created_at >= ?", time.Now().Add(-7*24*time.Hour)).Count(&stats.NewUsers7d)
	h.db.Model(&models.User{}).Where("is_banned = ?", true).Count(&stats.BannedUsers)

	response.OK(c, stats)
}

// --- User Management ---

// ListUsers returns a paginated list of users with search/filter.
// GET /api/admin/users
func (h *AdminHandler) ListUsers(c *gin.Context) {
	page, pageSize := parsePagination(c)
	offset := (page - 1) * pageSize

	query := h.db.Model(&models.User{})

	if search := c.Query("search"); search != "" {
		like := "%" + search + "%"
		query = query.Where("username ILIKE ? OR email ILIKE ? OR wallet_address ILIKE ? OR name ILIKE ?",
			like, like, like, like)
	}
	if role := c.Query("role"); role != "" {
		query = query.Where("role = ?", role)
	}
	if banned := c.Query("banned"); banned == "true" {
		query = query.Where("is_banned = ?", true)
	} else if banned == "false" {
		query = query.Where("is_banned = ?", false)
	}

	var total int64
	query.Count(&total)

	var users []models.User
	if err := query.Order("created_at DESC").Offset(offset).Limit(pageSize).Find(&users).Error; err != nil {
		h.log.Error("failed to list users", "error", err)
		response.InternalError(c, "failed to list users")
		return
	}

	response.Paginated(c, users, total, page, pageSize)
}

// GetUser returns a single user with message stats.
// GET /api/admin/users/:id
func (h *AdminHandler) GetUser(c *gin.Context) {
	id, err := parseUintParam(c, "id")
	if err != nil {
		response.ValidationError(c, "invalid user id")
		return
	}

	var user models.User
	if err := h.db.First(&user, id).Error; err != nil {
		response.NotFound(c, "user not found")
		return
	}

	var sentCount, receivedCount int64
	h.db.Model(&models.Message{}).Where("sender_id = ?", id).Count(&sentCount)
	h.db.Model(&models.Message{}).Where("receiver_id = ?", id).Count(&receivedCount)

	response.OK(c, gin.H{
		"user":           user,
		"messages_sent":  sentCount,
		"messages_received": receivedCount,
	})
}

type UpdateRoleRequest struct {
	Role string `json:"role" binding:"required"`
}

// UpdateUserRole changes a user's role (super_admin only).
// PUT /api/admin/users/:id/role
func (h *AdminHandler) UpdateUserRole(c *gin.Context) {
	adminID := mustUserID(c)
	roleVal, exists := c.Get("role")
	if !exists {
		response.Forbidden(c, "role not found")
		return
	}
	roleStr, ok := roleVal.(string)
	if !ok || roleStr != "super_admin" {
		response.Forbidden(c, "only super_admin can change roles")
		return
	}

	id, err := parseUintParam(c, "id")
	if err != nil {
		response.ValidationError(c, "invalid user id")
		return
	}

	var req UpdateRoleRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ValidationError(c, "role is required")
		return
	}

	validRoles := map[string]bool{"user": true, "moderator": true, "admin": true, "super_admin": true}
	if !validRoles[req.Role] {
		response.ValidationError(c, "invalid role")
		return
	}

	var user models.User
	if err := h.db.First(&user, id).Error; err != nil {
		response.NotFound(c, "user not found")
		return
	}

	oldRole := user.Role
	if err := h.db.Model(&user).Update("role", req.Role).Error; err != nil {
		h.log.Error("failed to update user role", "error", err, "user_id", id)
		response.InternalError(c, "failed to update role")
		return
	}

	h.createAuditLog(adminID, "update_role", fmt.Sprintf("user:%d", id),
		fmt.Sprintf("changed role from %s to %s", oldRole, req.Role), c.ClientIP())

	response.OK(c, gin.H{"message": "role updated"})
}

type BanUserRequest struct {
	Reason string `json:"reason"`
}

// BanUser bans a user.
// PUT /api/admin/users/:id/ban
func (h *AdminHandler) BanUser(c *gin.Context) {
	adminID := mustUserID(c)

	id, err := parseUintParam(c, "id")
	if err != nil {
		response.ValidationError(c, "invalid user id")
		return
	}

	var req BanUserRequest
	c.ShouldBindJSON(&req)

	var user models.User
	if err := h.db.First(&user, id).Error; err != nil {
		response.NotFound(c, "user not found")
		return
	}

	if user.IsBanned {
		response.BadRequest(c, "user is already banned")
		return
	}

	now := time.Now()
	if err := h.db.Model(&user).Updates(map[string]interface{}{
		"is_banned":  true,
		"banned_at":  now,
		"ban_reason": req.Reason,
	}).Error; err != nil {
		h.log.Error("failed to ban user", "error", err, "user_id", id)
		response.InternalError(c, "failed to ban user")
		return
	}

	h.createAuditLog(adminID, "ban_user", fmt.Sprintf("user:%d", id), req.Reason, c.ClientIP())

	response.OK(c, gin.H{"message": "user banned"})
}

// UnbanUser unbans a user.
// PUT /api/admin/users/:id/unban
func (h *AdminHandler) UnbanUser(c *gin.Context) {
	adminID := mustUserID(c)

	id, err := parseUintParam(c, "id")
	if err != nil {
		response.ValidationError(c, "invalid user id")
		return
	}

	var user models.User
	if err := h.db.First(&user, id).Error; err != nil {
		response.NotFound(c, "user not found")
		return
	}

	if !user.IsBanned {
		response.BadRequest(c, "user is not banned")
		return
	}

	if err := h.db.Model(&user).Updates(map[string]interface{}{
		"is_banned":  false,
		"banned_at":  nil,
		"ban_reason": "",
	}).Error; err != nil {
		h.log.Error("failed to unban user", "error", err, "user_id", id)
		response.InternalError(c, "failed to unban user")
		return
	}

	h.createAuditLog(adminID, "unban_user", fmt.Sprintf("user:%d", id), "", c.ClientIP())

	response.OK(c, gin.H{"message": "user unbanned"})
}

// DeleteUser soft-deletes a user (super_admin only).
// DELETE /api/admin/users/:id
func (h *AdminHandler) DeleteUser(c *gin.Context) {
	adminID := mustUserID(c)
	roleVal, exists := c.Get("role")
	if !exists {
		response.Forbidden(c, "role not found")
		return
	}
	roleStr, ok := roleVal.(string)
	if !ok || roleStr != "super_admin" {
		response.Forbidden(c, "only super_admin can delete users")
		return
	}

	id, err := parseUintParam(c, "id")
	if err != nil {
		response.ValidationError(c, "invalid user id")
		return
	}

	if id == adminID {
		response.BadRequest(c, "cannot delete yourself")
		return
	}

	if err := h.db.Delete(&models.User{}, id).Error; err != nil {
		h.log.Error("failed to delete user", "error", err, "user_id", id)
		response.InternalError(c, "failed to delete user")
		return
	}

	h.createAuditLog(adminID, "delete_user", fmt.Sprintf("user:%d", id), "", c.ClientIP())

	response.OK(c, gin.H{"message": "user deleted"})
}

// --- Message Management ---

// ListMessages returns a paginated list of messages with search/filter.
// GET /api/admin/messages
func (h *AdminHandler) ListMessages(c *gin.Context) {
	page, pageSize := parsePagination(c)
	offset := (page - 1) * pageSize

	query := h.db.Model(&models.Message{})

	if search := c.Query("search"); search != "" {
		like := "%" + search + "%"
		query = query.Where("content ILIKE ?", like)
	}
	if senderID := c.Query("sender_id"); senderID != "" {
		query = query.Where("sender_id = ?", senderID)
	}
	if from := c.Query("from"); from != "" {
		if t, err := time.Parse("2006-01-02", from); err == nil {
			query = query.Where("created_at >= ?", t)
		}
	}
	if to := c.Query("to"); to != "" {
		if t, err := time.Parse("2006-01-02", to); err == nil {
			query = query.Where("created_at < ?", t.Add(24*time.Hour))
		}
	}

	var total int64
	query.Count(&total)

	var messages []models.Message
	if err := query.Order("created_at DESC").Offset(offset).Limit(pageSize).
		Preload("Sender").Preload("Receiver").
		Find(&messages).Error; err != nil {
		h.log.Error("failed to list messages", "error", err)
		response.InternalError(c, "failed to list messages")
		return
	}

	response.Paginated(c, messages, total, page, pageSize)
}

// GetMessage returns a single message.
// GET /api/admin/messages/:id
func (h *AdminHandler) GetMessage(c *gin.Context) {
	id, err := parseUintParam(c, "id")
	if err != nil {
		response.ValidationError(c, "invalid message id")
		return
	}

	var msg models.Message
	if err := h.db.Preload("Sender").Preload("Receiver").First(&msg, id).Error; err != nil {
		response.NotFound(c, "message not found")
		return
	}

	response.OK(c, msg)
}

// DeleteMessage admin-recalls a message.
// DELETE /api/admin/messages/:id
func (h *AdminHandler) DeleteMessage(c *gin.Context) {
	adminID := mustUserID(c)

	id, err := parseUintParam(c, "id")
	if err != nil {
		response.ValidationError(c, "invalid message id")
		return
	}

	var msg models.Message
	if err := h.db.First(&msg, id).Error; err != nil {
		response.NotFound(c, "message not found")
		return
	}

	now := time.Now()
	if err := h.db.Model(&msg).Updates(map[string]interface{}{
		"recalled":    true,
		"recalled_at": now,
		"content":     "This message has been removed by admin",
	}).Error; err != nil {
		h.log.Error("failed to delete message", "error", err, "message_id", id)
		response.InternalError(c, "failed to delete message")
		return
	}

	h.createAuditLog(adminID, "delete_message", fmt.Sprintf("message:%d", id), "", c.ClientIP())

	response.OK(c, gin.H{"message": "message deleted"})
}

// --- System Settings ---

// GetSettings returns all system settings.
// GET /api/admin/settings
func (h *AdminHandler) GetSettings(c *gin.Context) {
	var settings []models.SystemSetting
	if err := h.db.Order("key ASC").Find(&settings).Error; err != nil {
		h.log.Error("failed to get settings", "error", err)
		response.InternalError(c, "failed to get settings")
		return
	}

	response.OK(c, settings)
}

type UpdateSettingsRequest struct {
	Settings []struct {
		Key   string `json:"key" binding:"required"`
		Value string `json:"value" binding:"required"`
	} `json:"settings" binding:"required"`
}

// UpdateSettings bulk updates system settings (super_admin only).
// PUT /api/admin/settings
func (h *AdminHandler) UpdateSettings(c *gin.Context) {
	adminID := mustUserID(c)
	roleVal, exists := c.Get("role")
	if !exists {
		response.Forbidden(c, "role not found")
		return
	}
	roleStr, ok := roleVal.(string)
	if !ok || roleStr != "super_admin" {
		response.Forbidden(c, "only super_admin can update settings")
		return
	}

	var req UpdateSettingsRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ValidationError(c, "settings array is required")
		return
	}

	for _, s := range req.Settings {
		var setting models.SystemSetting
		result := h.db.Where("key = ?", s.Key).First(&setting)
		if result.Error != nil {
			setting = models.SystemSetting{Key: s.Key, Value: s.Value}
			h.db.Create(&setting)
		} else {
			h.db.Model(&setting).Update("value", s.Value)
		}
	}

	h.createAuditLog(adminID, "update_settings", "system_settings",
		fmt.Sprintf("updated %d settings", len(req.Settings)), c.ClientIP())

	response.OK(c, gin.H{"message": "settings updated"})
}

// --- Audit Logs ---

// GetAuditLogs returns a paginated list of audit logs.
// GET /api/admin/audit-logs
func (h *AdminHandler) GetAuditLogs(c *gin.Context) {
	page, pageSize := parsePagination(c)
	offset := (page - 1) * pageSize

	query := h.db.Model(&models.AuditLog{})

	if adminID := c.Query("admin_id"); adminID != "" {
		query = query.Where("admin_id = ?", adminID)
	}
	if action := c.Query("action"); action != "" {
		query = query.Where("action = ?", action)
	}
	if from := c.Query("from"); from != "" {
		if t, err := time.Parse("2006-01-02", from); err == nil {
			query = query.Where("created_at >= ?", t)
		}
	}
	if to := c.Query("to"); to != "" {
		if t, err := time.Parse("2006-01-02", to); err == nil {
			query = query.Where("created_at < ?", t.Add(24*time.Hour))
		}
	}

	var total int64
	query.Count(&total)

	var logs []models.AuditLog
	if err := query.Order("created_at DESC").Offset(offset).Limit(pageSize).
		Preload("Admin").Find(&logs).Error; err != nil {
		h.log.Error("failed to get audit logs", "error", err)
		response.InternalError(c, "failed to get audit logs")
		return
	}

	response.Paginated(c, logs, total, page, pageSize)
}

// --- Helpers ---

func (h *AdminHandler) createAuditLog(adminID uint, action, target, detail, ip string) {
	log := models.AuditLog{
		AdminID: adminID,
		Action:  action,
		Target:  target,
		Detail:  detail,
		IP:      ip,
	}
	if err := h.db.Create(&log).Error; err != nil {
		h.log.Error("failed to create audit log", "error", err, "action", action)
	}
}
