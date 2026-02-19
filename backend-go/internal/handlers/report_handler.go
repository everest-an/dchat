package handlers

import (
	"log/slog"
	"time"

	"github.com/everest-an/dchat-backend/internal/models"
	"github.com/everest-an/dchat-backend/internal/response"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// ReportHandler handles report-related API endpoints.
type ReportHandler struct {
	db  *gorm.DB
	log *slog.Logger
}

// NewReportHandler creates a ReportHandler.
func NewReportHandler(db *gorm.DB, log *slog.Logger) *ReportHandler {
	return &ReportHandler{db: db, log: log}
}

// CreateReportRequest is the body for POST /api/reports.
type CreateReportRequest struct {
	ReportedUserID    uint   `json:"reported_user_id" binding:"required"`
	ReportedMessageID *uint  `json:"reported_message_id"`
	Reason            string `json:"reason" binding:"required"`
	Description       string `json:"description"`
}

// CreateReport creates a new report.
// POST /api/reports
func (h *ReportHandler) CreateReport(c *gin.Context) {
	reporterID := mustUserID(c)

	var req CreateReportRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ValidationError(c, "reported_user_id and reason are required")
		return
	}

	if !models.IsValidReason(req.Reason) {
		response.ValidationError(c, "invalid reason; must be one of: spam, harassment, inappropriate, fraud, other")
		return
	}

	if req.ReportedUserID == reporterID {
		response.BadRequest(c, "you cannot report yourself")
		return
	}

	// Verify reported user exists.
	var reportedUser models.User
	if err := h.db.First(&reportedUser, req.ReportedUserID).Error; err != nil {
		response.NotFound(c, "reported user not found")
		return
	}

	// If a message ID is provided, verify it exists.
	if req.ReportedMessageID != nil {
		var msg models.Message
		if err := h.db.First(&msg, *req.ReportedMessageID).Error; err != nil {
			response.NotFound(c, "reported message not found")
			return
		}
	}

	// Check for duplicate reports within 24 hours.
	var recentCount int64
	query := h.db.Model(&models.Report{}).
		Where("reporter_id = ? AND reported_user_id = ? AND created_at > ?",
			reporterID, req.ReportedUserID, time.Now().Add(-24*time.Hour))
	if req.ReportedMessageID != nil {
		query = query.Where("reported_message_id = ?", *req.ReportedMessageID)
	}
	query.Count(&recentCount)

	if recentCount > 0 {
		response.BadRequest(c, "you have already reported this user/message recently")
		return
	}

	report := models.Report{
		ReporterID:        reporterID,
		ReportedUserID:    req.ReportedUserID,
		ReportedMessageID: req.ReportedMessageID,
		Reason:            models.ReportReason(req.Reason),
		Description:       req.Description,
		Status:            models.ReportStatusPending,
	}

	if err := h.db.Create(&report).Error; err != nil {
		h.log.Error("failed to create report", "error", err, "reporter", reporterID)
		response.InternalError(c, "failed to create report")
		return
	}

	h.db.Preload("Reporter").Preload("ReportedUser").First(&report, report.ID)

	response.Created(c, report)
}

// GetReports lists reports with optional filters.
// GET /api/reports?status=pending&page=1&page_size=20
func (h *ReportHandler) GetReports(c *gin.Context) {
	page, pageSize := parsePagination(c)
	offset := (page - 1) * pageSize

	query := h.db.Model(&models.Report{})

	// Filter by status.
	if status := c.Query("status"); status != "" {
		query = query.Where("status = ?", status)
	}

	// Filter by reported user.
	if userID := c.Query("reported_user_id"); userID != "" {
		query = query.Where("reported_user_id = ?", userID)
	}

	// Filter by reason.
	if reason := c.Query("reason"); reason != "" {
		query = query.Where("reason = ?", reason)
	}

	var total int64
	query.Count(&total)

	var reports []models.Report
	err := query.
		Order("created_at DESC").
		Offset(offset).
		Limit(pageSize).
		Preload("Reporter").
		Preload("ReportedUser").
		Preload("ReportedMessage").
		Find(&reports).Error

	if err != nil {
		h.log.Error("failed to list reports", "error", err)
		response.InternalError(c, "failed to list reports")
		return
	}

	response.Paginated(c, reports, total, page, pageSize)
}

