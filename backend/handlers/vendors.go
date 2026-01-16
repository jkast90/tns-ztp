package handlers

import (
	"github.com/gin-gonic/gin"
	"github.com/ztp-server/backend/db"
	"github.com/ztp-server/backend/models"
)

// VendorHandler handles vendor-related HTTP requests
type VendorHandler struct {
	store *db.Store
}

// NewVendorHandler creates a new vendor handler
func NewVendorHandler(store *db.Store) *VendorHandler {
	return &VendorHandler{
		store: store,
	}
}

// RegisterRoutes registers all vendor routes
func (h *VendorHandler) RegisterRoutes(r *gin.RouterGroup) {
	r.GET("/vendors", h.List)
	r.GET("/vendors/:id", h.Get)
	r.POST("/vendors", h.Create)
	r.PUT("/vendors/:id", h.Update)
	r.DELETE("/vendors/:id", h.Delete)
}

// List returns all vendors
func (h *VendorHandler) List(c *gin.Context) {
	vendors, err := h.store.ListVendors()
	if err != nil {
		internalError(c, err)
		return
	}

	if vendors == nil {
		vendors = []models.Vendor{}
	}

	ok(c, vendors)
}

// Get returns a single vendor by ID
func (h *VendorHandler) Get(c *gin.Context) {
	id := c.Param("id")

	vendor, err := h.store.GetVendor(id)
	if err != nil {
		internalError(c, err)
		return
	}

	if vendor == nil {
		notFound(c, "vendor")
		return
	}

	ok(c, vendor)
}

// Create adds a new vendor
func (h *VendorHandler) Create(c *gin.Context) {
	var vendor models.Vendor
	if err := c.ShouldBindJSON(&vendor); err != nil {
		badRequest(c, err)
		return
	}

	if vendor.ID == "" || vendor.Name == "" {
		errorResponse(c, 400, "id and name are required")
		return
	}

	// Set defaults
	if vendor.BackupCommand == "" {
		vendor.BackupCommand = "show running-config"
	}
	if vendor.SSHPort == 0 {
		vendor.SSHPort = 22
	}

	// Check for duplicate
	existing, _ := h.store.GetVendor(vendor.ID)
	if existing != nil {
		conflict(c, "vendor with this ID already exists")
		return
	}

	if err := h.store.CreateVendor(&vendor); err != nil {
		internalError(c, err)
		return
	}

	created(c, vendor)
}

// Update modifies an existing vendor
func (h *VendorHandler) Update(c *gin.Context) {
	id := c.Param("id")

	var vendor models.Vendor
	if err := c.ShouldBindJSON(&vendor); err != nil {
		badRequest(c, err)
		return
	}

	vendor.ID = id

	if err := h.store.UpdateVendor(&vendor); handleError(c, err, true) {
		return
	}

	ok(c, vendor)
}

// Delete removes a vendor
func (h *VendorHandler) Delete(c *gin.Context) {
	id := c.Param("id")

	if err := h.store.DeleteVendor(id); handleError(c, err, true) {
		return
	}

	noContent(c)
}
