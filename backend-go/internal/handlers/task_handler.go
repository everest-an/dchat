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

// TaskHandler handles task CRUD endpoints.
type TaskHandler struct {
	db  *gorm.DB
	log *slog.Logger
}

// NewTaskHandler creates a TaskHandler.
func NewTaskHandler(db *gorm.DB, log *slog.Logger) *TaskHandler {
	return &TaskHandler{db: db, log: log}
}

type createTaskReq struct {
	Title           string `json:"title" binding:"required"`
	Description     string `json:"description"`
	AssigneeID      *uint  `json:"assignee_id"`
	GroupID         *uint  `json:"group_id"`
	Priority        string `json:"priority"`
	DueDate         string `json:"due_date"`
	SourceMessageID *uint  `json:"source_message_id"`
}

// CreateTask creates a new task.
// POST /api/tasks
func (h *TaskHandler) CreateTask(c *gin.Context) {
	userID := mustUserID(c)

	var req createTaskReq
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ValidationError(c, "title is required")
		return
	}

	task := models.Task{
		CreatorID:       userID,
		AssigneeID:      req.AssigneeID,
		GroupID:         req.GroupID,
		Title:           req.Title,
		Description:     req.Description,
		Status:          "todo",
		Priority:        coalesce(req.Priority, "medium"),
		SourceMessageID: req.SourceMessageID,
	}

	if req.DueDate != "" {
		t, err := parseTime(req.DueDate)
		if err == nil {
			task.DueDate = &t
		}
	}

	if err := h.db.Create(&task).Error; err != nil {
		h.log.Error("failed to create task", "error", err)
		response.InternalError(c, "failed to create task")
		return
	}

	response.Created(c, task)
}

// GetMyTasks returns tasks created by or assigned to the current user.
// GET /api/tasks?status=&group_id=
func (h *TaskHandler) GetMyTasks(c *gin.Context) {
	userID := mustUserID(c)
	page, pageSize := parsePagination(c)

	q := h.db.Where("creator_id = ? OR assignee_id = ?", userID, userID)

	if status := c.Query("status"); status != "" {
		q = q.Where("status = ?", status)
	}
	if groupID := c.Query("group_id"); groupID != "" {
		q = q.Where("group_id = ?", groupID)
	}

	var total int64
	q.Model(&models.Task{}).Count(&total)

	var tasks []models.Task
	if err := q.Preload("Creator").Preload("Assignee").
		Order("CASE WHEN status='todo' THEN 0 WHEN status='in_progress' THEN 1 ELSE 2 END, due_date ASC NULLS LAST").
		Offset((page - 1) * pageSize).Limit(pageSize).
		Find(&tasks).Error; err != nil {
		h.log.Error("failed to list tasks", "error", err)
		response.InternalError(c, "failed to list tasks")
		return
	}

	response.Paginated(c, tasks, total, page, pageSize)
}

// GetTask returns a single task.
// GET /api/tasks/:id
func (h *TaskHandler) GetTask(c *gin.Context) {
	userID := mustUserID(c)

	taskID, err := parseUintParam(c, "id")
	if err != nil {
		response.ValidationError(c, "invalid task id")
		return
	}

	var task models.Task
	if err := h.db.Preload("Creator").Preload("Assignee").
		First(&task, taskID).Error; err != nil {
		response.NotFound(c, "task not found")
		return
	}

	if task.CreatorID != userID && (task.AssigneeID == nil || *task.AssigneeID != userID) {
		response.Forbidden(c, "access denied")
		return
	}

	response.OK(c, task)
}

type updateTaskReq struct {
	Title       *string `json:"title"`
	Description *string `json:"description"`
	Status      *string `json:"status"`
	Priority    *string `json:"priority"`
	AssigneeID  *uint   `json:"assignee_id"`
	DueDate     *string `json:"due_date"`
}

// UpdateTask updates an existing task.
// PUT /api/tasks/:id
func (h *TaskHandler) UpdateTask(c *gin.Context) {
	userID := mustUserID(c)

	taskID, err := parseUintParam(c, "id")
	if err != nil {
		response.ValidationError(c, "invalid task id")
		return
	}

	var task models.Task
	if err := h.db.First(&task, taskID).Error; err != nil {
		response.NotFound(c, "task not found")
		return
	}

	// Only creator or assignee can update.
	if task.CreatorID != userID && (task.AssigneeID == nil || *task.AssigneeID != userID) {
		response.Forbidden(c, "access denied")
		return
	}

	var req updateTaskReq
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
	if req.Status != nil {
		updates["status"] = *req.Status
	}
	if req.Priority != nil {
		updates["priority"] = *req.Priority
	}
	if req.AssigneeID != nil {
		updates["assignee_id"] = *req.AssigneeID
	}
	if req.DueDate != nil {
		if *req.DueDate == "" {
			updates["due_date"] = nil
		} else if t, err := parseTime(*req.DueDate); err == nil {
			updates["due_date"] = t
		}
	}

	if err := h.db.Model(&task).Updates(updates).Error; err != nil {
		h.log.Error("failed to update task", "error", err)
		response.InternalError(c, "failed to update task")
		return
	}

	h.db.Preload("Creator").Preload("Assignee").First(&task, taskID)
	response.OK(c, task)
}

// DeleteTask deletes a task.
// DELETE /api/tasks/:id
func (h *TaskHandler) DeleteTask(c *gin.Context) {
	userID := mustUserID(c)

	taskID, err := parseUintParam(c, "id")
	if err != nil {
		response.ValidationError(c, "invalid task id")
		return
	}

	result := h.db.Where("id = ? AND creator_id = ?", taskID, userID).Delete(&models.Task{})
	if result.Error != nil {
		h.log.Error("failed to delete task", "error", result.Error)
		response.InternalError(c, "failed to delete task")
		return
	}

	if result.RowsAffected == 0 {
		response.NotFound(c, "task not found or not the creator")
		return
	}

	response.OK(c, gin.H{"message": "task deleted"})
}

// coalesce returns the first non-empty string.
func coalesce(vals ...string) string {
	for _, v := range vals {
		if v != "" {
			return v
		}
	}
	return ""
}

// parseTime tries multiple common date/time formats.
func parseTime(s string) (time.Time, error) {
	formats := []string{
		time.RFC3339,
		"2006-01-02T15:04:05",
		"2006-01-02",
	}
	for _, f := range formats {
		if t, err := time.Parse(f, s); err == nil {
			return t, nil
		}
	}
	return time.Time{}, fmt.Errorf("unable to parse time: %s", s)
}
