package handlers

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/ztp-server/backend/db"
	"github.com/ztp-server/backend/models"
	"github.com/ztp-server/backend/netbox"
)

// NetBoxHandler handles NetBox-related HTTP requests
type NetBoxHandler struct {
	store *db.Store
}

// NewNetBoxHandler creates a new NetBox handler
func NewNetBoxHandler(store *db.Store) *NetBoxHandler {
	return &NetBoxHandler{
		store: store,
	}
}

// RegisterRoutes registers all NetBox routes
func (h *NetBoxHandler) RegisterRoutes(r *gin.RouterGroup) {
	r.GET("/netbox/status", h.Status)
	r.GET("/netbox/config", h.GetConfig)
	r.PUT("/netbox/config", h.UpdateConfig)
	r.POST("/netbox/sync/push", h.SyncPush)
	r.POST("/netbox/sync/pull", h.SyncPull)
	r.POST("/netbox/sync/vendors/push", h.SyncVendorsPush)
	r.POST("/netbox/sync/vendors/pull", h.SyncVendorsPull)
	r.GET("/netbox/manufacturers", h.ListManufacturers)
	r.GET("/netbox/sites", h.ListSites)
	r.GET("/netbox/device-roles", h.ListDeviceRoles)
}

// NetBoxConfig represents the NetBox configuration
type NetBoxConfig struct {
	URL         string `json:"url"`
	Token       string `json:"token"`
	SiteID      int    `json:"site_id"`
	RoleID      int    `json:"role_id"`
	SyncEnabled bool   `json:"sync_enabled"`
}

// Status checks NetBox connectivity
func (h *NetBoxHandler) Status(c *gin.Context) {
	config, err := h.store.GetNetBoxConfig()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	if config.URL == "" || config.Token == "" {
		c.JSON(http.StatusOK, gin.H{
			"connected":  false,
			"configured": false,
			"message":    "NetBox not configured",
		})
		return
	}

	sync := netbox.NewSyncService(config.URL, config.Token)
	err = sync.CheckConnection()

	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"connected":  false,
			"configured": true,
			"error":      err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"connected":  true,
		"configured": true,
		"url":        config.URL,
	})
}

// GetConfig returns the NetBox configuration
func (h *NetBoxHandler) GetConfig(c *gin.Context) {
	config, err := h.store.GetNetBoxConfig()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Don't expose the full token
	maskedToken := ""
	if config.Token != "" {
		if len(config.Token) > 8 {
			maskedToken = config.Token[:4] + "..." + config.Token[len(config.Token)-4:]
		} else {
			maskedToken = "****"
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"url":          config.URL,
		"token":        maskedToken,
		"site_id":      config.SiteID,
		"role_id":      config.RoleID,
		"sync_enabled": config.SyncEnabled,
	})
}

// UpdateConfig updates the NetBox configuration
func (h *NetBoxHandler) UpdateConfig(c *gin.Context) {
	var config NetBoxConfig
	if err := c.ShouldBindJSON(&config); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Get existing config to preserve token if not provided
	existing, _ := h.store.GetNetBoxConfig()
	if config.Token == "" && existing != nil {
		config.Token = existing.Token
	}

	if err := h.store.SaveNetBoxConfig(&db.NetBoxConfig{
		URL:         config.URL,
		Token:       config.Token,
		SiteID:      config.SiteID,
		RoleID:      config.RoleID,
		SyncEnabled: config.SyncEnabled,
	}); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "NetBox configuration updated"})
}

// SyncPush pushes devices from ZTP to NetBox
func (h *NetBoxHandler) SyncPush(c *gin.Context) {
	config, err := h.store.GetNetBoxConfig()
	if err != nil || config.URL == "" || config.Token == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "NetBox not configured"})
		return
	}

	// Get all devices
	devices, err := h.store.ListDevices()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Get vendors for manufacturer mapping
	vendors, err := h.store.ListVendors()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	sync := netbox.NewSyncService(config.URL, config.Token)
	if config.SiteID > 0 {
		sync.DefaultSiteID = config.SiteID
	}
	if config.RoleID > 0 {
		sync.DefaultRoleID = config.RoleID
	}

	result := sync.PushDevices(devices, vendors)

	c.JSON(http.StatusOK, gin.H{
		"message": "Sync push completed",
		"result":  result,
	})
}

// SyncPull pulls devices from NetBox to ZTP
func (h *NetBoxHandler) SyncPull(c *gin.Context) {
	config, err := h.store.GetNetBoxConfig()
	if err != nil || config.URL == "" || config.Token == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "NetBox not configured"})
		return
	}

	sync := netbox.NewSyncService(config.URL, config.Token)

	// Pull devices from NetBox
	devices, result, err := sync.PullDevices()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Import devices into ZTP (skip existing)
	imported := 0
	skipped := 0
	for _, device := range devices {
		// Check if device already exists
		existing, _ := h.store.GetDevice(device.MAC)
		if existing != nil {
			skipped++
			continue
		}

		// Create device in ZTP
		if err := h.store.CreateDevice(&device); err != nil {
			result.Errors = append(result.Errors, device.Hostname+": "+err.Error())
			continue
		}
		imported++
	}

	c.JSON(http.StatusOK, gin.H{
		"message":  "Sync pull completed",
		"imported": imported,
		"skipped":  skipped,
		"result":   result,
	})
}

