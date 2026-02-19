package handlers

import (
	"log/slog"
	"time"

	"github.com/everest-an/dchat-backend/internal/models"
	"github.com/everest-an/dchat-backend/internal/response"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// GroupHandler handles group-related API endpoints.
type GroupHandler struct {
	db  *gorm.DB
	log *slog.Logger
}

// NewGroupHandler creates a GroupHandler.
func NewGroupHandler(db *gorm.DB, log *slog.Logger) *GroupHandler {
	return &GroupHandler{db: db, log: log}
}

// --- Group CRUD ---

// CreateGroupRequest is the body for POST /api/groups.
type CreateGroupRequest struct {
	Name            string `json:"name" binding:"required"`
	Description     string `json:"description"`
	AvatarURL       string `json:"avatar_url"`
	IsPublic        bool   `json:"is_public"`
	RequireApproval bool   `json:"require_approval"`
}

// CreateGroup creates a new group and adds the creator as owner.
func (h *GroupHandler) CreateGroup(c *gin.Context) {
	userID := mustUserID(c)

	var req CreateGroupRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ValidationError(c, "name is required")
		return
	}

	group := models.Group{
		Name:            req.Name,
		Description:     req.Description,
		AvatarURL:       req.AvatarURL,
		OwnerID:         userID,
		MaxMembers:      256,
		IsPublic:        req.IsPublic,
		RequireApproval: req.RequireApproval,
	}

	err := h.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(&group).Error; err != nil {
			return err
		}
		member := models.GroupMember{
			GroupID:  group.ID,
			UserID:   userID,
			Role:     models.GroupRoleOwner,
			JoinedAt: time.Now(),
		}
		return tx.Create(&member).Error
	})

	if err != nil {
		h.log.Error("failed to create group", "error", err, "user", userID)
		response.InternalError(c, "failed to create group")
		return
	}

	h.db.Preload("Owner").Preload("Members.User").First(&group, group.ID)
	response.Created(c, group)
}

// GetMyGroups lists all groups the current user belongs to.
func (h *GroupHandler) GetMyGroups(c *gin.Context) {
	userID := mustUserID(c)

	var groupIDs []uint
	h.db.Model(&models.GroupMember{}).
		Where("user_id = ?", userID).
		Pluck("group_id", &groupIDs)

	var groups []models.Group
	if len(groupIDs) > 0 {
		h.db.Where("id IN ?", groupIDs).
			Preload("Owner").
			Order("updated_at DESC").
			Find(&groups)
	}

	response.OK(c, groups)
}

// GetGroup returns a single group by ID.
func (h *GroupHandler) GetGroup(c *gin.Context) {
	groupID, err := parseUintParam(c, "id")
	if err != nil {
		response.ValidationError(c, "invalid group id")
		return
	}

	var group models.Group
	if err := h.db.Preload("Owner").Preload("Members.User").First(&group, groupID).Error; err != nil {
		response.NotFound(c, "group not found")
		return
	}

	response.OK(c, group)
}

// UpdateGroupRequest is the body for PUT /api/groups/:id.
type UpdateGroupRequest struct {
	Name            *string `json:"name"`
	Description     *string `json:"description"`
	AvatarURL       *string `json:"avatar_url"`
	IsPublic        *bool   `json:"is_public"`
	RequireApproval *bool   `json:"require_approval"`
}

// UpdateGroup updates group info (owner/admin only).
func (h *GroupHandler) UpdateGroup(c *gin.Context) {
	userID := mustUserID(c)

	groupID, err := parseUintParam(c, "id")
	if err != nil {
		response.ValidationError(c, "invalid group id")
		return
	}

	if !h.isAdminOrOwner(groupID, userID) {
		response.Forbidden(c, "only owner or admin can update group")
		return
	}

	var req UpdateGroupRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ValidationError(c, "invalid request body")
		return
	}

	updates := map[string]interface{}{}
	if req.Name != nil {
		updates["name"] = *req.Name
	}
	if req.Description != nil {
		updates["description"] = *req.Description
	}
	if req.AvatarURL != nil {
		updates["avatar_url"] = *req.AvatarURL
	}
	if req.IsPublic != nil {
		updates["is_public"] = *req.IsPublic
	}
	if req.RequireApproval != nil {
		updates["require_approval"] = *req.RequireApproval
	}

	if len(updates) == 0 {
		response.BadRequest(c, "no fields to update")
		return
	}

	if err := h.db.Model(&models.Group{}).Where("id = ?", groupID).Updates(updates).Error; err != nil {
		h.log.Error("failed to update group", "error", err, "group", groupID)
		response.InternalError(c, "failed to update group")
		return
	}

	var group models.Group
	h.db.Preload("Owner").Preload("Members.User").First(&group, groupID)
	response.OK(c, group)
}

