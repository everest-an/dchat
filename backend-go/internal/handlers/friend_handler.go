package handlers

import (
	"log/slog"

	"github.com/everest-an/dchat-backend/internal/models"
	"github.com/everest-an/dchat-backend/internal/response"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// FriendHandler handles friend-related endpoints.
type FriendHandler struct {
	db  *gorm.DB
	log *slog.Logger
}

// NewFriendHandler creates a FriendHandler.
func NewFriendHandler(db *gorm.DB, log *slog.Logger) *FriendHandler {
	return &FriendHandler{db: db, log: log}
}

// ─── Friend Requests ────────────────────────────────────────────────────────

// SendFriendRequest sends a friend request.
// POST /api/friends/request
func (h *FriendHandler) SendFriendRequest(c *gin.Context) {
	senderID := mustUserID(c)

	var req struct {
		ReceiverID uint   `json:"receiver_id" binding:"required"`
		Message    string `json:"message"`
		Source     string `json:"source"` // search, nfc, qrcode, invite
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ValidationError(c, "receiver_id is required")
		return
	}

	if senderID == req.ReceiverID {
		response.BadRequest(c, "cannot send friend request to yourself")
		return
	}

	// Check if receiver exists.
	var receiver models.User
	if err := h.db.First(&receiver, req.ReceiverID).Error; err != nil {
		response.NotFound(c, "user not found")
		return
	}

	// Check if already friends.
	var existing models.Friendship
	if err := h.db.Where("user_id = ? AND friend_id = ?", senderID, req.ReceiverID).First(&existing).Error; err == nil {
		response.Conflict(c, "already friends")
		return
	}

	// Check for existing pending request.
	var pendingReq models.FriendRequest
	if err := h.db.Where("sender_id = ? AND receiver_id = ? AND status = ?",
		senderID, req.ReceiverID, models.FriendReqPending).First(&pendingReq).Error; err == nil {
		response.Conflict(c, "friend request already sent")
		return
	}

	// Check if the other user already sent a request to us — auto-accept.
	var reverseReq models.FriendRequest
	if err := h.db.Where("sender_id = ? AND receiver_id = ? AND status = ?",
		req.ReceiverID, senderID, models.FriendReqPending).First(&reverseReq).Error; err == nil {
		return
	}

	source := req.Source
	if source == "" {
		source = "search"
	}

	friendReq := models.FriendRequest{
		SenderID:   senderID,
		ReceiverID: req.ReceiverID,
		Message:    req.Message,
		Status:     models.FriendReqPending,
		Source:     source,
	}

	if err := h.db.Create(&friendReq).Error; err != nil {
		h.log.Error("failed to create friend request", "error", err)
		response.InternalError(c, "failed to send friend request")
		return
	}

	h.db.Preload("Sender").Preload("Receiver").First(&friendReq, friendReq.ID)
	response.Created(c, friendReq)
}

// SendFriendRequestByWallet sends a friend request by wallet address (for NFC/QR).
// POST /api/friends/request-by-wallet
func (h *FriendHandler) SendFriendRequestByWallet(c *gin.Context) {
	senderID := mustUserID(c)

	var req struct {
		WalletAddress string `json:"wallet_address" binding:"required"`
		Message       string `json:"message"`
		Source        string `json:"source"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ValidationError(c, "wallet_address is required")
		return
	}

	var receiver models.User
	if err := h.db.Where("wallet_address = ?", req.WalletAddress).First(&receiver).Error; err != nil {
		response.NotFound(c, "user with this wallet address not found")
		return
	}

	if senderID == receiver.ID {
		response.BadRequest(c, "cannot send friend request to yourself")
		return
	}

	// Check if already friends.
	var existing models.Friendship
	if err := h.db.Where("user_id = ? AND friend_id = ?", senderID, receiver.ID).First(&existing).Error; err == nil {
		response.Conflict(c, "already friends")
		return
	}

	source := req.Source
	if source == "" {
		source = "nfc"
	}

	friendReq := models.FriendRequest{
		SenderID:   senderID,
		ReceiverID: receiver.ID,
		Message:    req.Message,
		Status:     models.FriendReqPending,
		Source:     source,
	}

	if err := h.db.Create(&friendReq).Error; err != nil {
		h.log.Error("failed to create friend request", "error", err)
		response.InternalError(c, "failed to send friend request")
		return
	}

	h.db.Preload("Sender").Preload("Receiver").First(&friendReq, friendReq.ID)
	response.Created(c, friendReq)
}

// ListFriendRequests returns pending friend requests for the authenticated user.
// GET /api/friends/requests?direction=received|sent
func (h *FriendHandler) ListFriendRequests(c *gin.Context) {
	userID := mustUserID(c)
	direction := c.DefaultQuery("direction", "received")

	var requests []models.FriendRequest
	query := h.db.Preload("Sender").Preload("Receiver")

	if direction == "sent" {
		query = query.Where("sender_id = ? AND status = ?", userID, models.FriendReqPending)
	} else {
		query = query.Where("receiver_id = ? AND status = ?", userID, models.FriendReqPending)
	}

	if err := query.Order("created_at DESC").Find(&requests).Error; err != nil {
		h.log.Error("failed to list friend requests", "error", err)
		response.InternalError(c, "failed to list friend requests")
		return
	}
	response.OK(c, requests)
}

// AcceptFriendRequest accepts a pending friend request.
// POST /api/friends/requests/:id/accept
func (h *FriendHandler) AcceptFriendRequest(c *gin.Context) {
	userID := mustUserID(c)
	reqID, err := parseUintParam(c, "id")
	if err != nil {
		response.ValidationError(c, "invalid request id")
		return
	}

	var friendReq models.FriendRequest
	if err := h.db.First(&friendReq, reqID).Error; err != nil {
		response.NotFound(c, "friend request not found")
		return
	}

	if friendReq.ReceiverID != userID {
		response.Forbidden(c, "you can only accept requests sent to you")
		return
	}

	if friendReq.Status != models.FriendReqPending {
		response.BadRequest(c, "request is no longer pending")
		return
	}

	// Use transaction to update request and create bidirectional friendship.
	err = h.db.Transaction(func(tx *gorm.DB) error {
		friendReq.Status = models.FriendReqAccepted
		if err := tx.Save(&friendReq).Error; err != nil {
			return err
		}

		friendships := []models.Friendship{
			{UserID: friendReq.SenderID, FriendID: friendReq.ReceiverID},
			{UserID: friendReq.ReceiverID, FriendID: friendReq.SenderID},
		}
		for _, f := range friendships {
			if err := tx.Create(&f).Error; err != nil {
				return err
			}
		}
		return nil
	})

	if err != nil {
		h.log.Error("failed to accept friend request", "error", err)
		response.InternalError(c, "failed to accept friend request")
		return
	}

	response.OK(c, gin.H{"message": "friend request accepted"})
}

// RejectFriendRequest rejects a pending friend request.
// POST /api/friends/requests/:id/reject
func (h *FriendHandler) RejectFriendRequest(c *gin.Context) {
	userID := mustUserID(c)
	reqID, err := parseUintParam(c, "id")
	if err != nil {
		response.ValidationError(c, "invalid request id")
		return
	}

	var friendReq models.FriendRequest
	if err := h.db.First(&friendReq, reqID).Error; err != nil {
		response.NotFound(c, "friend request not found")
		return
	}

	if friendReq.ReceiverID != userID {
		response.Forbidden(c, "you can only reject requests sent to you")
		return
	}

	if friendReq.Status != models.FriendReqPending {
		response.BadRequest(c, "request is no longer pending")
		return
	}

	friendReq.Status = models.FriendReqRejected
	if err := h.db.Save(&friendReq).Error; err != nil {
		h.log.Error("failed to reject friend request", "error", err)
		response.InternalError(c, "failed to reject friend request")
		return
	}

	response.OK(c, gin.H{"message": "friend request rejected"})
}

// ─── Friends List ───────────────────────────────────────────────────────────

// ListFriends returns the authenticated user's friends.
// GET /api/friends
func (h *FriendHandler) ListFriends(c *gin.Context) {
	userID := mustUserID(c)

	var friendships []models.Friendship
	if err := h.db.Preload("Friend").Where("user_id = ?", userID).
		Order("created_at DESC").Find(&friendships).Error; err != nil {
		h.log.Error("failed to list friends", "error", err)
		response.InternalError(c, "failed to list friends")
		return
	}

	response.OK(c, friendships)
}

// RemoveFriend removes a friend (bidirectional).
// DELETE /api/friends/:id
func (h *FriendHandler) RemoveFriend(c *gin.Context) {
	userID := mustUserID(c)
	friendID, err := parseUintParam(c, "id")
	if err != nil {
		response.ValidationError(c, "invalid friend id")
		return
	}

	err = h.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Where("user_id = ? AND friend_id = ?", userID, friendID).
			Delete(&models.Friendship{}).Error; err != nil {
			return err
		}
		if err := tx.Where("user_id = ? AND friend_id = ?", friendID, userID).
			Delete(&models.Friendship{}).Error; err != nil {
			return err
		}
		return nil
	})

	if err != nil {
		h.log.Error("failed to remove friend", "error", err)
		response.InternalError(c, "failed to remove friend")
		return
	}

	response.NoContent(c)
}

// SearchUsers searches for users by name, username, or wallet address.
// GET /api/friends/search?q=xxx
func (h *FriendHandler) SearchUsers(c *gin.Context) {
	userID := mustUserID(c)
	q := c.Query("q")
	if q == "" {
		response.ValidationError(c, "search query is required")
		return
	}

	var users []models.User
	search := "%" + q + "%"
	if err := h.db.Where("id != ? AND (name ILIKE ? OR username ILIKE ? OR wallet_address ILIKE ?)",
		userID, search, search, search).
		Limit(20).Find(&users).Error; err != nil {
		h.log.Error("failed to search users", "error", err)
		response.InternalError(c, "failed to search users")
		return
	}

	response.OK(c, users)
}

// InviteFriend sends an invitation via email/phone.
// POST /api/account/invite-friend
func (h *FriendHandler) InviteFriend(c *gin.Context) {
	var req struct {
		InviterAddress    string `json:"inviter_address" binding:"required"`
		InviteeIdentifier string `json:"invitee_identifier" binding:"required"`
		Type              string `json:"type"` // email or phone
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ValidationError(c, "inviter_address and invitee_identifier are required")
		return
	}

	// In production, this would send an email/SMS. For now, log and return success.
	h.log.Info("friend invitation sent",
		"inviter", req.InviterAddress,
		"invitee", req.InviteeIdentifier,
		"type", req.Type,
	)

	response.OK(c, gin.H{
		"message": "invitation sent",
		"invitee": req.InviteeIdentifier,
	})
}
