package handlers

import (
	"log/slog"

	"github.com/everest-an/dchat-backend/internal/models"
	"github.com/everest-an/dchat-backend/internal/response"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// ProfileHandler handles user profile sub-resource endpoints.
type ProfileHandler struct {
	db  *gorm.DB
	log *slog.Logger
}

// NewProfileHandler creates a ProfileHandler.
func NewProfileHandler(db *gorm.DB, log *slog.Logger) *ProfileHandler {
	return &ProfileHandler{db: db, log: log}
}

// ─── User Profile Update ────────────────────────────────────────────────────

// UpdateProfileRequest is the body for PUT /api/user/me.
type UpdateProfileRequest struct {
	Name     string `json:"name"`
	Username string `json:"username"`
	Email    string `json:"email"`
	Company  string `json:"company"`
	Position string `json:"position"`
	Bio      string `json:"bio"`
	Avatar   string `json:"avatar"`
}

// UpdateMe updates the authenticated user's profile.
// PUT /api/user/me
func (h *ProfileHandler) UpdateMe(c *gin.Context) {
	userID := mustUserID(c)

	var req UpdateProfileRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ValidationError(c, "invalid request body")
		return
	}

	updates := map[string]interface{}{}
	if req.Name != "" {
		updates["name"] = req.Name
	}
	if req.Username != "" {
		updates["username"] = req.Username
	}
	if req.Email != "" {
		updates["email"] = req.Email
	}
	if req.Company != "" {
		updates["company"] = req.Company
	}
	if req.Position != "" {
		updates["position"] = req.Position
	}
	if req.Bio != "" {
		updates["bio"] = req.Bio
	}
	if req.Avatar != "" {
		updates["avatar"] = req.Avatar
	}

	if len(updates) == 0 {
		response.BadRequest(c, "no fields to update")
		return
	}

	if err := h.db.Model(&models.User{}).Where("id = ?", userID).Updates(updates).Error; err != nil {
		h.log.Error("failed to update user profile", "error", err, "user_id", userID)
		response.InternalError(c, "failed to update profile")
		return
	}

	var user models.User
	h.db.First(&user, userID)
	response.OK(c, user)
}

// ─── Skills CRUD ────────────────────────────────────────────────────────────

// ListSkills returns the authenticated user's skills.
// GET /api/profile/skills
func (h *ProfileHandler) ListSkills(c *gin.Context) {
	userID := mustUserID(c)
	var skills []models.UserSkill
	if err := h.db.Where("user_id = ?", userID).Find(&skills).Error; err != nil {
		h.log.Error("failed to list skills", "error", err)
		response.InternalError(c, "failed to list skills")
		return
	}
	response.OK(c, skills)
}

// CreateSkill adds a new skill.
// POST /api/profile/skills
func (h *ProfileHandler) CreateSkill(c *gin.Context) {
	userID := mustUserID(c)
	var skill models.UserSkill
	if err := c.ShouldBindJSON(&skill); err != nil {
		response.ValidationError(c, "invalid skill data")
		return
	}
	skill.UserID = userID
	if err := h.db.Create(&skill).Error; err != nil {
		h.log.Error("failed to create skill", "error", err)
		response.InternalError(c, "failed to create skill")
		return
	}
	response.Created(c, skill)
}

// UpdateSkill updates an existing skill.
// PUT /api/profile/skills/:id
func (h *ProfileHandler) UpdateSkill(c *gin.Context) {
	userID := mustUserID(c)
	id, err := parseUintParam(c, "id")
	if err != nil {
		response.ValidationError(c, "invalid skill id")
		return
	}

	var skill models.UserSkill
	if err := h.db.Where("id = ? AND user_id = ?", id, userID).First(&skill).Error; err != nil {
		response.NotFound(c, "skill not found")
		return
	}

	if err := c.ShouldBindJSON(&skill); err != nil {
		response.ValidationError(c, "invalid skill data")
		return
	}
	skill.UserID = userID
	if err := h.db.Save(&skill).Error; err != nil {
		h.log.Error("failed to update skill", "error", err)
		response.InternalError(c, "failed to update skill")
		return
	}
	response.OK(c, skill)
}

// DeleteSkill removes a skill.
// DELETE /api/profile/skills/:id
func (h *ProfileHandler) DeleteSkill(c *gin.Context) {
	userID := mustUserID(c)
	id, err := parseUintParam(c, "id")
	if err != nil {
		response.ValidationError(c, "invalid skill id")
		return
	}
	if err := h.db.Where("id = ? AND user_id = ?", id, userID).Delete(&models.UserSkill{}).Error; err != nil {
		h.log.Error("failed to delete skill", "error", err)
		response.InternalError(c, "failed to delete skill")
		return
	}
	response.NoContent(c)
}

