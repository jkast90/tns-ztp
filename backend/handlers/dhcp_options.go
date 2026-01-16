package handlers

import (
	"github.com/gin-gonic/gin"
	"github.com/ztp-server/backend/db"
	"github.com/ztp-server/backend/models"
)

// DhcpOptionHandler handles DHCP option-related HTTP requests
type DhcpOptionHandler struct {
	store        *db.Store
	configReload func() error
}

// NewDhcpOptionHandler creates a new DHCP option handler
func NewDhcpOptionHandler(store *db.Store, configReload func() error) *DhcpOptionHandler {
	return &DhcpOptionHandler{
		store:        store,
		configReload: configReload,
	}
}

// RegisterRoutes registers all DHCP option routes
func (h *DhcpOptionHandler) RegisterRoutes(r *gin.RouterGroup) {
	r.GET("/dhcp-options", h.List)
	r.GET("/dhcp-options/:id", h.Get)
	r.POST("/dhcp-options", h.Create)
	r.PUT("/dhcp-options/:id", h.Update)
	r.DELETE("/dhcp-options/:id", h.Delete)
}

// List returns all DHCP options
func (h *DhcpOptionHandler) List(c *gin.Context) {
	options, err := h.store.ListDhcpOptions()
	if err != nil {
		internalError(c, err)
		return
	}

	if options == nil {
		options = []models.DhcpOption{}
	}

	ok(c, options)
}

// Get returns a single DHCP option by ID
func (h *DhcpOptionHandler) Get(c *gin.Context) {
	id := c.Param("id")

	option, err := h.store.GetDhcpOption(id)
	if err != nil {
		internalError(c, err)
		return
	}

	if option == nil {
		notFound(c, "dhcp option")
		return
	}

	ok(c, option)
}

// Create adds a new DHCP option
func (h *DhcpOptionHandler) Create(c *gin.Context) {
	var option models.DhcpOption
	if err := c.ShouldBindJSON(&option); err != nil {
		badRequest(c, err)
		return
	}

	if option.ID == "" || option.Name == "" || option.OptionNumber == 0 {
		errorResponse(c, 400, "id, name, and option_number are required")
		return
	}

	// Set defaults
	if option.Type == "" {
		option.Type = "string"
	}

	// Check for duplicate
	existing, _ := h.store.GetDhcpOption(option.ID)
	if existing != nil {
		conflict(c, "dhcp option with this ID already exists")
		return
	}

	if err := h.store.CreateDhcpOption(&option); err != nil {
		internalError(c, err)
		return
	}

	h.triggerReload()
	created(c, option)
}

// Update modifies an existing DHCP option
func (h *DhcpOptionHandler) Update(c *gin.Context) {
	id := c.Param("id")

	var option models.DhcpOption
	if err := c.ShouldBindJSON(&option); err != nil {
		badRequest(c, err)
		return
	}

	option.ID = id

	if err := h.store.UpdateDhcpOption(&option); handleError(c, err, true) {
		return
	}

	h.triggerReload()
	ok(c, option)
}

// Delete removes a DHCP option
func (h *DhcpOptionHandler) Delete(c *gin.Context) {
	id := c.Param("id")

	if err := h.store.DeleteDhcpOption(id); handleError(c, err, true) {
		return
	}

	h.triggerReload()
	noContent(c)
}

func (h *DhcpOptionHandler) triggerReload() {
	if h.configReload != nil {
		go h.configReload()
	}
}