// DeleteGroup dissolves a group (owner only).
func (h *GroupHandler) DeleteGroup(c *gin.Context) {
	userID := mustUserID(c)

	groupID, err := parseUintParam(c, "id")
	if err != nil {
		response.ValidationError(c, "invalid group id")
		return
	}

	var group models.Group
	if err := h.db.First(&group, groupID).Error; err != nil {
		response.NotFound(c, "group not found")
		return
	}

	if group.OwnerID != userID {
		response.Forbidden(c, "only the group owner can delete the group")
		return
	}

	// Soft-delete the group.
	if err := h.db.Delete(&group).Error; err != nil {
		h.log.Error("failed to delete group", "error", err, "group", groupID)
		response.InternalError(c, "failed to delete group")
		return
	}

	response.OK(c, gin.H{"message": "group deleted"})
}

// --- Member management ---

// AddMemberRequest is the body for POST /api/groups/:id/members.
type AddMemberRequest struct {
	UserID uint `json:"user_id" binding:"required"`
}

// AddMember adds a user to the group.
func (h *GroupHandler) AddMember(c *gin.Context) {
	userID := mustUserID(c)

	groupID, err := parseUintParam(c, "id")
	if err != nil {
		response.ValidationError(c, "invalid group id")
		return
	}

	if !h.isAdminOrOwner(groupID, userID) {
		response.Forbidden(c, "only owner or admin can add members")
		return
	}

	var req AddMemberRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ValidationError(c, "user_id is required")
		return
	}

	// Check member count.
	var group models.Group
	if err := h.db.First(&group, groupID).Error; err != nil {
		response.NotFound(c, "group not found")
		return
	}

	var memberCount int64
	h.db.Model(&models.GroupMember{}).Where("group_id = ?", groupID).Count(&memberCount)
	if int(memberCount) >= group.MaxMembers {
		response.BadRequest(c, "group has reached maximum member count")
		return
	}

	// Check if already a member.
	var existing models.GroupMember
	if err := h.db.Where("group_id = ? AND user_id = ?", groupID, req.UserID).First(&existing).Error; err == nil {
		response.Conflict(c, "user is already a member of this group")
		return
	}

	member := models.GroupMember{
		GroupID:  groupID,
		UserID:   req.UserID,
		Role:     models.GroupRoleMember,
		JoinedAt: time.Now(),
	}

	if err := h.db.Create(&member).Error; err != nil {
		h.log.Error("failed to add member", "error", err, "group", groupID, "user", req.UserID)
		response.InternalError(c, "failed to add member")
		return
	}

	h.db.Preload("User").First(&member, member.ID)
	response.Created(c, member)
}

// RemoveMember removes a user from the group.
func (h *GroupHandler) RemoveMember(c *gin.Context) {
	userID := mustUserID(c)

	groupID, err := parseUintParam(c, "id")
	if err != nil {
		response.ValidationError(c, "invalid group id")
		return
	}

	targetUserID, err := parseUintParam(c, "userId")
	if err != nil {
		response.ValidationError(c, "invalid user id")
		return
	}

	// Allow self-removal (leaving the group) or admin/owner removal.
	if targetUserID != userID && !h.isAdminOrOwner(groupID, userID) {
		response.Forbidden(c, "only owner or admin can remove members")
		return
	}

	// Owner cannot be removed.
	var group models.Group
	if err := h.db.First(&group, groupID).Error; err != nil {
		response.NotFound(c, "group not found")
		return
	}
	if targetUserID == group.OwnerID {
		response.BadRequest(c, "cannot remove the group owner")
		return
	}

	result := h.db.Where("group_id = ? AND user_id = ?", groupID, targetUserID).Delete(&models.GroupMember{})
	if result.RowsAffected == 0 {
		response.NotFound(c, "member not found")
		return
	}

	response.OK(c, gin.H{"message": "member removed"})
}