// ─── Projects CRUD ──────────────────────────────────────────────────────────

// ListProjects returns the authenticated user's profile projects.
// GET /api/profile/projects
func (h *ProfileHandler) ListProjects(c *gin.Context) {
	userID := mustUserID(c)
	var projects []models.UserProject
	if err := h.db.Where("user_id = ?", userID).Find(&projects).Error; err != nil {
		h.log.Error("failed to list projects", "error", err)
		response.InternalError(c, "failed to list projects")
		return
	}
	response.OK(c, projects)
}

// CreateProject adds a new profile project.
// POST /api/profile/projects
func (h *ProfileHandler) CreateProject(c *gin.Context) {
	userID := mustUserID(c)
	var project models.UserProject
	if err := c.ShouldBindJSON(&project); err != nil {
		response.ValidationError(c, "invalid project data")
		return
	}
	project.UserID = userID
	if err := h.db.Create(&project).Error; err != nil {
		h.log.Error("failed to create project", "error", err)
		response.InternalError(c, "failed to create project")
		return
	}
	response.Created(c, project)
}

// UpdateProject updates an existing profile project.
// PUT /api/profile/projects/:id
func (h *ProfileHandler) UpdateProject(c *gin.Context) {
	userID := mustUserID(c)
	id, err := parseUintParam(c, "id")
	if err != nil {
		response.ValidationError(c, "invalid project id")
		return
	}

	var project models.UserProject
	if err := h.db.Where("id = ? AND user_id = ?", id, userID).First(&project).Error; err != nil {
		response.NotFound(c, "project not found")
		return
	}

	if err := c.ShouldBindJSON(&project); err != nil {
		response.ValidationError(c, "invalid project data")
		return
	}
	project.UserID = userID
	if err := h.db.Save(&project).Error; err != nil {
		h.log.Error("failed to update project", "error", err)
		response.InternalError(c, "failed to update project")
		return
	}
	response.OK(c, project)
}

// DeleteProject removes a profile project.
// DELETE /api/profile/projects/:id
func (h *ProfileHandler) DeleteProject(c *gin.Context) {
	userID := mustUserID(c)
	id, err := parseUintParam(c, "id")
	if err != nil {
		response.ValidationError(c, "invalid project id")
		return
	}
	if err := h.db.Where("id = ? AND user_id = ?", id, userID).Delete(&models.UserProject{}).Error; err != nil {
		h.log.Error("failed to delete project", "error", err)
		response.InternalError(c, "failed to delete project")
		return
	}
	response.NoContent(c)
}

// ─── Resources CRUD ─────────────────────────────────────────────────────────

// ListResources returns the authenticated user's resources.
// GET /api/profile/resources
func (h *ProfileHandler) ListResources(c *gin.Context) {
	userID := mustUserID(c)
	var resources []models.UserResource
	if err := h.db.Where("user_id = ?", userID).Find(&resources).Error; err != nil {
		h.log.Error("failed to list resources", "error", err)
		response.InternalError(c, "failed to list resources")
		return
	}
	response.OK(c, resources)
}

// CreateResource adds a new resource.
// POST /api/profile/resources
func (h *ProfileHandler) CreateResource(c *gin.Context) {
	userID := mustUserID(c)
	var resource models.UserResource
	if err := c.ShouldBindJSON(&resource); err != nil {
		response.ValidationError(c, "invalid resource data")
		return
	}
	resource.UserID = userID
	if err := h.db.Create(&resource).Error; err != nil {
		h.log.Error("failed to create resource", "error", err)
		response.InternalError(c, "failed to create resource")
		return
	}
	response.Created(c, resource)
}

// UpdateResource updates an existing resource.
// PUT /api/profile/resources/:id
func (h *ProfileHandler) UpdateResource(c *gin.Context) {
	userID := mustUserID(c)
	id, err := parseUintParam(c, "id")
	if err != nil {
		response.ValidationError(c, "invalid resource id")
		return
	}

	var resource models.UserResource
	if err := h.db.Where("id = ? AND user_id = ?", id, userID).First(&resource).Error; err != nil {
		response.NotFound(c, "resource not found")
		return
	}

	if err := c.ShouldBindJSON(&resource); err != nil {
		response.ValidationError(c, "invalid resource data")
		return
	}
	resource.UserID = userID
	if err := h.db.Save(&resource).Error; err != nil {
		h.log.Error("failed to update resource", "error", err)
		response.InternalError(c, "failed to update resource")
		return
	}
	response.OK(c, resource)
}

