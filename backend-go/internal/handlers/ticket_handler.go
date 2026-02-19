package handlers

import (
	"log/slog"
	"time"

	"github.com/everest-an/dchat-backend/internal/models"
	"github.com/everest-an/dchat-backend/internal/response"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// TicketHandler handles customer support ticket endpoints.
type TicketHandler struct {
	db  *gorm.DB
	log *slog.Logger
}

// NewTicketHandler creates a TicketHandler.
func NewTicketHandler(db *gorm.DB, log *slog.Logger) *TicketHandler {
	return &TicketHandler{db: db, log: log}
}

// --- Request DTOs ---

type CreateTicketRequest struct {
	Subject     string `json:"subject" binding:"required"`
	Description string `json:"description" binding:"required"`
	Category    string `json:"category"`
	Priority    string `json:"priority"`
}

type ReplyTicketRequest struct {
	Content string `json:"content" binding:"required"`
}

type UpdateTicketStatusRequest struct {
	Status string `json:"status" binding:"required"` // open, in_progress, resolved, closed
}

// --- Handlers ---

// CreateTicket creates a new support ticket.
// POST /api/tickets
func (h *TicketHandler) CreateTicket(c *gin.Context) {
	userID := mustUserID(c)

	var req CreateTicketRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ValidationError(c, "subject and description are required")
		return
	}

	category := req.Category
	if category == "" {
		category = "general"
	}
	priority := req.Priority
	if priority == "" {
		priority = "medium"
	}

	ticket := models.Ticket{
		UserID:      userID,
		Subject:     req.Subject,
		Description: req.Description,
		Category:    category,
		Priority:    priority,
		Status:      "open",
	}

	if err := h.db.Create(&ticket).Error; err != nil {
		h.log.Error("failed to create ticket", "error", err)
		response.InternalError(c, "failed to create ticket")
		return
	}

	// Create initial message from description.
	msg := models.TicketMessage{
		TicketID: ticket.ID,
		SenderID: userID,
		Content:  req.Description,
		IsStaff:  false,
	}
	h.db.Create(&msg)

	h.db.Preload("User").First(&ticket, ticket.ID)
	response.Created(c, ticket)
}

// GetMyTickets returns tickets created by the current user.
// GET /api/tickets
func (h *TicketHandler) GetMyTickets(c *gin.Context) {
	userID := mustUserID(c)
	page, pageSize := parsePagination(c)
	offset := (page - 1) * pageSize

	var total int64
	h.db.Model(&models.Ticket{}).Where("user_id = ?", userID).Count(&total)

	var tickets []models.Ticket
	if err := h.db.Where("user_id = ?", userID).
		Order("updated_at DESC").
		Offset(offset).Limit(pageSize).
		Preload("User").
		Preload("Assignee").
		Find(&tickets).Error; err != nil {
		h.log.Error("failed to list tickets", "error", err)
		response.InternalError(c, "failed to list tickets")
		return
	}

	response.Paginated(c, tickets, total, page, pageSize)
}

// GetTicket returns a single ticket with messages.
// GET /api/tickets/:id
func (h *TicketHandler) GetTicket(c *gin.Context) {
	userID := mustUserID(c)

	id, err := parseUintParam(c, "id")
	if err != nil {
		response.ValidationError(c, "invalid ticket id")
		return
	}

	var ticket models.Ticket
	if err := h.db.
		Preload("User").
		Preload("Assignee").
		Preload("Messages", func(db *gorm.DB) *gorm.DB {
			return db.Order("created_at ASC").Preload("Sender")
		}).
		First(&ticket, id).Error; err != nil {
		response.NotFound(c, "ticket not found")
		return
	}

	// Only ticket owner or staff can view.
	if ticket.UserID != userID {
		// Check if user is admin/staff.
		var user models.User
		h.db.First(&user, userID)
		if user.Role != "admin" && user.Role != "super_admin" && user.Role != "moderator" {
			response.Forbidden(c, "not authorized to view this ticket")
			return
		}
	}

	response.OK(c, ticket)
}

