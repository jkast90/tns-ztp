package handlers

import (
	"net"

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
	r.GET("/network/addresses", h.GetLocalAddresses)
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

// NetworkInterface represents a network interface with its addresses
type NetworkInterface struct {
	Name      string   `json:"name"`
	Addresses []string `json:"addresses"`
	IsUp      bool     `json:"is_up"`
	IsLoopback bool    `json:"is_loopback"`
}

// GetLocalAddresses returns all local network interfaces and their IP addresses
func (h *SettingsHandler) GetLocalAddresses(c *gin.Context) {
	interfaces, err := net.Interfaces()
	if err != nil {
		internalError(c, err)
		return
	}

	var result []NetworkInterface
	for _, iface := range interfaces {
		ni := NetworkInterface{
			Name:       iface.Name,
			IsUp:       iface.Flags&net.FlagUp != 0,
			IsLoopback: iface.Flags&net.FlagLoopback != 0,
		}

		addrs, err := iface.Addrs()
		if err != nil {
			continue
		}

		for _, addr := range addrs {
			ni.Addresses = append(ni.Addresses, addr.String())
		}

		// Only include interfaces that are up and have addresses
		if ni.IsUp && len(ni.Addresses) > 0 {
			result = append(result, ni)
		}
	}

	ok(c, result)
}
