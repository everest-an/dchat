package handlers

import (
	"encoding/json"
	"fmt"
	"log/slog"
	"time"

	"github.com/everest-an/dchat-backend/internal/ai"
	"github.com/everest-an/dchat-backend/internal/models"
	"github.com/everest-an/dchat-backend/internal/response"
	"github.com/everest-an/dchat-backend/internal/transcription"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// MeetingHandler handles meeting recording and transcription endpoints.
type MeetingHandler struct {
	db            *gorm.DB
	aiClient      *ai.Client
	transcriber   *transcription.Service
	log           *slog.Logger
}

// NewMeetingHandler creates a MeetingHandler.
func NewMeetingHandler(db *gorm.DB, aiClient *ai.Client, transcriber *transcription.Service, log *slog.Logger) *MeetingHandler {
	return &MeetingHandler{db: db, aiClient: aiClient, transcriber: transcriber, log: log}
}

// --- Request DTOs ---

type CreateMeetingRequest struct {
	Title        string `json:"title"`
	GroupID      *uint  `json:"group_id"`
	Participants []uint `json:"participants"`
}

type UpdateTranscriptRequest struct {
	Transcript string `json:"transcript" binding:"required"`
	Append     bool   `json:"append"` // true to append, false to replace
}

// --- Handlers ---

// CreateMeeting starts a new meeting record.
// POST /api/meetings
func (h *MeetingHandler) CreateMeeting(c *gin.Context) {
	userID := mustUserID(c)

	var req CreateMeetingRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ValidationError(c, "invalid request")
		return
	}

	if req.Title == "" {
		req.Title = "Meeting " + time.Now().Format("2006-01-02 15:04")
	}

	participantsJSON, _ := json.Marshal(req.Participants)

	meeting := models.Meeting{
		CreatorID:    userID,
		GroupID:      req.GroupID,
		Title:        req.Title,
		Participants: participantsJSON,
		StartedAt:    time.Now(),
		Status:       "active",
	}

	if err := h.db.Create(&meeting).Error; err != nil {
		h.log.Error("failed to create meeting", "error", err)
		response.InternalError(c, "failed to create meeting")
		return
	}

	response.Created(c, meeting)
}

// EndMeeting marks a meeting as ended and calculates duration.
// PUT /api/meetings/:id/end
func (h *MeetingHandler) EndMeeting(c *gin.Context) {
	_ = mustUserID(c)

	id, err := parseUintParam(c, "id")
	if err != nil {
		response.ValidationError(c, "invalid meeting id")
		return
	}

	var meeting models.Meeting
	if err := h.db.First(&meeting, id).Error; err != nil {
		response.NotFound(c, "meeting not found")
		return
	}

	now := time.Now()
	duration := int(now.Sub(meeting.StartedAt).Seconds())

	if err := h.db.Model(&meeting).Updates(map[string]interface{}{
		"ended_at": now,
		"duration": duration,
		"status":   "ended",
	}).Error; err != nil {
		h.log.Error("failed to end meeting", "error", err)
		response.InternalError(c, "failed to end meeting")
		return
	}

	meeting.EndedAt = &now
	meeting.Duration = duration
	meeting.Status = "ended"
	response.OK(c, meeting)
}

// UpdateTranscript updates or appends to the meeting transcript.
// PUT /api/meetings/:id/transcript
func (h *MeetingHandler) UpdateTranscript(c *gin.Context) {
	_ = mustUserID(c)

	id, err := parseUintParam(c, "id")
	if err != nil {
		response.ValidationError(c, "invalid meeting id")
		return
	}

	var req UpdateTranscriptRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ValidationError(c, "transcript is required")
		return
	}

	var meeting models.Meeting
	if err := h.db.First(&meeting, id).Error; err != nil {
		response.NotFound(c, "meeting not found")
		return
	}

	transcript := req.Transcript
	if req.Append && meeting.Transcript != "" {
		transcript = meeting.Transcript + "\n" + req.Transcript
	}

	if err := h.db.Model(&meeting).Update("transcript", transcript).Error; err != nil {
		h.log.Error("failed to update transcript", "error", err)
		response.InternalError(c, "failed to update transcript")
		return
	}

	response.OK(c, gin.H{"message": "transcript updated"})
}

