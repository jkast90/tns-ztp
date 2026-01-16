package handlers

import (
	"bytes"
	"text/template"

	"github.com/gin-gonic/gin"
	"github.com/ztp-server/backend/db"
	"github.com/ztp-server/backend/models"
)

// TemplateHandler handles template-related HTTP requests
type TemplateHandler struct {
	store        *db.Store
	configReload func() error
}

// NewTemplateHandler creates a new template handler
func NewTemplateHandler(store *db.Store, configReload func() error) *TemplateHandler {
	return &TemplateHandler{
		store:        store,
		configReload: configReload,
	}
}

// RegisterRoutes registers all template routes
func (h *TemplateHandler) RegisterRoutes(r *gin.RouterGroup) {
	r.GET("/templates", h.List)
	// Static route for variables must come before parameterized routes
	r.GET("/templates/_/variables", h.GetVariables)
	r.GET("/templates/:id", h.Get)
	r.POST("/templates", h.Create)
	r.PUT("/templates/:id", h.Update)
	r.DELETE("/templates/:id", h.Delete)
	r.POST("/templates/:id/preview", h.Preview)
}

// List returns all templates
func (h *TemplateHandler) List(c *gin.Context) {
	templates, err := h.store.ListTemplates()
	if err != nil {
		internalError(c, err)
		return
	}

	if templates == nil {
		templates = []models.Template{}
	}

	ok(c, templates)
}

// Get returns a single template by ID
func (h *TemplateHandler) Get(c *gin.Context) {
	id := c.Param("id")

	tmpl, err := h.store.GetTemplate(id)
	if err != nil {
		internalError(c, err)
		return
	}

	if tmpl == nil {
		notFound(c, "template")
		return
	}

	ok(c, tmpl)
}

// Create adds a new template
func (h *TemplateHandler) Create(c *gin.Context) {
	var tmpl models.Template
	if err := c.ShouldBindJSON(&tmpl); err != nil {
		badRequest(c, err)
		return
	}

	if tmpl.ID == "" || tmpl.Name == "" || tmpl.Content == "" {
		errorResponse(c, 400, "id, name, and content are required")
		return
	}

	// Validate template syntax
	if _, err := template.New("test").Parse(tmpl.Content); err != nil {
		errorResponse(c, 400, "invalid template syntax: "+err.Error())
		return
	}

	// Check for duplicate
	existing, _ := h.store.GetTemplate(tmpl.ID)
	if existing != nil {
		conflict(c, "template with this ID already exists")
		return
	}

	if err := h.store.CreateTemplate(&tmpl); err != nil {
		internalError(c, err)
		return
	}

	h.triggerReload()
	created(c, tmpl)
}

// Update modifies an existing template
func (h *TemplateHandler) Update(c *gin.Context) {
	id := c.Param("id")

	var tmpl models.Template
	if err := c.ShouldBindJSON(&tmpl); err != nil {
		badRequest(c, err)
		return
	}

	tmpl.ID = id

	// Validate template syntax
	if tmpl.Content != "" {
		if _, err := template.New("test").Parse(tmpl.Content); err != nil {
			errorResponse(c, 400, "invalid template syntax: "+err.Error())
			return
		}
	}

	if err := h.store.UpdateTemplate(&tmpl); handleError(c, err, true) {
		return
	}

	h.triggerReload()
	ok(c, tmpl)
}

// Delete removes a template
func (h *TemplateHandler) Delete(c *gin.Context) {
	id := c.Param("id")

	// Check if template is in use
	tmpl, err := h.store.GetTemplate(id)
	if err != nil {
		internalError(c, err)
		return
	}
	if tmpl == nil {
		notFound(c, "template")
		return
	}
	if tmpl.DeviceCount > 0 {
		errorResponse(c, 400, "cannot delete template that is in use by devices")
		return
	}

	if err := h.store.DeleteTemplate(id); handleError(c, err, true) {
		return
	}

	h.triggerReload()
	noContent(c)
}

// Preview renders a template with sample data
func (h *TemplateHandler) Preview(c *gin.Context) {
	id := c.Param("id")

	var previewData struct {
		Device  models.Device   `json:"device"`
		Subnet  string          `json:"subnet"`
		Gateway string          `json:"gateway"`
	}

	if err := c.ShouldBindJSON(&previewData); err != nil {
		badRequest(c, err)
		return
	}

	// Get template
	tmpl, err := h.store.GetTemplate(id)
	if err != nil {
		internalError(c, err)
		return
	}
	if tmpl == nil {
		notFound(c, "template")
		return
	}

	// Parse and execute template
	t, err := template.New("preview").Parse(tmpl.Content)
	if err != nil {
		errorResponse(c, 400, "template parse error: "+err.Error())
		return
	}

	data := struct {
		*models.Device
		Subnet  string
		Gateway string
	}{
		Device:  &previewData.Device,
		Subnet:  previewData.Subnet,
		Gateway: previewData.Gateway,
	}

	var buf bytes.Buffer
	if err := t.Execute(&buf, data); err != nil {
		errorResponse(c, 400, "template execution error: "+err.Error())
		return
	}

	ok(c, gin.H{"output": buf.String()})
}

// GetVariables returns available template variables
func (h *TemplateHandler) GetVariables(c *gin.Context) {
	variables := []gin.H{
		{"name": "MAC", "description": "Device MAC address", "example": "02:42:ac:1e:00:99"},
		{"name": "IP", "description": "Device IP address", "example": "172.30.0.99"},
		{"name": "Hostname", "description": "Device hostname", "example": "switch-01"},
		{"name": "Vendor", "description": "Device vendor", "example": "cisco"},
		{"name": "SerialNumber", "description": "Device serial number", "example": "SN12345"},
		{"name": "Subnet", "description": "Network subnet mask", "example": "255.255.255.0"},
		{"name": "Gateway", "description": "Default gateway", "example": "172.30.0.1"},
		{"name": "SSHUser", "description": "SSH username (if set)", "example": "admin"},
		{"name": "SSHPass", "description": "SSH password (if set)", "example": "password"},
	}
	ok(c, variables)
}

func (h *TemplateHandler) triggerReload() {
	if h.configReload != nil {
		go h.configReload()
	}
}
