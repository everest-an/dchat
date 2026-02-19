package handlers

import (
	"log/slog"

	"github.com/everest-an/dchat-backend/internal/models"
	"github.com/everest-an/dchat-backend/internal/response"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// CalendarHandler handles calendar event endpoints.
type CalendarHandler struct {
	db  *gorm.DB
	log *slog.Logger
}

// NewCalendarHandler creates a CalendarHandler.
func NewCalendarHandler(db *gorm.DB, log *slog.Logger) *CalendarHandler {
	return &CalendarHandler{db: db, log: log}
}

type createEventReq struct {
	Title       string `json:"title" binding:"required"`
	Description string `json:"description"`
	Location    string `json:"location"`
	StartTime   string `json:"start_time" binding:"required"`
	EndTime     string `json:"end_time" binding:"required"`
	AllDay      bool   `json:"all_day"`
	Color       string `json:"color"`
	GroupID     *uint  `json:"group_id"`
	Participants []uint `json:"participants"`
}

// CreateEvent creates a new calendar event.
// POST /api/calendar/events
func (h *CalendarHandler) CreateEvent(c *gin.Context) {
	userID := mustUserID(c)

	var req createEventReq
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ValidationError(c, "title, start_time and end_time are required")
		return
	}

	startTime, err := parseTime(req.StartTime)
	if err != nil {
		response.ValidationError(c, "invalid start_time format")
		return
	}

	endTime, err := parseTime(req.EndTime)
	if err != nil {
		response.ValidationError(c, "invalid end_time format")
		return
	}

	event := models.CalendarEvent{
		CreatorID:   userID,
		Title:       req.Title,
		Description: req.Description,
		Location:    req.Location,
		StartTime:   startTime,
		EndTime:     endTime,
		AllDay:      req.AllDay,
		Color:       req.Color,
		GroupID:     req.GroupID,
	}

	if err := h.db.Create(&event).Error; err != nil {
		h.log.Error("failed to create event", "error", err)
		response.InternalError(c, "failed to create event")
		return
	}

	// Add participants.
	for _, uid := range req.Participants {
		p := models.EventParticipant{EventID: event.ID, UserID: uid, Status: "pending"}
		h.db.Create(&p)
	}
	// Creator is always accepted.
	h.db.Create(&models.EventParticipant{EventID: event.ID, UserID: userID, Status: "accepted"})

	h.db.Preload("Participants.User").First(&event, event.ID)
	response.Created(c, event)
}

// GetEvents returns events for the current user within a date range.
// GET /api/calendar/events?from=&to=&group_id=
func (h *CalendarHandler) GetEvents(c *gin.Context) {
	userID := mustUserID(c)

	q := h.db.Model(&models.CalendarEvent{}).
		Joins("LEFT JOIN event_participant ON event_participant.event_id = calendar_event.id").
		Where("calendar_event.creator_id = ? OR event_participant.user_id = ?", userID, userID).
		Group("calendar_event.id")

	if from := c.Query("from"); from != "" {
		if t, err := parseTime(from); err == nil {
			q = q.Where("calendar_event.end_time >= ?", t)
		}
	}
	if to := c.Query("to"); to != "" {
		if t, err := parseTime(to); err == nil {
			q = q.Where("calendar_event.start_time <= ?", t)
		}
	}
	if groupID := c.Query("group_id"); groupID != "" {
		q = q.Where("calendar_event.group_id = ?", groupID)
	}

	var events []models.CalendarEvent
	if err := q.Preload("Participants.User").
		Order("calendar_event.start_time ASC").
		Find(&events).Error; err != nil {
		h.log.Error("failed to list events", "error", err)
		response.InternalError(c, "failed to list events")
		return
	}

	response.OK(c, events)
}

// GetEvent returns a single event.
// GET /api/calendar/events/:id
func (h *CalendarHandler) GetEvent(c *gin.Context) {
	eventID, err := parseUintParam(c, "id")
	if err != nil {
		response.ValidationError(c, "invalid event id")
		return
	}

	var event models.CalendarEvent
	if err := h.db.Preload("Creator").Preload("Participants.User").
		First(&event, eventID).Error; err != nil {
		response.NotFound(c, "event not found")
		return
	}

	response.OK(c, event)
}

