package handlers

import (
	"github.com/gin-gonic/gin"
	"github.com/ztp-server/backend/db"
	"github.com/ztp-server/backend/models"
)

// SettingsHandler handles settings-related HTTP requests
type SettingsHandler struct {
	store        *db.Store
	configReload func() error
}

// NewSettingsHandler creates a new settings handler
func NewSettingsHandler(store *db.Store, configReload func() error) *SettingsHandler {
	return &SettingsHandler{
		store:        store,
		configReload: configReload,
	}
}

// RegisterRoutes registers all settings routes
func (h *SettingsHandler) RegisterRoutes(r *gin.RouterGroup) {
	r.GET("/settings", h.Get)
	r.PUT("/settings", h.Update)
	r.POST("/reload", h.Reload)
}

// Get returns the global settings
func (h *SettingsHandler) Get(c *gin.Context) {
	settings, err := h.store.GetSettings()
	if err != nil {
		internalError(c, err)
		return
	}

	ok(c, settings)
}

// Update modifies the global settings
func (h *SettingsHandler) Update(c *gin.Context) {
	var settings models.Settings
	if err := c.ShouldBindJSON(&settings); err != nil {
		badRequest(c, err)
		return
	}

	if err := h.store.UpdateSettings(&settings); err != nil {
		internalError(c, err)
		return
	}

	h.triggerReload()
	ok(c, settings)
}

// Reload triggers a manual config regeneration
func (h *SettingsHandler) Reload(c *gin.Context) {
	if h.configReload == nil {
		errorResponse(c, 500, "config reload not configured")
		return
	}

	if err := h.configReload(); err != nil {
		internalError(c, err)
		return
	}

	message(c, "configuration reloaded")
}

func (h *SettingsHandler) triggerReload() {
	if h.configReload != nil {
		go h.configReload()
	}
}
