package handlers

import (
	"log/slog"
	"math"
	"sort"
	"strconv"
	"strings"

	"github.com/everest-an/dchat-backend/internal/models"
	"github.com/everest-an/dchat-backend/internal/response"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// MatchingHandler handles smart matching endpoints.
type MatchingHandler struct {
	db  *gorm.DB
	log *slog.Logger
}

// NewMatchingHandler creates a MatchingHandler.
func NewMatchingHandler(db *gorm.DB, log *slog.Logger) *MatchingHandler {
	return &MatchingHandler{db: db, log: log}
}

// MatchResult represents a single match recommendation.
type MatchResult struct {
	User       simpleUser `json:"user"`
	Score      float64    `json:"score"`
	Reasons    []string   `json:"reasons"`
	CommonTags []string   `json:"common_tags"`
}

type simpleUser struct {
	ID            uint   `json:"id"`
	Name          string `json:"name"`
	Username      string `json:"username"`
	Company       string `json:"company"`
	Position      string `json:"position"`
	WalletAddress string `json:"wallet_address"`
}

// GetRecommendations returns matching recommendations for the current user.
// GET /api/matching/recommendations?limit=20
func (h *MatchingHandler) GetRecommendations(c *gin.Context) {
	userID := mustUserID(c)

	var currentUser models.User
	if err := h.db.First(&currentUser, userID).Error; err != nil {
		response.NotFound(c, "user not found")
		return
	}

	// Get all other users (in production, you'd filter and page this).
	var candidates []models.User
	h.db.Where("id != ? AND is_banned = ?", userID, false).
		Limit(200).Find(&candidates)

	// Score each candidate.
	var results []MatchResult
	for _, cand := range candidates {
		score, reasons, tags := h.computeScore(&currentUser, &cand)
		if score > 0 {
			results = append(results, MatchResult{
				User: simpleUser{
					ID:            cand.ID,
					Name:          cand.Name,
					Username:      cand.Username,
					Company:       cand.Company,
					Position:      cand.Position,
					WalletAddress: cand.WalletAddress,
				},
				Score:      math.Round(score*100) / 100,
				Reasons:    reasons,
				CommonTags: tags,
			})
		}
	}

	// Sort by score descending.
	sort.Slice(results, func(i, j int) bool {
		return results[i].Score > results[j].Score
	})

	limit := 20
	if l := c.Query("limit"); l != "" {
		if v, err := strconv.Atoi(l); err == nil && v > 0 {
			limit = v
		}
	}
	if limit > len(results) {
		limit = len(results)
	}

	response.OK(c, gin.H{
		"recommendations": results[:limit],
		"total":           len(results),
	})
}

// computeScore calculates matching score between two users.
func (h *MatchingHandler) computeScore(user, candidate *models.User) (float64, []string, []string) {
	var score float64
	var reasons []string
	var commonTags []string

	// Industry/company match.
	if user.Company != "" && candidate.Company != "" {
		if strings.EqualFold(user.Company, candidate.Company) {
			score += 3.0
			reasons = append(reasons, "Same company")
		}
	}

	// Position/role similarity.
	if user.Position != "" && candidate.Position != "" {
		if containsAny(strings.ToLower(user.Position), strings.ToLower(candidate.Position)) {
			score += 2.0
			reasons = append(reasons, "Similar role")
		}
	}

	// Skills/tags matching (stored in Bio field as comma-separated).
	// Use Position field for tag-like matching (e.g. "Senior Developer, Blockchain").
	userTags := parseTags(user.Position)
	candTags := parseTags(candidate.Position)
	for _, ut := range userTags {
		for _, ct := range candTags {
			if strings.EqualFold(ut, ct) {
				commonTags = append(commonTags, ut)
				score += 1.5
			}
		}
	}
	if len(commonTags) > 0 {
		reasons = append(reasons, "Shared skills/interests")
	}

	// Activity bonus: users who have recent messages are more active.
	var msgCount int64
	h.db.Model(&models.Message{}).Where("sender_id = ?", candidate.ID).Count(&msgCount)
	if msgCount > 10 {
		score += 1.0
		reasons = append(reasons, "Active user")
	}

	// Normalize to 0-100 scale.
	score = math.Min(score/10.0*100, 100)

	return score, reasons, commonTags
}

// RecordFeedback records user feedback on a recommendation.
// POST /api/matching/feedback
func (h *MatchingHandler) RecordFeedback(c *gin.Context) {
	userID := mustUserID(c)

	var req struct {
		TargetUserID uint   `json:"target_user_id" binding:"required"`
		Action       string `json:"action" binding:"required"` // "interested", "not_interested", "connected"
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ValidationError(c, "target_user_id and action are required")
		return
	}

	h.log.Info("matching feedback recorded",
		"user_id", userID,
		"target_user_id", req.TargetUserID,
		"action", req.Action,
	)

	response.OK(c, gin.H{"message": "feedback recorded"})
}

func parseTags(bio string) []string {
	if bio == "" {
		return nil
	}
	var tags []string
	for _, t := range strings.Split(bio, ",") {
		t = strings.TrimSpace(t)
		if t != "" {
			tags = append(tags, t)
		}
	}
	return tags
}

func containsAny(a, b string) bool {
	aWords := strings.Fields(a)
	bWords := strings.Fields(b)
	for _, aw := range aWords {
		for _, bw := range bWords {
			if aw == bw && len(aw) > 2 {
				return true
			}
		}
	}
	return false
}