// TranscribeAudio transcribes an uploaded audio file and appends to meeting transcript.
// POST /api/meetings/:id/transcribe
func (h *MeetingHandler) TranscribeAudio(c *gin.Context) {
	_ = mustUserID(c)

	if !h.transcriber.IsConfigured() {
		response.BadRequest(c, "transcription service is not configured")
		return
	}

	id, err := parseUintParam(c, "id")
	if err != nil {
		response.ValidationError(c, "invalid meeting id")
		return
	}

	var meeting models.Meeting
	if err := h.db.First(&meeting, id).Error; err != nil {
		response.NotFound(c, "meeting not found")
		return
	}

	file, header, err := c.Request.FormFile("audio")
	if err != nil {
		response.BadRequest(c, "audio file is required")
		return
	}
	defer file.Close()

	language := c.PostForm("language") // optional language hint

	text, err := h.transcriber.TranscribeAudio(file, header.Filename, language)
	if err != nil {
		h.log.Error("transcription failed", "error", err, "meeting_id", id)
		response.InternalError(c, "transcription failed")
		return
	}

	// Append transcription to meeting transcript.
	transcript := meeting.Transcript
	if transcript != "" {
		transcript += "\n"
	}
	transcript += text

	if err := h.db.Model(&meeting).Update("transcript", transcript).Error; err != nil {
		h.log.Error("failed to save transcription", "error", err)
		response.InternalError(c, "failed to save transcription")
		return
	}

	response.OK(c, gin.H{
		"text":       text,
		"transcript": transcript,
	})
}

// Summarize generates a meeting summary and action items from the transcript using AI.
// POST /api/meetings/:id/summarize
func (h *MeetingHandler) Summarize(c *gin.Context) {
	_ = mustUserID(c)

	if !h.aiClient.IsConfigured() {
		response.BadRequest(c, "AI service is not configured")
		return
	}

	id, err := parseUintParam(c, "id")
	if err != nil {
		response.ValidationError(c, "invalid meeting id")
		return
	}

	var meeting models.Meeting
	if err := h.db.First(&meeting, id).Error; err != nil {
		response.NotFound(c, "meeting not found")
		return
	}

	if meeting.Transcript == "" {
		response.BadRequest(c, "no transcript available to summarize")
		return
	}

	systemPrompt := `You are a meeting notes assistant. Given a meeting transcript, produce:
1. A concise summary (3-5 bullet points capturing key discussions and decisions)
2. A list of action items (tasks assigned during the meeting)

Output as JSON: {"summary": "...", "action_items": ["item1", "item2", ...]}
Keep the same language as the transcript.`

	result, err := h.aiClient.Complete(systemPrompt, meeting.Transcript, 0.3)
	if err != nil {
		h.log.Error("AI summarization failed", "error", err, "meeting_id", id)
		response.InternalError(c, "AI service error")
		return
	}

	// Try to parse structured response.
	var parsed struct {
		Summary     string   `json:"summary"`
		ActionItems []string `json:"action_items"`
	}
	if err := json.Unmarshal([]byte(result), &parsed); err != nil {
		// Fallback: treat entire response as summary.
		parsed.Summary = result
		parsed.ActionItems = []string{}
	}

	actionItemsJSON, _ := json.Marshal(parsed.ActionItems)

	if err := h.db.Model(&meeting).Updates(map[string]interface{}{
		"summary":      parsed.Summary,
		"action_items": string(actionItemsJSON),
	}).Error; err != nil {
		h.log.Error("failed to save meeting summary", "error", err)
		response.InternalError(c, "failed to save summary")
		return
	}

	response.OK(c, gin.H{
		"summary":      parsed.Summary,
		"action_items": parsed.ActionItems,
	})
}

// GetMeeting returns a single meeting.
// GET /api/meetings/:id
func (h *MeetingHandler) GetMeeting(c *gin.Context) {
	_ = mustUserID(c)

	id, err := parseUintParam(c, "id")
	if err != nil {
		response.ValidationError(c, "invalid meeting id")
		return
	}

	var meeting models.Meeting
	if err := h.db.Preload("Creator").First(&meeting, id).Error; err != nil {
		response.NotFound(c, "meeting not found")
		return
	}

	response.OK(c, meeting)
}

// ListMeetings returns paginated meetings for the current user.
// GET /api/meetings
func (h *MeetingHandler) ListMeetings(c *gin.Context) {
	userID := mustUserID(c)
	page, pageSize := parsePagination(c)
	offset := (page - 1) * pageSize

	query := h.db.Model(&models.Meeting{}).
		Where("creator_id = ? OR participants @> ?", userID, json.RawMessage(fmt.Sprintf(`[%d]`, userID)))

	var total int64
	query.Count(&total)

	var meetings []models.Meeting
	if err := query.Order("created_at DESC").
		Offset(offset).Limit(pageSize).
		Preload("Creator").
		Find(&meetings).Error; err != nil {
		h.log.Error("failed to list meetings", "error", err)
		response.InternalError(c, "failed to list meetings")
		return
	}

	response.Paginated(c, meetings, total, page, pageSize)
}
