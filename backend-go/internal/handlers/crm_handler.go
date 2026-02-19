package handlers

import (
	"log/slog"

	"github.com/everest-an/dchat-backend/internal/models"
	"github.com/everest-an/dchat-backend/internal/response"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// CRMHandler handles CRM endpoints.
type CRMHandler struct {
	db  *gorm.DB
	log *slog.Logger
}

// NewCRMHandler creates a CRMHandler.
func NewCRMHandler(db *gorm.DB, log *slog.Logger) *CRMHandler {
	return &CRMHandler{db: db, log: log}
}

// --- Contacts ---

// CreateContact creates a new CRM contact.
// POST /api/crm/contacts
func (h *CRMHandler) CreateContact(c *gin.Context) {
	userID := mustUserID(c)

	var contact models.CRMContact
	if err := c.ShouldBindJSON(&contact); err != nil {
		response.ValidationError(c, "name is required")
		return
	}

	contact.OwnerID = userID
	if contact.Source == "" {
		contact.Source = "manual"
	}

	if err := h.db.Create(&contact).Error; err != nil {
		h.log.Error("failed to create contact", "error", err)
		response.InternalError(c, "failed to create contact")
		return
	}

	response.Created(c, contact)
}

// ListContacts returns the user's CRM contacts.
// GET /api/crm/contacts?search=&tag=
func (h *CRMHandler) ListContacts(c *gin.Context) {
	userID := mustUserID(c)
	page, pageSize := parsePagination(c)

	q := h.db.Where("owner_id = ?", userID)

	if search := c.Query("search"); search != "" {
		like := "%" + search + "%"
		q = q.Where("name ILIKE ? OR email ILIKE ? OR company ILIKE ?", like, like, like)
	}
	if tag := c.Query("tag"); tag != "" {
		q = q.Where("tags LIKE ?", "%"+tag+"%")
	}

	var total int64
	q.Model(&models.CRMContact{}).Count(&total)

	var contacts []models.CRMContact
	if err := q.Order("updated_at DESC").
		Offset((page - 1) * pageSize).Limit(pageSize).
		Find(&contacts).Error; err != nil {
		h.log.Error("failed to list contacts", "error", err)
		response.InternalError(c, "failed to list contacts")
		return
	}

	response.Paginated(c, contacts, total, page, pageSize)
}

// GetContact returns a single contact.
// GET /api/crm/contacts/:id
func (h *CRMHandler) GetContact(c *gin.Context) {
	userID := mustUserID(c)
	id, err := parseUintParam(c, "id")
	if err != nil {
		response.ValidationError(c, "invalid contact id")
		return
	}

	var contact models.CRMContact
	if err := h.db.Where("id = ? AND owner_id = ?", id, userID).First(&contact).Error; err != nil {
		response.NotFound(c, "contact not found")
		return
	}

	response.OK(c, contact)
}

// UpdateContact updates a CRM contact.
// PUT /api/crm/contacts/:id
func (h *CRMHandler) UpdateContact(c *gin.Context) {
	userID := mustUserID(c)
	id, err := parseUintParam(c, "id")
	if err != nil {
		response.ValidationError(c, "invalid contact id")
		return
	}

	var contact models.CRMContact
	if err := h.db.Where("id = ? AND owner_id = ?", id, userID).First(&contact).Error; err != nil {
		response.NotFound(c, "contact not found")
		return
	}

	var updates map[string]interface{}
	if err := c.ShouldBindJSON(&updates); err != nil {
		response.ValidationError(c, "invalid request body")
		return
	}
	delete(updates, "id")
	delete(updates, "owner_id")

	if err := h.db.Model(&contact).Updates(updates).Error; err != nil {
		h.log.Error("failed to update contact", "error", err)
		response.InternalError(c, "failed to update contact")
		return
	}

	h.db.First(&contact, id)
	response.OK(c, contact)
}

// DeleteContact deletes a CRM contact.
// DELETE /api/crm/contacts/:id
func (h *CRMHandler) DeleteContact(c *gin.Context) {
	userID := mustUserID(c)
	id, err := parseUintParam(c, "id")
	if err != nil {
		response.ValidationError(c, "invalid contact id")
		return
	}

	result := h.db.Where("id = ? AND owner_id = ?", id, userID).Delete(&models.CRMContact{})
	if result.RowsAffected == 0 {
		response.NotFound(c, "contact not found")
		return
	}

	response.OK(c, gin.H{"message": "contact deleted"})
}

// --- Deals ---

// CreateDeal creates a new CRM deal.
// POST /api/crm/deals
func (h *CRMHandler) CreateDeal(c *gin.Context) {
	userID := mustUserID(c)

	var deal models.CRMDeal
	if err := c.ShouldBindJSON(&deal); err != nil {
		response.ValidationError(c, "title is required")
		return
	}

	deal.OwnerID = userID

	if err := h.db.Create(&deal).Error; err != nil {
		h.log.Error("failed to create deal", "error", err)
		response.InternalError(c, "failed to create deal")
		return
	}

	response.Created(c, deal)
}

// ListDeals returns the user's deals.
// GET /api/crm/deals?stage=&contact_id=
func (h *CRMHandler) ListDeals(c *gin.Context) {
	userID := mustUserID(c)
	page, pageSize := parsePagination(c)

	q := h.db.Where("owner_id = ?", userID)

	if stage := c.Query("stage"); stage != "" {
		q = q.Where("stage = ?", stage)
	}
	if contactID := c.Query("contact_id"); contactID != "" {
		q = q.Where("contact_id = ?", contactID)
	}

	var total int64
	q.Model(&models.CRMDeal{}).Count(&total)

	var deals []models.CRMDeal
	if err := q.Preload("Contact").Order("updated_at DESC").
		Offset((page - 1) * pageSize).Limit(pageSize).
		Find(&deals).Error; err != nil {
		h.log.Error("failed to list deals", "error", err)
		response.InternalError(c, "failed to list deals")
		return
	}

	response.Paginated(c, deals, total, page, pageSize)
}

// UpdateDeal updates a CRM deal.
// PUT /api/crm/deals/:id
func (h *CRMHandler) UpdateDeal(c *gin.Context) {
	userID := mustUserID(c)
	id, err := parseUintParam(c, "id")
	if err != nil {
		response.ValidationError(c, "invalid deal id")
		return
	}

	var deal models.CRMDeal
	if err := h.db.Where("id = ? AND owner_id = ?", id, userID).First(&deal).Error; err != nil {
		response.NotFound(c, "deal not found")
		return
	}

	var updates map[string]interface{}
	if err := c.ShouldBindJSON(&updates); err != nil {
		response.ValidationError(c, "invalid request body")
		return
	}
	delete(updates, "id")
	delete(updates, "owner_id")

	if err := h.db.Model(&deal).Updates(updates).Error; err != nil {
		h.log.Error("failed to update deal", "error", err)
		response.InternalError(c, "failed to update deal")
		return
	}

	h.db.Preload("Contact").First(&deal, id)
	response.OK(c, deal)
}

// DeleteDeal deletes a CRM deal.
// DELETE /api/crm/deals/:id
func (h *CRMHandler) DeleteDeal(c *gin.Context) {
	userID := mustUserID(c)
	id, err := parseUintParam(c, "id")
	if err != nil {
		response.ValidationError(c, "invalid deal id")
		return
	}

	result := h.db.Where("id = ? AND owner_id = ?", id, userID).Delete(&models.CRMDeal{})
	if result.RowsAffected == 0 {
		response.NotFound(c, "deal not found")
		return
	}

	response.OK(c, gin.H{"message": "deal deleted"})
}

// --- Activities ---

// CreateActivity logs an activity against a contact.
// POST /api/crm/activities
func (h *CRMHandler) CreateActivity(c *gin.Context) {
	userID := mustUserID(c)

	var activity models.CRMActivity
	if err := c.ShouldBindJSON(&activity); err != nil {
		response.ValidationError(c, "contact_id and type are required")
		return
	}

	activity.OwnerID = userID

	if err := h.db.Create(&activity).Error; err != nil {
		h.log.Error("failed to create activity", "error", err)
		response.InternalError(c, "failed to create activity")
		return
	}

	response.Created(c, activity)
}

// ListActivities returns activities for a contact.
// GET /api/crm/activities?contact_id=&deal_id=
func (h *CRMHandler) ListActivities(c *gin.Context) {
	userID := mustUserID(c)

	q := h.db.Where("owner_id = ?", userID)

	if contactID := c.Query("contact_id"); contactID != "" {
		q = q.Where("contact_id = ?", contactID)
	}
	if dealID := c.Query("deal_id"); dealID != "" {
		q = q.Where("deal_id = ?", dealID)
	}

	var activities []models.CRMActivity
	if err := q.Order("created_at DESC").Limit(100).Find(&activities).Error; err != nil {
		h.log.Error("failed to list activities", "error", err)
		response.InternalError(c, "failed to list activities")
		return
	}

	response.OK(c, activities)
}