// SetMemberRoleRequest is the body for PUT /api/groups/:id/members/:userId/role.
type SetMemberRoleRequest struct {
	Role string `json:"role" binding:"required"`
}

// SetMemberRole updates the role of a group member (owner only).
func (h *GroupHandler) SetMemberRole(c *gin.Context) {
	userID := mustUserID(c)

	groupID, err := parseUintParam(c, "id")
	if err != nil {
		response.ValidationError(c, "invalid group id")
		return
	}

	var group models.Group
	if err := h.db.First(&group, groupID).Error; err != nil {
		response.NotFound(c, "group not found")
		return
	}
	if group.OwnerID != userID {
		response.Forbidden(c, "only the group owner can change roles")
		return
	}

	targetUserID, err := parseUintParam(c, "userId")
	if err != nil {
		response.ValidationError(c, "invalid user id")
		return
	}

	var req SetMemberRoleRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ValidationError(c, "role is required")
		return
	}

	validRoles := map[string]bool{
		string(models.GroupRoleAdmin):  true,
		string(models.GroupRoleMember): true,
	}
	if !validRoles[req.Role] {
		response.ValidationError(c, "role must be admin or member")
		return
	}

	result := h.db.Model(&models.GroupMember{}).
		Where("group_id = ? AND user_id = ?", groupID, targetUserID).
		Update("role", req.Role)

	if result.RowsAffected == 0 {
		response.NotFound(c, "member not found")
		return
	}

	response.OK(c, gin.H{"message": "role updated"})
}

// MuteMemberRequest is the body for PUT /api/groups/:id/members/:userId/mute.
type MuteMemberRequest struct {
	Mute     bool `json:"mute"`
	Duration int  `json:"duration"` // Minutes, 0 = indefinite
}

// MuteMember mutes or unmutes a group member (admin/owner only).
func (h *GroupHandler) MuteMember(c *gin.Context) {
	userID := mustUserID(c)

	groupID, err := parseUintParam(c, "id")
	if err != nil {
		response.ValidationError(c, "invalid group id")
		return
	}

	if !h.isAdminOrOwner(groupID, userID) {
		response.Forbidden(c, "only owner or admin can mute members")
		return
	}

	targetUserID, err := parseUintParam(c, "userId")
	if err != nil {
		response.ValidationError(c, "invalid user id")
		return
	}

	var req MuteMemberRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ValidationError(c, "invalid request body")
		return
	}

	updates := map[string]interface{}{
		"is_muted": req.Mute,
	}
	if req.Mute && req.Duration > 0 {
		until := time.Now().Add(time.Duration(req.Duration) * time.Minute)
		updates["muted_until"] = until
	} else {
		updates["muted_until"] = nil
	}

	result := h.db.Model(&models.GroupMember{}).
		Where("group_id = ? AND user_id = ?", groupID, targetUserID).
		Updates(updates)

	if result.RowsAffected == 0 {
		response.NotFound(c, "member not found")
		return
	}

	action := "muted"
	if !req.Mute {
		action = "unmuted"
	}
	response.OK(c, gin.H{"message": "member " + action})
}

// --- Announcements ---

// CreateAnnouncementRequest is the body for POST /api/groups/:id/announcements.
type CreateAnnouncementRequest struct {
	Content string `json:"content" binding:"required"`
}

// CreateAnnouncement posts a new announcement (admin/owner only).
func (h *GroupHandler) CreateAnnouncement(c *gin.Context) {
	userID := mustUserID(c)

	groupID, err := parseUintParam(c, "id")
	if err != nil {
		response.ValidationError(c, "invalid group id")
		return
	}

	if !h.isAdminOrOwner(groupID, userID) {
		response.Forbidden(c, "only owner or admin can post announcements")
		return
	}

	var req CreateAnnouncementRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ValidationError(c, "content is required")
		return
	}

	announcement := models.GroupAnnouncement{
		GroupID:  groupID,
		AuthorID: userID,
		Content:  req.Content,
		IsPinned: true,
	}

	if err := h.db.Create(&announcement).Error; err != nil {
		h.log.Error("failed to create announcement", "error", err, "group", groupID)
		response.InternalError(c, "failed to create announcement")
		return
	}

	h.db.Preload("Author").First(&announcement, announcement.ID)
	response.Created(c, announcement)
}

