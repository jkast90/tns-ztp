package handlers

import (
	"log"
	"os"
	"path/filepath"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/ztp-server/backend/db"
	"github.com/ztp-server/backend/utils"
	"github.com/ztp-server/backend/ws"
)

// ConfigServerHandler serves device config files and broadcasts WebSocket events
type ConfigServerHandler struct {
	store   *db.Store
	hub     *ws.Hub
	tftpDir string
}

// NewConfigServerHandler creates a new config server handler
func NewConfigServerHandler(store *db.Store, hub *ws.Hub, tftpDir string) *ConfigServerHandler {
	return &ConfigServerHandler{
		store:   store,
		hub:     hub,
		tftpDir: tftpDir,
	}
}

// RegisterRoutes registers the config server routes
func (h *ConfigServerHandler) RegisterRoutes(router *gin.Engine) {
	// Serve config files with WebSocket notification
	router.GET("/configs/:filename", h.ServeConfig)
}

// ServeConfig serves a config file and broadcasts a WebSocket event
func (h *ConfigServerHandler) ServeConfig(c *gin.Context) {
	filename := c.Param("filename")

	// Validate filename to prevent directory traversal
	if strings.Contains(filename, "..") || strings.Contains(filename, "/") {
		c.String(403, "Forbidden")
		return
	}

	configPath := filepath.Join(h.tftpDir, filename)

	// Check if file exists
	if _, err := os.Stat(configPath); os.IsNotExist(err) {
		c.String(404, "Config not found")
		return
	}

	// Extract MAC from filename (format: aa_bb_cc_dd_ee_ff.cfg)
	mac := ""
	hostname := ""
	clientIP := c.ClientIP()

	if strings.HasSuffix(filename, ".cfg") {
		macPart := strings.TrimSuffix(filename, ".cfg")
		mac = strings.ReplaceAll(macPart, "_", ":")
		mac = utils.NormalizeMac(mac)

		// Look up device info
		device, err := h.store.GetDevice(mac)
		if err == nil && device != nil {
			hostname = device.Hostname
		}
	}

	// Broadcast config pulled event
	if mac != "" {
		h.hub.BroadcastConfigPulled(mac, clientIP, hostname, filename, "http")
		log.Printf("Config pulled via HTTP: %s by %s", filename, clientIP)
	}

	// Serve the file
	c.File(configPath)
}
