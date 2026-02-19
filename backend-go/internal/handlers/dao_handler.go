package handlers

import (
	"log/slog"
	"time"

	"github.com/everest-an/dchat-backend/internal/models"
	"github.com/everest-an/dchat-backend/internal/response"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// DAOHandler handles DAO governance endpoints.
type DAOHandler struct {
	db  *gorm.DB
	log *slog.Logger
}

// NewDAOHandler creates a DAOHandler.
func NewDAOHandler(db *gorm.DB, log *slog.Logger) *DAOHandler {
	return &DAOHandler{db: db, log: log}
}

// CreateProposal creates a new governance proposal.
// POST /api/dao/proposals
func (h *DAOHandler) CreateProposal(c *gin.Context) {
	userID := mustUserID(c)

	var req struct {
		Title       string `json:"title" binding:"required"`
		Description string `json:"description" binding:"required"`
		Category    string `json:"category"`
		Quorum      int    `json:"quorum"`
		DurationDays int   `json:"duration_days"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ValidationError(c, "title and description are required")
		return
	}

	duration := 7
	if req.DurationDays > 0 {
		duration = req.DurationDays
	}

	proposal := models.Proposal{
		CreatorID:   userID,
		Title:       req.Title,
		Description: req.Description,
		Category:    coalesce(req.Category, "general"),
		Status:      "active",
		Quorum:      max(req.Quorum, 1),
		EndsAt:      time.Now().AddDate(0, 0, duration),
	}

	if err := h.db.Create(&proposal).Error; err != nil {
		h.log.Error("failed to create proposal", "error", err)
		response.InternalError(c, "failed to create proposal")
		return
	}

	response.Created(c, proposal)
}

// ListProposals returns proposals with filters.
// GET /api/dao/proposals?status=&category=
func (h *DAOHandler) ListProposals(c *gin.Context) {
	page, pageSize := parsePagination(c)

	q := h.db.Model(&models.Proposal{})

	if status := c.Query("status"); status != "" {
		q = q.Where("status = ?", status)
	}
	if cat := c.Query("category"); cat != "" {
		q = q.Where("category = ?", cat)
	}

	var total int64
	q.Count(&total)

	var proposals []models.Proposal
	if err := q.Preload("Creator").
		Order("created_at DESC").
		Offset((page - 1) * pageSize).Limit(pageSize).
		Find(&proposals).Error; err != nil {
		h.log.Error("failed to list proposals", "error", err)
		response.InternalError(c, "failed to list proposals")
		return
	}

	response.Paginated(c, proposals, total, page, pageSize)
}

// GetProposal returns a single proposal with votes.
// GET /api/dao/proposals/:id
func (h *DAOHandler) GetProposal(c *gin.Context) {
	id, err := parseUintParam(c, "id")
	if err != nil {
		response.ValidationError(c, "invalid proposal id")
		return
	}

	var proposal models.Proposal
	if err := h.db.Preload("Creator").Preload("Votes.Voter").
		First(&proposal, id).Error; err != nil {
		response.NotFound(c, "proposal not found")
		return
	}

	response.OK(c, proposal)
}

// CastVote casts a vote on a proposal.
// POST /api/dao/proposals/:id/vote
func (h *DAOHandler) CastVote(c *gin.Context) {
	userID := mustUserID(c)

	proposalID, err := parseUintParam(c, "id")
	if err != nil {
		response.ValidationError(c, "invalid proposal id")
		return
	}

	var req struct {
		Choice string `json:"choice" binding:"required"` // for, against
		Weight int    `json:"weight"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ValidationError(c, "choice is required (for or against)")
		return
	}

	if req.Choice != "for" && req.Choice != "against" {
		response.ValidationError(c, "choice must be 'for' or 'against'")
		return
	}

	var proposal models.Proposal
	if err := h.db.First(&proposal, proposalID).Error; err != nil {
		response.NotFound(c, "proposal not found")
		return
	}

	if proposal.Status != "active" {
		response.ValidationError(c, "proposal is no longer active")
		return
	}
	if time.Now().After(proposal.EndsAt) {
		response.ValidationError(c, "voting period has ended")
		return
	}

	weight := max(req.Weight, 1)

	vote := models.Vote{
		ProposalID: proposalID,
		VoterID:    userID,
		Choice:     req.Choice,
		Weight:     weight,
	}

	if err := h.db.Create(&vote).Error; err != nil {
		response.ValidationError(c, "you have already voted on this proposal")
		return
	}

	// Update vote counts.
	if req.Choice == "for" {
		h.db.Model(&proposal).Update("votes_for", gorm.Expr("votes_for + ?", weight))
	} else {
		h.db.Model(&proposal).Update("votes_against", gorm.Expr("votes_against + ?", weight))
	}

	response.Created(c, vote)
}

// GetTreasury returns treasury transactions.
// GET /api/dao/treasury
func (h *DAOHandler) GetTreasury(c *gin.Context) {
	page, pageSize := parsePagination(c)

	var total int64
	h.db.Model(&models.TreasuryTransaction{}).Count(&total)

	var txs []models.TreasuryTransaction
	if err := h.db.Order("created_at DESC").
		Offset((page - 1) * pageSize).Limit(pageSize).
		Find(&txs).Error; err != nil {
		h.log.Error("failed to list treasury transactions", "error", err)
		response.InternalError(c, "failed to list treasury transactions")
		return
	}

	response.Paginated(c, txs, total, page, pageSize)
}

func max(a, b int) int {
	if a > b {
		return a
	}
	return b
}