// GetAnnouncements lists announcements for a group.
func (h *GroupHandler) GetAnnouncements(c *gin.Context) {
	groupID, err := parseUintParam(c, "id")
	if err != nil {
		response.ValidationError(c, "invalid group id")
		return
	}

	var announcements []models.GroupAnnouncement
	h.db.Where("group_id = ?", groupID).
		Order("created_at DESC").
		Preload("Author").
		Find(&announcements)

	response.OK(c, announcements)
}

// --- Join requests ---

// CreateJoinRequest submits a request to join a group.
func (h *GroupHandler) CreateJoinRequest(c *gin.Context) {
	userID := mustUserID(c)

	groupID, err := parseUintParam(c, "id")
	if err != nil {
		response.ValidationError(c, "invalid group id")
		return
	}

	// Check if already a member.
	var existing models.GroupMember
	if err := h.db.Where("group_id = ? AND user_id = ?", groupID, userID).First(&existing).Error; err == nil {
		response.Conflict(c, "you are already a member of this group")
		return
	}

	// Check for existing pending request.
	var existingReq models.GroupJoinRequest
	if err := h.db.Where("group_id = ? AND user_id = ? AND status = ?", groupID, userID, "pending").First(&existingReq).Error; err == nil {
		response.Conflict(c, "you already have a pending join request")
		return
	}

	type JoinBody struct {
		Message string `json:"message"`
	}
	var body JoinBody
	c.ShouldBindJSON(&body)

	joinRequest := models.GroupJoinRequest{
		GroupID: groupID,
		UserID:  userID,
		Message: body.Message,
		Status:  models.JoinRequestPending,
	}

	if err := h.db.Create(&joinRequest).Error; err != nil {
		h.log.Error("failed to create join request", "error", err, "group", groupID, "user", userID)
		response.InternalError(c, "failed to create join request")
		return
	}

	h.db.Preload("User").First(&joinRequest, joinRequest.ID)
	response.Created(c, joinRequest)
}

// GetJoinRequests lists pending join requests (admin/owner only).
func (h *GroupHandler) GetJoinRequests(c *gin.Context) {
	userID := mustUserID(c)

	groupID, err := parseUintParam(c, "id")
	if err != nil {
		response.ValidationError(c, "invalid group id")
		return
	}

	if !h.isAdminOrOwner(groupID, userID) {
		response.Forbidden(c, "only owner or admin can view join requests")
		return
	}

	var requests []models.GroupJoinRequest
	h.db.Where("group_id = ? AND status = ?", groupID, "pending").
		Preload("User").
		Order("created_at ASC").
		Find(&requests)

	response.OK(c, requests)
}

// ReviewJoinRequestRequest is the body for PUT /api/groups/:id/join-requests/:requestId.
type ReviewJoinRequestRequest struct {
	Approve bool `json:"approve"`
}

// ReviewJoinRequest approves or rejects a join request.
func (h *GroupHandler) ReviewJoinRequest(c *gin.Context) {
	userID := mustUserID(c)

	groupID, err := parseUintParam(c, "id")
	if err != nil {
		response.ValidationError(c, "invalid group id")
		return
	}

	if !h.isAdminOrOwner(groupID, userID) {
		response.Forbidden(c, "only owner or admin can review join requests")
		return
	}

	requestID, err := parseUintParam(c, "requestId")
	if err != nil {
		response.ValidationError(c, "invalid request id")
		return
	}

	var req ReviewJoinRequestRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ValidationError(c, "approve field is required")
		return
	}

	var joinReq models.GroupJoinRequest
	if err := h.db.First(&joinReq, requestID).Error; err != nil {
		response.NotFound(c, "join request not found")
		return
	}

	if joinReq.GroupID != groupID {
		response.BadRequest(c, "request does not belong to this group")
		return
	}

	if joinReq.Status != models.JoinRequestPending {
		response.BadRequest(c, "request has already been reviewed")
		return
	}

	status := models.JoinRequestRejected
	if req.Approve {
		status = models.JoinRequestApproved
	}

	err = h.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Model(&joinReq).Updates(map[string]interface{}{
			"status":      status,
			"reviewer_id": userID,
		}).Error; err != nil {
			return err
		}

		if req.Approve {
			member := models.GroupMember{
				GroupID:  groupID,
				UserID:   joinReq.UserID,
				Role:     models.GroupRoleMember,
				JoinedAt: time.Now(),
			}
			return tx.Create(&member).Error
		}
		return nil
	})

	if err != nil {
		h.log.Error("failed to review join request", "error", err, "request", requestID)
		response.InternalError(c, "failed to review join request")
		return
	}

	action := "rejected"
	if req.Approve {
		action = "approved"
	}
	response.OK(c, gin.H{"message": "join request " + action})
}

