package handlers

import (
	"bytes"
	"regexp"
	"strings"
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
	// Static routes for special endpoints must come before parameterized routes
	r.GET("/templates/_/variables", h.GetVariables)
	r.POST("/templates/_/templatize", h.Templatize)
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
	okList(c, templates)
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

// DetectedVariable represents a detected variable in config text
type DetectedVariable struct {
	Name        string `json:"name"`
	Value       string `json:"value"`
	Type        string `json:"type"`
	StartIndex  int    `json:"start_index"`
	EndIndex    int    `json:"end_index"`
	Description string `json:"description"`
}

// TemplatizeRequest is the request body for templatize endpoint
type TemplatizeRequest struct {
	Content   string             `json:"content"`
	Variables []DetectedVariable `json:"variables,omitempty"`
}

// TemplatizeResponse is the response from templatize endpoint
type TemplatizeResponse struct {
	DetectedVariables []DetectedVariable `json:"detected_variables"`
	TemplateContent   string             `json:"template_content"`
}

// Variable detection patterns
var (
	ipv4Pattern     = regexp.MustCompile(`\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b`)
	macPattern      = regexp.MustCompile(`\b(?:[0-9a-fA-F]{2}[:-]){5}[0-9a-fA-F]{2}\b`)
	hostnamePattern = regexp.MustCompile(`\bhostname\s+([a-zA-Z][a-zA-Z0-9_-]*)\b`)
	subnetPattern   = regexp.MustCompile(`\b255\.(?:255|254|252|248|240|224|192|128|0)\.(?:255|254|252|248|240|224|192|128|0)\.(?:255|254|252|248|240|224|192|128|0)\b`)
)

// Templatize analyzes config text and detects/replaces variables
func (h *TemplateHandler) Templatize(c *gin.Context) {
	var req TemplatizeRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		badRequest(c, err)
		return
	}

	if req.Content == "" {
		errorResponse(c, 400, "content is required")
		return
	}

	// If variables are provided, apply them to create template
	if len(req.Variables) > 0 {
		templateContent := applyVariables(req.Content, req.Variables)
		ok(c, TemplatizeResponse{
			DetectedVariables: req.Variables,
			TemplateContent:   templateContent,
		})
		return
	}

	// Otherwise, detect variables in the content
	detected := detectVariables(req.Content)

	ok(c, TemplatizeResponse{
		DetectedVariables: detected,
		TemplateContent:   req.Content, // Original content until user confirms variables
	})
}

// detectVariables scans content for common variable patterns
func detectVariables(content string) []DetectedVariable {
	var detected []DetectedVariable
	seen := make(map[string]bool) // Track seen values to avoid duplicates

	// Detect hostnames (from "hostname <name>" commands)
	for _, match := range hostnamePattern.FindAllStringSubmatchIndex(content, -1) {
		if len(match) >= 4 {
			value := content[match[2]:match[3]]
			if !seen[value] {
				seen[value] = true
				detected = append(detected, DetectedVariable{
					Name:        "Hostname",
					Value:       value,
					Type:        "hostname",
					StartIndex:  match[2],
					EndIndex:    match[3],
					Description: "Device hostname",
				})
			}
		}
	}

	// Detect subnet masks (must come before general IPs to avoid false positives)
	for _, match := range subnetPattern.FindAllStringIndex(content, -1) {
		value := content[match[0]:match[1]]
		if !seen[value] {
			seen[value] = true
			detected = append(detected, DetectedVariable{
				Name:        "Subnet",
				Value:       value,
				Type:        "subnet",
				StartIndex:  match[0],
				EndIndex:    match[1],
				Description: "Subnet mask",
			})
		}
	}

	// Detect IP addresses
	for _, match := range ipv4Pattern.FindAllStringIndex(content, -1) {
		value := content[match[0]:match[1]]
		// Skip if already detected as subnet
		if seen[value] {
			continue
		}
		seen[value] = true

		// Try to determine IP type based on context
		varType := "ip"
		varName := "IP"
		description := "IP address"

		// Check surrounding context for clues
		start := match[0] - 50
		if start < 0 {
			start = 0
		}
		end := match[1] + 50
		if end > len(content) {
			end = len(content)
		}
		context := strings.ToLower(content[start:end])

		if strings.Contains(context, "gateway") || strings.Contains(context, "default-gateway") {
			varName = "Gateway"
			varType = "gateway"
			description = "Default gateway"
		} else if strings.Contains(context, "tftp") || strings.Contains(context, "server") {
			varName = "TFTPServer"
			varType = "server"
			description = "TFTP/config server"
		}

		detected = append(detected, DetectedVariable{
			Name:        varName,
			Value:       value,
			Type:        varType,
			StartIndex:  match[0],
			EndIndex:    match[1],
			Description: description,
		})
	}

	// Detect MAC addresses
	for _, match := range macPattern.FindAllStringIndex(content, -1) {
		value := content[match[0]:match[1]]
		if !seen[value] {
			seen[value] = true
			detected = append(detected, DetectedVariable{
				Name:        "MAC",
				Value:       value,
				Type:        "mac",
				StartIndex:  match[0],
				EndIndex:    match[1],
				Description: "MAC address",
			})
		}
	}

	return detected
}

// applyVariables replaces detected values with template variables
func applyVariables(content string, variables []DetectedVariable) string {
	// Sort variables by start index in reverse order so replacements don't affect indices
	// We'll use a simple approach: replace values directly
	result := content

	// Group variables by value to handle multiple occurrences
	valueToVar := make(map[string]string)
	for _, v := range variables {
		if v.Name != "" {
			valueToVar[v.Value] = v.Name
		}
	}

	// Replace each unique value with its template variable
	for value, varName := range valueToVar {
		// Use {{.VarName}} syntax for Go templates
		replacement := "{{." + varName + "}}"
		result = strings.ReplaceAll(result, value, replacement)
	}

	return result
}
