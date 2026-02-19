package handlers

import (
	"log/slog"

	"github.com/everest-an/dchat-backend/internal/models"
	"github.com/everest-an/dchat-backend/internal/response"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// MentionHandler handles @mention-related API endpoints.
type MentionHandler struct {
	db  *gorm.DB
	log *slog.Logger
}

// NewMentionHandler creates a MentionHandler.
func NewMentionHandler(db *gorm.DB, log *slog.Logger) *MentionHandler {
	return &MentionHandler{db: db, log: log}
}

// GetUnreadMentions returns all unread @mentions for the current user.
// GET /api/mentions/unread
func (h *MentionHandler) GetUnreadMentions(c *gin.Context) {
	userID := mustUserID(c)
	page, pageSize := parsePagination(c)
	offset := (page - 1) * pageSize

	query := h.db.Model(&models.Mention{}).
		Where("(mentioned_user_id = ? OR is_all = true) AND read = false", userID)

	var total int64
	query.Count(&total)

	var mentions []models.Mention
	err := query.
		Order("created_at DESC").
		Offset(offset).
		Limit(pageSize).
		Preload("Message").
		Preload("Message.Sender").
		Preload("Group").
		Find(&mentions).Error

	if err != nil {
		h.log.Error("failed to get unread mentions", "error", err, "user", userID)
		response.InternalError(c, "failed to get unread mentions")
		return
	}

	response.Paginated(c, mentions, total, page, pageSize)
}

// GetUnreadMentionCount returns the count of unread @mentions.
// GET /api/mentions/unread/count
func (h *MentionHandler) GetUnreadMentionCount(c *gin.Context) {
	userID := mustUserID(c)

	var count int64
	h.db.Model(&models.Mention{}).
		Where("(mentioned_user_id = ? OR is_all = true) AND read = false", userID).
		Count(&count)

	response.OK(c, gin.H{"count": count})
}

// MarkMentionRead marks a single mention as read.
// PUT /api/mentions/:id/read
func (h *MentionHandler) MarkMentionRead(c *gin.Context) {
	userID := mustUserID(c)

	mentionID, err := parseUintParam(c, "id")
	if err != nil {
		response.ValidationError(c, "invalid mention id")
		return
	}

	var mention models.Mention
	if err := h.db.First(&mention, mentionID).Error; err != nil {
		response.NotFound(c, "mention not found")
		return
	}

	// Only the mentioned user (or @all member) can mark as read.
	if mention.MentionedUserID != nil && *mention.MentionedUserID != userID {
		response.Forbidden(c, "not your mention")
		return
	}

	if err := h.db.Model(&mention).Update("read", true).Error; err != nil {
		h.log.Error("failed to mark mention read", "error", err, "id", mentionID)
		response.InternalError(c, "failed to mark mention as read")
		return
	}

	response.OK(c, gin.H{"message": "mention marked as read"})
}

// MarkAllMentionsRead marks all unread mentions as read for the current user.
// PUT /api/mentions/read-all
func (h *MentionHandler) MarkAllMentionsRead(c *gin.Context) {
	userID := mustUserID(c)

	err := h.db.Model(&models.Mention{}).
		Where("(mentioned_user_id = ? OR is_all = true) AND read = false", userID).
		Update("read", true).Error

	if err != nil {
		h.log.Error("failed to mark all mentions read", "error", err, "user", userID)
		response.InternalError(c, "failed to mark all mentions as read")
		return
	}

	response.OK(c, gin.H{"message": "all mentions marked as read"})
}

// CreateMentionsForMessage parses mention data and creates mention records.
// Called internally when a group message is sent.
func (h *MentionHandler) CreateMentionsForMessage(messageID, groupID uint, mentions []uint, isAll bool) {
	if isAll {
		// @all: create one record with is_all=true
		mention := models.Mention{
			MessageID: messageID,
			GroupID:   groupID,
			IsAll:     true,
		}
		if err := h.db.Create(&mention).Error; err != nil {
			h.log.Error("failed to create @all mention", "error", err, "message", messageID)
		}
		return
	}

	for _, uid := range mentions {
		mention := models.Mention{
			MessageID:       messageID,
			GroupID:         groupID,
			MentionedUserID: &uid,
		}
		if err := h.db.Create(&mention).Error; err != nil {
			h.log.Error("failed to create mention", "error", err, "message", messageID, "user", uid)
		}
	}
}