type updateEventReq struct {
	Title       *string `json:"title"`
	Description *string `json:"description"`
	Location    *string `json:"location"`
	StartTime   *string `json:"start_time"`
	EndTime     *string `json:"end_time"`
	AllDay      *bool   `json:"all_day"`
	Color       *string `json:"color"`
}

// UpdateEvent updates a calendar event.
// PUT /api/calendar/events/:id
func (h *CalendarHandler) UpdateEvent(c *gin.Context) {
	userID := mustUserID(c)

	eventID, err := parseUintParam(c, "id")
	if err != nil {
		response.ValidationError(c, "invalid event id")
		return
	}

	var event models.CalendarEvent
	if err := h.db.First(&event, eventID).Error; err != nil {
		response.NotFound(c, "event not found")
		return
	}

	if event.CreatorID != userID {
		response.Forbidden(c, "only the creator can update this event")
		return
	}

	var req updateEventReq
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ValidationError(c, "invalid request body")
		return
	}

	updates := map[string]interface{}{}
	if req.Title != nil {
		updates["title"] = *req.Title
	}
	if req.Description != nil {
		updates["description"] = *req.Description
	}
	if req.Location != nil {
		updates["location"] = *req.Location
	}
	if req.AllDay != nil {
		updates["all_day"] = *req.AllDay
	}
	if req.Color != nil {
		updates["color"] = *req.Color
	}
	if req.StartTime != nil {
		if t, err := parseTime(*req.StartTime); err == nil {
			updates["start_time"] = t
		}
	}
	if req.EndTime != nil {
		if t, err := parseTime(*req.EndTime); err == nil {
			updates["end_time"] = t
		}
	}

	if err := h.db.Model(&event).Updates(updates).Error; err != nil {
		h.log.Error("failed to update event", "error", err)
		response.InternalError(c, "failed to update event")
		return
	}

	h.db.Preload("Creator").Preload("Participants.User").First(&event, eventID)
	response.OK(c, event)
}

// DeleteEvent deletes a calendar event.
// DELETE /api/calendar/events/:id
func (h *CalendarHandler) DeleteEvent(c *gin.Context) {
	userID := mustUserID(c)

	eventID, err := parseUintParam(c, "id")
	if err != nil {
		response.ValidationError(c, "invalid event id")
		return
	}

	// Delete participants first, then the event.
	tx := h.db.Begin()

	result := tx.Where("event_id = ?", eventID).Delete(&models.EventParticipant{})
	if result.Error != nil {
		tx.Rollback()
		h.log.Error("failed to delete event participants", "error", result.Error)
		response.InternalError(c, "failed to delete event")
		return
	}

	result = tx.Where("id = ? AND creator_id = ?", eventID, userID).Delete(&models.CalendarEvent{})
	if result.Error != nil {
		tx.Rollback()
		h.log.Error("failed to delete event", "error", result.Error)
		response.InternalError(c, "failed to delete event")
		return
	}

	if result.RowsAffected == 0 {
		tx.Rollback()
		response.NotFound(c, "event not found or not the creator")
		return
	}

	tx.Commit()
	response.OK(c, gin.H{"message": "event deleted"})
}

// RespondToEvent allows a participant to accept or decline an event.
// PUT /api/calendar/events/:id/respond
func (h *CalendarHandler) RespondToEvent(c *gin.Context) {
	userID := mustUserID(c)

	eventID, err := parseUintParam(c, "id")
	if err != nil {
		response.ValidationError(c, "invalid event id")
		return
	}

	var req struct {
		Status string `json:"status" binding:"required"` // accepted, declined
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ValidationError(c, "status is required (accepted or declined)")
		return
	}

	if req.Status != "accepted" && req.Status != "declined" {
		response.ValidationError(c, "status must be 'accepted' or 'declined'")
		return
	}

	result := h.db.Model(&models.EventParticipant{}).
		Where("event_id = ? AND user_id = ?", eventID, userID).
		Update("status", req.Status)

	if result.Error != nil {
		h.log.Error("failed to respond to event", "error", result.Error)
		response.InternalError(c, "failed to respond to event")
		return
	}

	if result.RowsAffected == 0 {
		response.NotFound(c, "you are not a participant of this event")
		return
	}

	response.OK(c, gin.H{"message": "response recorded"})
}