// ReplyToTicket adds a message to a ticket.
// POST /api/tickets/:id/reply
func (h *TicketHandler) ReplyToTicket(c *gin.Context) {
	userID := mustUserID(c)

	id, err := parseUintParam(c, "id")
	if err != nil {
		response.ValidationError(c, "invalid ticket id")
		return
	}

	var req ReplyTicketRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ValidationError(c, "content is required")
		return
	}

	var ticket models.Ticket
	if err := h.db.First(&ticket, id).Error; err != nil {
		response.NotFound(c, "ticket not found")
		return
	}

	// Determine if sender is staff.
	var user models.User
	h.db.First(&user, userID)
	isStaff := user.Role == "admin" || user.Role == "super_admin" || user.Role == "moderator"

	msg := models.TicketMessage{
		TicketID: ticket.ID,
		SenderID: userID,
		Content:  req.Content,
		IsStaff:  isStaff,
	}

	if err := h.db.Create(&msg).Error; err != nil {
		h.log.Error("failed to reply to ticket", "error", err)
		response.InternalError(c, "failed to reply to ticket")
		return
	}

	// If staff replies, auto-set status to in_progress if still open.
	if isStaff && ticket.Status == "open" {
		h.db.Model(&ticket).Update("status", "in_progress")
	}

	h.db.Preload("Sender").First(&msg, msg.ID)
	response.Created(c, msg)
}

// UpdateTicketStatus updates the status of a ticket.
// PUT /api/tickets/:id/status
func (h *TicketHandler) UpdateTicketStatus(c *gin.Context) {
	userID := mustUserID(c)

	id, err := parseUintParam(c, "id")
	if err != nil {
		response.ValidationError(c, "invalid ticket id")
		return
	}

	var req UpdateTicketStatusRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ValidationError(c, "status is required")
		return
	}

	validStatuses := map[string]bool{"open": true, "in_progress": true, "resolved": true, "closed": true}
	if !validStatuses[req.Status] {
		response.ValidationError(c, "invalid status")
		return
	}

	var ticket models.Ticket
	if err := h.db.First(&ticket, id).Error; err != nil {
		response.NotFound(c, "ticket not found")
		return
	}

	// Only owner or staff can update status.
	if ticket.UserID != userID {
		var user models.User
		h.db.First(&user, userID)
		if user.Role != "admin" && user.Role != "super_admin" && user.Role != "moderator" {
			response.Forbidden(c, "not authorized")
			return
		}
	}

	updates := map[string]interface{}{"status": req.Status}
	now := time.Now()
	if req.Status == "resolved" {
		updates["resolved_at"] = now
	} else if req.Status == "closed" {
		updates["closed_at"] = now
	}

	if err := h.db.Model(&ticket).Updates(updates).Error; err != nil {
		h.log.Error("failed to update ticket status", "error", err)
		response.InternalError(c, "failed to update ticket status")
		return
	}

	ticket.Status = req.Status
	response.OK(c, ticket)
}

// GetAllTickets returns all tickets (admin only).
// GET /api/admin/tickets
func (h *TicketHandler) GetAllTickets(c *gin.Context) {
	page, pageSize := parsePagination(c)
	offset := (page - 1) * pageSize

	status := c.Query("status")
	priority := c.Query("priority")

	query := h.db.Model(&models.Ticket{})
	if status != "" {
		query = query.Where("status = ?", status)
	}
	if priority != "" {
		query = query.Where("priority = ?", priority)
	}

	var total int64
	query.Count(&total)

	var tickets []models.Ticket
	if err := query.Order("CASE priority WHEN 'urgent' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END, updated_at DESC").
		Offset(offset).Limit(pageSize).
		Preload("User").
		Preload("Assignee").
		Find(&tickets).Error; err != nil {
		h.log.Error("failed to list all tickets", "error", err)
		response.InternalError(c, "failed to list tickets")
		return
	}

	response.Paginated(c, tickets, total, page, pageSize)
}

// AssignTicket assigns a ticket to a staff member.
// PUT /api/admin/tickets/:id/assign
func (h *TicketHandler) AssignTicket(c *gin.Context) {
	id, err := parseUintParam(c, "id")
	if err != nil {
		response.ValidationError(c, "invalid ticket id")
		return
	}

	var req struct {
		AssignedTo uint `json:"assigned_to" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ValidationError(c, "assigned_to is required")
		return
	}

	if err := h.db.Model(&models.Ticket{}).Where("id = ?", id).
		Update("assigned_to", req.AssignedTo).Error; err != nil {
		h.log.Error("failed to assign ticket", "error", err)
		response.InternalError(c, "failed to assign ticket")
		return
	}

	response.OK(c, gin.H{"message": "ticket assigned"})
}
