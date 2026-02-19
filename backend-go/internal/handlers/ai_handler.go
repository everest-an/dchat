package handlers

import (
	"fmt"
	"log/slog"
	"strings"

	"github.com/everest-an/dchat-backend/internal/ai"
	"github.com/everest-an/dchat-backend/internal/models"
	"github.com/everest-an/dchat-backend/internal/response"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// AIHandler handles AI assistant API endpoints.
type AIHandler struct {
	db     *gorm.DB
	client *ai.Client
	log    *slog.Logger
}

// NewAIHandler creates an AIHandler.
func NewAIHandler(db *gorm.DB, client *ai.Client, log *slog.Logger) *AIHandler {
	return &AIHandler{db: db, client: client, log: log}
}

// --- Request DTOs ---

type SummarizeRequest struct {
	MessageIDs []uint `json:"message_ids" binding:"required"`
}

type SuggestReplyRequest struct {
	MessageIDs []uint `json:"message_ids" binding:"required"`
}

type TranslateRequest struct {
	Text       string `json:"text" binding:"required"`
	TargetLang string `json:"target_lang" binding:"required"`
}

type DraftRequest struct {
	Prompt string `json:"prompt" binding:"required"`
}

// --- Handlers ---

// Summarize generates a summary from a set of messages.
// POST /api/ai/summarize
func (h *AIHandler) Summarize(c *gin.Context) {
	if !h.client.IsConfigured() {
		response.BadRequest(c, "AI service is not configured")
		return
	}

	var req SummarizeRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ValidationError(c, "message_ids is required")
		return
	}

	if len(req.MessageIDs) > 100 {
		response.BadRequest(c, "maximum 100 messages per summary")
		return
	}

	// Fetch messages.
	var messages []models.Message
	if err := h.db.Where("id IN ?", req.MessageIDs).
		Order("created_at ASC").
		Preload("Sender").
		Find(&messages).Error; err != nil {
		h.log.Error("failed to fetch messages for summary", "error", err)
		response.InternalError(c, "failed to fetch messages")
		return
	}

	if len(messages) == 0 {
		response.BadRequest(c, "no messages found")
		return
	}

	// Build conversation text.
	var sb strings.Builder
	for _, m := range messages {
		name := m.Sender.Username
		if name == "" {
			name = m.Sender.WalletAddress
		}
		sb.WriteString(fmt.Sprintf("[%s] %s: %s\n", m.CreatedAt.Format("15:04"), name, m.Content))
	}

	result, err := h.client.Complete(ai.SummarizeSystemPrompt, sb.String(), 0.3)
	if err != nil {
		h.log.Error("AI summarize failed", "error", err)
		response.InternalError(c, "AI service error")
		return
	}

	response.OK(c, gin.H{"summary": result})
}

// SuggestReply generates reply suggestions based on recent messages.
// POST /api/ai/suggest-reply
func (h *AIHandler) SuggestReply(c *gin.Context) {
	if !h.client.IsConfigured() {
		response.BadRequest(c, "AI service is not configured")
		return
	}

	var req SuggestReplyRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ValidationError(c, "message_ids is required")
		return
	}

	if len(req.MessageIDs) > 20 {
		response.BadRequest(c, "maximum 20 messages for reply suggestions")
		return
	}

	userID := mustUserID(c)

	var messages []models.Message
	if err := h.db.Where("id IN ?", req.MessageIDs).
		Order("created_at ASC").
		Preload("Sender").
		Find(&messages).Error; err != nil {
		h.log.Error("failed to fetch messages for reply", "error", err)
		response.InternalError(c, "failed to fetch messages")
		return
	}

	var sb strings.Builder
	for _, m := range messages {
		role := "Other"
		if m.SenderID == userID {
			role = "Me"
		}
		sb.WriteString(fmt.Sprintf("%s: %s\n", role, m.Content))
	}

	result, err := h.client.Complete(ai.SuggestReplySystemPrompt, sb.String(), 0.7)
	if err != nil {
		h.log.Error("AI suggest reply failed", "error", err)
		response.InternalError(c, "AI service error")
		return
	}

	response.OK(c, gin.H{"suggestions": result})
}

// Translate translates a text to the target language.
// POST /api/ai/translate
func (h *AIHandler) Translate(c *gin.Context) {
	if !h.client.IsConfigured() {
		response.BadRequest(c, "AI service is not configured")
		return
	}

	var req TranslateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ValidationError(c, "text and target_lang are required")
		return
	}

	if len(req.Text) > 5000 {
		response.BadRequest(c, "text too long (max 5000 characters)")
		return
	}

	userMsg := fmt.Sprintf("Translate to %s:\n\n%s", req.TargetLang, req.Text)
	result, err := h.client.Complete(ai.TranslateSystemPrompt, userMsg, 0.2)
	if err != nil {
		h.log.Error("AI translate failed", "error", err)
		response.InternalError(c, "AI service error")
		return
	}

	response.OK(c, gin.H{"translation": result})
}

// Draft generates a message draft based on user instructions.
// POST /api/ai/draft
func (h *AIHandler) Draft(c *gin.Context) {
	if !h.client.IsConfigured() {
		response.BadRequest(c, "AI service is not configured")
		return
	}

	var req DraftRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ValidationError(c, "prompt is required")
		return
	}

	if len(req.Prompt) > 2000 {
		response.BadRequest(c, "prompt too long (max 2000 characters)")
		return
	}

	result, err := h.client.Complete(ai.DraftSystemPrompt, req.Prompt, 0.5)
	if err != nil {
		h.log.Error("AI draft failed", "error", err)
		response.InternalError(c, "AI service error")
		return
	}

	response.OK(c, gin.H{"draft": result})
}