// ListManufacturers lists manufacturers from NetBox
func (h *NetBoxHandler) ListManufacturers(c *gin.Context) {
	config, err := h.store.GetNetBoxConfig()
	if err != nil || config.URL == "" || config.Token == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "NetBox not configured"})
		return
	}

	sync := netbox.NewSyncService(config.URL, config.Token)
	manufacturers, err := sync.Manufacturers.ListAll()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, manufacturers)
}

// ListSites lists sites from NetBox
func (h *NetBoxHandler) ListSites(c *gin.Context) {
	config, err := h.store.GetNetBoxConfig()
	if err != nil || config.URL == "" || config.Token == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "NetBox not configured"})
		return
	}

	sync := netbox.NewSyncService(config.URL, config.Token)
	sites, err := sync.Sites.ListAll()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, sites)
}

// ListDeviceRoles lists device roles from NetBox
func (h *NetBoxHandler) ListDeviceRoles(c *gin.Context) {
	config, err := h.store.GetNetBoxConfig()
	if err != nil || config.URL == "" || config.Token == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "NetBox not configured"})
		return
	}

	sync := netbox.NewSyncService(config.URL, config.Token)
	roles, err := sync.DeviceRoles.ListAll()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, roles)
}

// SyncVendorsPush pushes local vendors to NetBox as manufacturers
func (h *NetBoxHandler) SyncVendorsPush(c *gin.Context) {
	config, err := h.store.GetNetBoxConfig()
	if err != nil || config.URL == "" || config.Token == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "NetBox not configured"})
		return
	}

	// Get all local vendors
	vendors, err := h.store.ListVendors()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	sync := netbox.NewSyncService(config.URL, config.Token)
	created := 0
	updated := 0
	errors := []string{}

	for _, vendor := range vendors {
		// Check if manufacturer exists
		existing, err := sync.Manufacturers.GetBySlug(vendor.ID)
		if err != nil {
			errors = append(errors, vendor.Name+": "+err.Error())
			continue
		}

		// Build custom fields
		customFields := map[string]any{
			"mac_prefixes":     strings.Join(vendor.MacPrefixes, ","),
			"backup_command":   vendor.BackupCommand,
			"ssh_port":         vendor.SSHPort,
			"vendor_class":     vendor.VendorClass,
			"default_template": vendor.DefaultTemplate,
		}

		if existing == nil {
			// Create new manufacturer
			_, err = sync.Manufacturers.Create(&netbox.ManufacturerCreate{
				Name:         vendor.Name,
				Slug:         vendor.ID,
				CustomFields: customFields,
			})
			if err != nil {
				errors = append(errors, vendor.Name+": "+err.Error())
				continue
			}
			created++
		} else {
			// Update existing manufacturer
			_, err = sync.Manufacturers.Update(existing.ID, &netbox.ManufacturerCreate{
				Name:         vendor.Name,
				Slug:         vendor.ID,
				CustomFields: customFields,
			})
			if err != nil {
				errors = append(errors, vendor.Name+": "+err.Error())
				continue
			}
			updated++
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Vendor sync push completed",
		"result": gin.H{
			"created": created,
			"updated": updated,
			"errors":  errors,
		},
	})
}

// SyncVendorsPull pulls manufacturers from NetBox and imports as vendors
func (h *NetBoxHandler) SyncVendorsPull(c *gin.Context) {
	config, err := h.store.GetNetBoxConfig()
	if err != nil || config.URL == "" || config.Token == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "NetBox not configured"})
		return
	}

	sync := netbox.NewSyncService(config.URL, config.Token)

	// Get all manufacturers from NetBox
	manufacturers, err := sync.Manufacturers.ListAll()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	created := 0
	updated := 0
	errors := []string{}

	for _, mfr := range manufacturers {
		// Extract custom fields
		macPrefixes := []string{}
		backupCommand := "show running-config"
		sshPort := 22
		vendorClass := ""
		defaultTemplate := ""

		if mfr.CustomFields != nil {
			if v, ok := mfr.CustomFields["mac_prefixes"].(string); ok && v != "" {
				// Split comma-separated prefixes
				for _, p := range strings.Split(v, ",") {
					p = strings.TrimSpace(p)
					if p != "" {
						macPrefixes = append(macPrefixes, p)
					}
				}
			}
			if v, ok := mfr.CustomFields["backup_command"].(string); ok && v != "" {
				backupCommand = v
			}
			if v, ok := mfr.CustomFields["ssh_port"].(float64); ok {
				sshPort = int(v)
			}
			if v, ok := mfr.CustomFields["vendor_class"].(string); ok && v != "" {
				vendorClass = v
			}
			if v, ok := mfr.CustomFields["default_template"].(string); ok && v != "" {
				defaultTemplate = v
			}
		}

		vendor := &models.Vendor{
			ID:              mfr.Slug,
			Name:            mfr.Name,
			MacPrefixes:     macPrefixes,
			BackupCommand:   backupCommand,
			SSHPort:         sshPort,
			VendorClass:     vendorClass,
			DefaultTemplate: defaultTemplate,
		}

		// Check if vendor exists
		existing, _ := h.store.GetVendor(mfr.Slug)
		if existing == nil {
			// Create new vendor
			if err := h.store.CreateVendor(vendor); err != nil {
				errors = append(errors, mfr.Name+": "+err.Error())
				continue
			}
			created++
		} else {
			// Update existing vendor
			if err := h.store.UpdateVendor(vendor); err != nil {
				errors = append(errors, mfr.Name+": "+err.Error())
				continue
			}
			updated++
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Vendor sync pull completed",
		"result": gin.H{
			"created": created,
			"updated": updated,
			"errors":  errors,
		},
	})
}
