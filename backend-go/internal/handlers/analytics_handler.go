package handlers

import (
	"fmt"
	"log/slog"
	"time"

	"github.com/everest-an/dchat-backend/internal/models"
	"github.com/everest-an/dchat-backend/internal/response"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// AnalyticsHandler handles analytics API endpoints for the admin dashboard.
type AnalyticsHandler struct {
	db  *gorm.DB
	log *slog.Logger
}

// NewAnalyticsHandler creates an AnalyticsHandler.
func NewAnalyticsHandler(db *gorm.DB, log *slog.Logger) *AnalyticsHandler {
	return &AnalyticsHandler{db: db, log: log}
}

// DailyCount is a generic date-value pair used for trend data.
type DailyCount struct {
	Date  string `json:"date"`
	Count int64  `json:"count"`
}

// UserGrowth returns daily new user registrations over the last N days (default 30).
// GET /api/admin/analytics/user-growth
func (h *AnalyticsHandler) UserGrowth(c *gin.Context) {
	days := parseIntQuery(c, "days", 30)
	since := time.Now().AddDate(0, 0, -days).Truncate(24 * time.Hour)

	var results []DailyCount
	err := h.db.Model(&models.User{}).
		Select("TO_CHAR(created_at, 'YYYY-MM-DD') as date, COUNT(*) as count").
		Where("created_at >= ?", since).
		Group("TO_CHAR(created_at, 'YYYY-MM-DD')").
		Order("date ASC").
		Scan(&results).Error
	if err != nil {
		h.log.Error("failed to get user growth", "error", err)
		response.InternalError(c, "failed to get user growth")
		return
	}

	results = fillMissingDays(results, since, days)
	response.OK(c, results)
}

// MessageTrends returns daily message counts over the last N days (default 30).
// GET /api/admin/analytics/message-trends
func (h *AnalyticsHandler) MessageTrends(c *gin.Context) {
	days := parseIntQuery(c, "days", 30)
	since := time.Now().AddDate(0, 0, -days).Truncate(24 * time.Hour)

	var results []DailyCount
	err := h.db.Model(&models.Message{}).
		Select("TO_CHAR(created_at, 'YYYY-MM-DD') as date, COUNT(*) as count").
		Where("created_at >= ?", since).
		Group("TO_CHAR(created_at, 'YYYY-MM-DD')").
		Order("date ASC").
		Scan(&results).Error
	if err != nil {
		h.log.Error("failed to get message trends", "error", err)
		response.InternalError(c, "failed to get message trends")
		return
	}

	results = fillMissingDays(results, since, days)
	response.OK(c, results)
}

// ActiveUsers returns daily active user counts over the last N days (default 30).
// GET /api/admin/analytics/active-users
func (h *AnalyticsHandler) ActiveUsers(c *gin.Context) {
	days := parseIntQuery(c, "days", 30)
	since := time.Now().AddDate(0, 0, -days).Truncate(24 * time.Hour)

	// DAU: count distinct senders per day from messages table.
	var results []DailyCount
	err := h.db.Model(&models.Message{}).
		Select("TO_CHAR(created_at, 'YYYY-MM-DD') as date, COUNT(DISTINCT sender_id) as count").
		Where("created_at >= ?", since).
		Group("TO_CHAR(created_at, 'YYYY-MM-DD')").
		Order("date ASC").
		Scan(&results).Error
	if err != nil {
		h.log.Error("failed to get active users", "error", err)
		response.InternalError(c, "failed to get active users")
		return
	}

	results = fillMissingDays(results, since, days)

	// MAU: total distinct users in last 30 days.
	var mau int64
	h.db.Model(&models.Message{}).
		Where("created_at >= ?", time.Now().AddDate(0, 0, -30)).
		Distinct("sender_id").Count(&mau)

	response.OK(c, gin.H{
		"daily": results,
		"mau":   mau,
	})
}

// GroupStats returns group-related statistics.
// GET /api/admin/analytics/group-stats
func (h *AnalyticsHandler) GroupStats(c *gin.Context) {
	var totalGroups int64
	h.db.Model(&models.Group{}).Count(&totalGroups)

	var totalMembers int64
	h.db.Model(&models.GroupMember{}).Count(&totalMembers)

	var totalGroupMessages int64
	h.db.Model(&models.GroupMessage{}).Count(&totalGroupMessages)

	// Top 10 active groups by message count.
	type ActiveGroup struct {
		GroupID      uint   `json:"group_id"`
		GroupName    string `json:"group_name"`
		MemberCount int64  `json:"member_count"`
		MessageCount int64 `json:"message_count"`
	}

	var activeGroups []ActiveGroup
	h.db.Model(&models.GroupMessage{}).
		Select(`"group"."id" as group_id, "group"."name" as group_name, COUNT(*) as message_count`).
		Joins(`JOIN "group" ON "group"."id" = "group_message"."group_id"`).
		Where(`"group_message"."created_at" >= ?`, time.Now().AddDate(0, 0, -30)).
		Group(`"group"."id", "group"."name"`).
		Order("message_count DESC").
		Limit(10).
		Scan(&activeGroups)

	// Fill member counts.
	for i, g := range activeGroups {
		var count int64
		h.db.Model(&models.GroupMember{}).Where("group_id = ?", g.GroupID).Count(&count)
		activeGroups[i].MemberCount = count
	}

	response.OK(c, gin.H{
		"total_groups":         totalGroups,
		"total_members":        totalMembers,
		"total_group_messages": totalGroupMessages,
		"active_groups":        activeGroups,
	})
}

// Retention returns simple retention metrics.
// GET /api/admin/analytics/retention
func (h *AnalyticsHandler) Retention(c *gin.Context) {
	now := time.Now()

	// Users who registered in last 7 days and sent at least 1 message.
	var newUsers7d int64
	h.db.Model(&models.User{}).Where("created_at >= ?", now.AddDate(0, 0, -7)).Count(&newUsers7d)

	var activeNew7d int64
	h.db.Model(&models.User{}).
		Where("created_at >= ?", now.AddDate(0, 0, -7)).
		Where("id IN (SELECT DISTINCT sender_id FROM message WHERE created_at >= ?)", now.AddDate(0, 0, -7)).
		Count(&activeNew7d)

	// Users who registered in last 30 days and sent at least 1 message.
	var newUsers30d int64
	h.db.Model(&models.User{}).Where("created_at >= ?", now.AddDate(0, 0, -30)).Count(&newUsers30d)

	var activeNew30d int64
	h.db.Model(&models.User{}).
		Where("created_at >= ?", now.AddDate(0, 0, -30)).
		Where("id IN (SELECT DISTINCT sender_id FROM message WHERE created_at >= ?)", now.AddDate(0, 0, -30)).
		Count(&activeNew30d)

	// Overall: total users who ever sent a message vs total users.
	var totalUsers int64
	h.db.Model(&models.User{}).Count(&totalUsers)

	var activatedUsers int64
	h.db.Model(&models.User{}).
		Where("id IN (SELECT DISTINCT sender_id FROM message)").
		Count(&activatedUsers)

	rate7d := float64(0)
	if newUsers7d > 0 {
		rate7d = float64(activeNew7d) / float64(newUsers7d) * 100
	}
	rate30d := float64(0)
	if newUsers30d > 0 {
		rate30d = float64(activeNew30d) / float64(newUsers30d) * 100
	}
	activationRate := float64(0)
	if totalUsers > 0 {
		activationRate = float64(activatedUsers) / float64(totalUsers) * 100
	}

	response.OK(c, gin.H{
		"retention_7d":    rate7d,
		"retention_30d":   rate30d,
		"activation_rate": activationRate,
		"new_users_7d":    newUsers7d,
		"active_new_7d":   activeNew7d,
		"new_users_30d":   newUsers30d,
		"active_new_30d":  activeNew30d,
		"total_users":     totalUsers,
		"activated_users": activatedUsers,
	})
}

// --- Helpers ---

// fillMissingDays fills zero values for days with no data.
func fillMissingDays(results []DailyCount, since time.Time, days int) []DailyCount {
	dateMap := make(map[string]int64)
	for _, r := range results {
		dateMap[r.Date] = r.Count
	}

	filled := make([]DailyCount, 0, days)
	for i := 0; i < days; i++ {
		date := since.AddDate(0, 0, i).Format("2006-01-02")
		count := dateMap[date]
		filled = append(filled, DailyCount{Date: date, Count: count})
	}
	return filled
}

// parseIntQuery parses an integer query parameter with a default value.
func parseIntQuery(c *gin.Context, key string, defaultVal int) int {
	if val := c.Query(key); val != "" {
		var n int
		if _, err := fmt.Sscanf(val, "%d", &n); err == nil && n > 0 && n <= 365 {
			return n
		}
	}
	return defaultVal
}