// DeleteResource removes a resource.
// DELETE /api/profile/resources/:id
func (h *ProfileHandler) DeleteResource(c *gin.Context) {
	userID := mustUserID(c)
	id, err := parseUintParam(c, "id")
	if err != nil {
		response.ValidationError(c, "invalid resource id")
		return
	}
	if err := h.db.Where("id = ? AND user_id = ?", id, userID).Delete(&models.UserResource{}).Error; err != nil {
		h.log.Error("failed to delete resource", "error", err)
		response.InternalError(c, "failed to delete resource")
		return
	}
	response.NoContent(c)
}

// ─── Seeking CRUD ───────────────────────────────────────────────────────────

// ListSeeking returns the authenticated user's seeking items.
// GET /api/profile/seeking
func (h *ProfileHandler) ListSeeking(c *gin.Context) {
	userID := mustUserID(c)
	var items []models.UserSeeking
	if err := h.db.Where("user_id = ?", userID).Find(&items).Error; err != nil {
		h.log.Error("failed to list seeking", "error", err)
		response.InternalError(c, "failed to list seeking items")
		return
	}
	response.OK(c, items)
}

// CreateSeeking adds a new seeking item.
// POST /api/profile/seeking
func (h *ProfileHandler) CreateSeeking(c *gin.Context) {
	userID := mustUserID(c)
	var item models.UserSeeking
	if err := c.ShouldBindJSON(&item); err != nil {
		response.ValidationError(c, "invalid seeking data")
		return
	}
	item.UserID = userID
	if err := h.db.Create(&item).Error; err != nil {
		h.log.Error("failed to create seeking", "error", err)
		response.InternalError(c, "failed to create seeking item")
		return
	}
	response.Created(c, item)
}

// UpdateSeeking updates an existing seeking item.
// PUT /api/profile/seeking/:id
func (h *ProfileHandler) UpdateSeeking(c *gin.Context) {
	userID := mustUserID(c)
	id, err := parseUintParam(c, "id")
	if err != nil {
		response.ValidationError(c, "invalid seeking id")
		return
	}

	var item models.UserSeeking
	if err := h.db.Where("id = ? AND user_id = ?", id, userID).First(&item).Error; err != nil {
		response.NotFound(c, "seeking item not found")
		return
	}

	if err := c.ShouldBindJSON(&item); err != nil {
		response.ValidationError(c, "invalid seeking data")
		return
	}
	item.UserID = userID
	if err := h.db.Save(&item).Error; err != nil {
		h.log.Error("failed to update seeking", "error", err)
		response.InternalError(c, "failed to update seeking item")
		return
	}
	response.OK(c, item)
}

// DeleteSeeking removes a seeking item.
// DELETE /api/profile/seeking/:id
func (h *ProfileHandler) DeleteSeeking(c *gin.Context) {
	userID := mustUserID(c)
	id, err := parseUintParam(c, "id")
	if err != nil {
		response.ValidationError(c, "invalid seeking id")
		return
	}
	if err := h.db.Where("id = ? AND user_id = ?", id, userID).Delete(&models.UserSeeking{}).Error; err != nil {
		h.log.Error("failed to delete seeking", "error", err)
		response.InternalError(c, "failed to delete seeking item")
		return
	}
	response.NoContent(c)
}

// ─── Business Info ──────────────────────────────────────────────────────────

// GetBusiness returns the authenticated user's business info.
// GET /api/profile/business
func (h *ProfileHandler) GetBusiness(c *gin.Context) {
	userID := mustUserID(c)
	var biz models.UserBusiness
	if err := h.db.Where("user_id = ?", userID).First(&biz).Error; err != nil {
		// Return empty object if not found.
		response.OK(c, models.UserBusiness{UserID: userID})
		return
	}
	response.OK(c, biz)
}

// UpsertBusiness creates or updates the authenticated user's business info.
// PUT /api/profile/business
func (h *ProfileHandler) UpsertBusiness(c *gin.Context) {
	userID := mustUserID(c)

	var req models.UserBusiness
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ValidationError(c, "invalid business data")
		return
	}
	req.UserID = userID

	var existing models.UserBusiness
	if err := h.db.Where("user_id = ?", userID).First(&existing).Error; err != nil {
		// Create new.
		if err := h.db.Create(&req).Error; err != nil {
			h.log.Error("failed to create business info", "error", err)
			response.InternalError(c, "failed to save business info")
			return
		}
		response.Created(c, req)
		return
	}

	// Update existing.
	existing.Company = req.Company
	existing.JobTitle = req.JobTitle
	existing.Industry = req.Industry
	existing.Location = req.Location
	existing.Website = req.Website
	existing.Bio = req.Bio

	if err := h.db.Save(&existing).Error; err != nil {
		h.log.Error("failed to update business info", "error", err)
		response.InternalError(c, "failed to update business info")
		return
	}
	response.OK(c, existing)
}
