package handlers

import (
	"crypto/rand"
	"encoding/hex"
	"log/slog"

	"github.com/everest-an/dchat-backend/internal/models"
	"github.com/everest-an/dchat-backend/internal/response"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// BotHandler handles bot and webhook endpoints.
type BotHandler struct {
	db  *gorm.DB
	log *slog.Logger
}

// NewBotHandler creates a BotHandler.
func NewBotHandler(db *gorm.DB, log *slog.Logger) *BotHandler {
	return &BotHandler{db: db, log: log}
}

// CreateBot registers a new bot.
// POST /api/bots
func (h *BotHandler) CreateBot(c *gin.Context) {
	userID := mustUserID(c)

	var bot models.Bot
	if err := c.ShouldBindJSON(&bot); err != nil {
		response.ValidationError(c, "name is required")
		return
	}

	bot.OwnerID = userID
	bot.Status = "active"
	bot.SecretKey = generateHexToken(32)
	bot.APIToken = generateHexToken(64)

	if err := h.db.Create(&bot).Error; err != nil {
		h.log.Error("failed to create bot", "error", err)
		response.InternalError(c, "failed to create bot")
		return
	}

	// Return the API token only on creation.
	response.Created(c, gin.H{
		"bot":       bot,
		"api_token": bot.APIToken,
		"secret":    bot.SecretKey,
	})
}

// ListBots returns the user's bots.
// GET /api/bots
func (h *BotHandler) ListBots(c *gin.Context) {
	userID := mustUserID(c)

	var bots []models.Bot
	if err := h.db.Where("owner_id = ?", userID).Order("created_at DESC").Find(&bots).Error; err != nil {
		h.log.Error("failed to list bots", "error", err)
		response.InternalError(c, "failed to list bots")
		return
	}

	response.OK(c, bots)
}

// GetBot returns a single bot.
// GET /api/bots/:id
func (h *BotHandler) GetBot(c *gin.Context) {
	userID := mustUserID(c)
	id, err := parseUintParam(c, "id")
	if err != nil {
		response.ValidationError(c, "invalid bot id")
		return
	}

	var bot models.Bot
	if err := h.db.Where("id = ? AND owner_id = ?", id, userID).First(&bot).Error; err != nil {
		response.NotFound(c, "bot not found")
		return
	}

	response.OK(c, bot)
}

// UpdateBot updates a bot's configuration.
// PUT /api/bots/:id
func (h *BotHandler) UpdateBot(c *gin.Context) {
	userID := mustUserID(c)
	id, err := parseUintParam(c, "id")
	if err != nil {
		response.ValidationError(c, "invalid bot id")
		return
	}

	var bot models.Bot
	if err := h.db.Where("id = ? AND owner_id = ?", id, userID).First(&bot).Error; err != nil {
		response.NotFound(c, "bot not found")
		return
	}

	var updates map[string]interface{}
	if err := c.ShouldBindJSON(&updates); err != nil {
		response.ValidationError(c, "invalid request body")
		return
	}
	// Prevent overwriting sensitive fields.
	delete(updates, "id")
	delete(updates, "owner_id")
	delete(updates, "secret_key")
	delete(updates, "api_token")

	if err := h.db.Model(&bot).Updates(updates).Error; err != nil {
		h.log.Error("failed to update bot", "error", err)
		response.InternalError(c, "failed to update bot")
		return
	}

	h.db.First(&bot, id)
	response.OK(c, bot)
}

// DeleteBot deletes a bot.
// DELETE /api/bots/:id
func (h *BotHandler) DeleteBot(c *gin.Context) {
	userID := mustUserID(c)
	id, err := parseUintParam(c, "id")
	if err != nil {
		response.ValidationError(c, "invalid bot id")
		return
	}

	result := h.db.Where("id = ? AND owner_id = ?", id, userID).Delete(&models.Bot{})
	if result.RowsAffected == 0 {
		response.NotFound(c, "bot not found")
		return
	}

	// Also clean up events.
	h.db.Where("bot_id = ?", id).Delete(&models.BotEvent{})

	response.OK(c, gin.H{"message": "bot deleted"})
}

// RegenerateToken regenerates a bot's API token.
// POST /api/bots/:id/regenerate-token
func (h *BotHandler) RegenerateToken(c *gin.Context) {
	userID := mustUserID(c)
	id, err := parseUintParam(c, "id")
	if err != nil {
		response.ValidationError(c, "invalid bot id")
		return
	}

	var bot models.Bot
	if err := h.db.Where("id = ? AND owner_id = ?", id, userID).First(&bot).Error; err != nil {
		response.NotFound(c, "bot not found")
		return
	}

	newToken := generateHexToken(64)
	if err := h.db.Model(&bot).Update("api_token", newToken).Error; err != nil {
		h.log.Error("failed to regenerate token", "error", err)
		response.InternalError(c, "failed to regenerate token")
		return
	}

	response.OK(c, gin.H{"api_token": newToken})
}

// GetBotEvents returns recent webhook delivery events.
// GET /api/bots/:id/events
func (h *BotHandler) GetBotEvents(c *gin.Context) {
	userID := mustUserID(c)
	id, err := parseUintParam(c, "id")
	if err != nil {
		response.ValidationError(c, "invalid bot id")
		return
	}

	// Verify ownership.
	var bot models.Bot
	if err := h.db.Where("id = ? AND owner_id = ?", id, userID).First(&bot).Error; err != nil {
		response.NotFound(c, "bot not found")
		return
	}

	var events []models.BotEvent
	if err := h.db.Where("bot_id = ?", id).Order("created_at DESC").Limit(50).Find(&events).Error; err != nil {
		h.log.Error("failed to get bot events", "error", err)
		response.InternalError(c, "failed to get bot events")
		return
	}

	response.OK(c, events)
}

func generateHexToken(byteLen int) string {
	b := make([]byte, byteLen)
	rand.Read(b)
	return hex.EncodeToString(b)
}