// --- Group messages ---

// GetGroupMessages returns paginated message history for a group.
func (h *GroupHandler) GetGroupMessages(c *gin.Context) {
	userID := mustUserID(c)

	groupID, err := parseUintParam(c, "id")
	if err != nil {
		response.ValidationError(c, "invalid group id")
		return
	}

	// Verify membership.
	if !h.isMember(groupID, userID) {
		response.Forbidden(c, "you are not a member of this group")
		return
	}

	page, pageSize := parsePagination(c)
	offset := (page - 1) * pageSize

	var total int64
	h.db.Model(&models.GroupMessage{}).Where("group_id = ?", groupID).Count(&total)

	var messages []models.GroupMessage
	err = h.db.Where("group_id = ?", groupID).
		Order("created_at ASC").
		Offset(offset).
		Limit(pageSize).
		Preload("Sender").
		Find(&messages).Error

	if err != nil {
		h.log.Error("failed to get group messages", "error", err, "group", groupID)
		response.InternalError(c, "failed to retrieve messages")
		return
	}

	response.Paginated(c, messages, total, page, pageSize)
}

// SendGroupMessageRequest is the body for POST /api/groups/:id/messages.
type SendGroupMessageRequest struct {
	Content     string  `json:"content" binding:"required"`
	MessageType string  `json:"message_type"`
	Encrypted   bool    `json:"encrypted"`
	FileURL     string  `json:"file_url"`
	FileName    string  `json:"file_name"`
	FileSize    int64   `json:"file_size"`
	Duration    float64 `json:"duration"`
}

// SendGroupMessage sends a message to a group.
func (h *GroupHandler) SendGroupMessage(c *gin.Context) {
	userID := mustUserID(c)

	groupID, err := parseUintParam(c, "id")
	if err != nil {
		response.ValidationError(c, "invalid group id")
		return
	}

	// Verify membership.
	if !h.isMember(groupID, userID) {
		response.Forbidden(c, "you are not a member of this group")
		return
	}

	// Check mute status.
	var member models.GroupMember
	h.db.Where("group_id = ? AND user_id = ?", groupID, userID).First(&member)
	if member.IsMuted {
		if member.MutedUntil == nil || member.MutedUntil.After(time.Now()) {
			response.Forbidden(c, "you are muted in this group")
			return
		}
		// Mute has expired — auto-unmute.
		h.db.Model(&member).Updates(map[string]interface{}{"is_muted": false, "muted_until": nil})
	}

	var req SendGroupMessageRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ValidationError(c, "content is required")
		return
	}

	if len(req.Content) > maxMessageContentLen {
		response.ValidationError(c, "message content exceeds maximum length")
		return
	}

	msgType := req.MessageType
	if msgType == "" {
		msgType = "text"
	}

	msg := models.GroupMessage{
		GroupID:     groupID,
		SenderID:    userID,
		Content:     req.Content,
		MessageType: msgType,
		Encrypted:   req.Encrypted,
		FileURL:     req.FileURL,
		FileName:    req.FileName,
		FileSize:    req.FileSize,
		Duration:    req.Duration,
	}

	if err := h.db.Create(&msg).Error; err != nil {
		h.log.Error("failed to send group message", "error", err, "group", groupID, "user", userID)
		response.InternalError(c, "failed to send message")
		return
	}

	h.db.Preload("Sender").First(&msg, msg.ID)
	response.Created(c, msg)
}

// --- Helpers ---

// isMember checks whether userID is a member of the given group.
func (h *GroupHandler) isMember(groupID, userID uint) bool {
	var count int64
	h.db.Model(&models.GroupMember{}).
		Where("group_id = ? AND user_id = ?", groupID, userID).
		Count(&count)
	return count > 0
}

// isAdminOrOwner checks whether userID is an admin or owner of the given group.
func (h *GroupHandler) isAdminOrOwner(groupID, userID uint) bool {
	var count int64
	h.db.Model(&models.GroupMember{}).
		Where("group_id = ? AND user_id = ? AND role IN ?", groupID, userID, []string{"owner", "admin"}).
		Count(&count)
	return count > 0
}