// ReviewReportRequest is the body for PUT /api/reports/:id/review.
type ReviewReportRequest struct {
	Status         string `json:"status" binding:"required"`
	ResolutionNote string `json:"resolution_note"`
}

// ReviewReport updates the status of a report.
// PUT /api/reports/:id/review
func (h *ReportHandler) ReviewReport(c *gin.Context) {
	reviewerID := mustUserID(c)

	reportID, err := parseUintParam(c, "id")
	if err != nil {
		response.ValidationError(c, "invalid report id")
		return
	}

	var req ReviewReportRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ValidationError(c, "status is required")
		return
	}

	validStatuses := map[string]bool{
		string(models.ReportStatusReviewing): true,
		string(models.ReportStatusResolved):  true,
		string(models.ReportStatusDismissed): true,
	}
	if !validStatuses[req.Status] {
		response.ValidationError(c, "status must be one of: reviewing, resolved, dismissed")
		return
	}

	var report models.Report
	if err := h.db.First(&report, reportID).Error; err != nil {
		response.NotFound(c, "report not found")
		return
	}

	updates := map[string]interface{}{
		"status":      req.Status,
		"reviewer_id": reviewerID,
	}
	if req.ResolutionNote != "" {
		updates["resolution_note"] = req.ResolutionNote
	}

	if err := h.db.Model(&report).Updates(updates).Error; err != nil {
		h.log.Error("failed to review report", "error", err, "id", reportID)
		response.InternalError(c, "failed to review report")
		return
	}

	h.db.Preload("Reporter").Preload("ReportedUser").Preload("Reviewer").First(&report, report.ID)
	response.OK(c, report)
}

// GetReportStats returns aggregate stats about reports.
// GET /api/reports/stats
func (h *ReportHandler) GetReportStats(c *gin.Context) {
	type StatusCount struct {
		Status string `json:"status"`
		Count  int64  `json:"count"`
	}

	var statusCounts []StatusCount
	err := h.db.Model(&models.Report{}).
		Select("status, COUNT(*) as count").
		Group("status").
		Scan(&statusCounts).Error

	if err != nil {
		h.log.Error("failed to get report stats", "error", err)
		response.InternalError(c, "failed to get report stats")
		return
	}

	type ReasonCount struct {
		Reason string `json:"reason"`
		Count  int64  `json:"count"`
	}

	var reasonCounts []ReasonCount
	err = h.db.Model(&models.Report{}).
		Select("reason, COUNT(*) as count").
		Group("reason").
		Scan(&reasonCounts).Error

	if err != nil {
		h.log.Error("failed to get report reason stats", "error", err)
		response.InternalError(c, "failed to get report stats")
		return
	}

	var totalReports int64
	h.db.Model(&models.Report{}).Count(&totalReports)

	var pendingReports int64
	h.db.Model(&models.Report{}).Where("status = ?", "pending").Count(&pendingReports)

	response.OK(c, gin.H{
		"total":           totalReports,
		"pending":         pendingReports,
		"by_status":       statusCounts,
		"by_reason":       reasonCounts,
	})
}

// GetMyReports lists reports submitted by the current user.
// GET /api/reports/mine
func (h *ReportHandler) GetMyReports(c *gin.Context) {
	userID := mustUserID(c)
	page, pageSize := parsePagination(c)
	offset := (page - 1) * pageSize

	var total int64
	h.db.Model(&models.Report{}).Where("reporter_id = ?", userID).Count(&total)

	var reports []models.Report
	err := h.db.
		Where("reporter_id = ?", userID).
		Order("created_at DESC").
		Offset(offset).
		Limit(pageSize).
		Preload("ReportedUser").
		Find(&reports).Error

	if err != nil {
		h.log.Error("failed to get user reports", "error", err, "user", userID)
		response.InternalError(c, "failed to get reports")
		return
	}

	response.Paginated(c, reports, total, page, pageSize)
}
