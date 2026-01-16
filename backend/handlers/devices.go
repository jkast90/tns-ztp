package handlers

import (
	"github.com/gin-gonic/gin"
	"github.com/ztp-server/backend/db"
	"github.com/ztp-server/backend/models"
	"github.com/ztp-server/backend/utils"
)

// DeviceHandler handles device-related HTTP requests
type DeviceHandler struct {
	store        *db.Store
	configReload func() error
}

// NewDeviceHandler creates a new device handler
func NewDeviceHandler(store *db.Store, configReload func() error) *DeviceHandler {
	return &DeviceHandler{
		store:        store,
		configReload: configReload,
	}
}

// RegisterRoutes registers all device routes
func (h *DeviceHandler) RegisterRoutes(r *gin.RouterGroup) {
	r.GET("/devices", h.List)
	r.GET("/devices/:mac", h.Get)
	r.POST("/devices", h.Create)
	r.PUT("/devices/:mac", h.Update)
	r.DELETE("/devices/:mac", h.Delete)
}

// List returns all devices
func (h *DeviceHandler) List(c *gin.Context) {
	devices, err := h.store.ListDevices()
	if err != nil {
		internalError(c, err)
		return
	}

	if devices == nil {
		devices = []models.Device{}
	}

	ok(c, devices)
}

// Get returns a single device by MAC
func (h *DeviceHandler) Get(c *gin.Context) {
	mac := utils.NormalizeMac(c.Param("mac"))

	device, err := h.store.GetDevice(mac)
	if err != nil {
		internalError(c, err)
		return
	}

	if device == nil {
		notFound(c, "device")
		return
	}

	ok(c, device)
}

// Create adds a new device
func (h *DeviceHandler) Create(c *gin.Context) {
	var device models.Device
	if err := c.ShouldBindJSON(&device); err != nil {
		badRequest(c, err)
		return
	}

	device.MAC = utils.NormalizeMac(device.MAC)

	if device.MAC == "" || device.IP == "" || device.Hostname == "" {
		errorResponse(c, 400, "mac, ip, and hostname are required")
		return
	}

	// Check for duplicate
	existing, _ := h.store.GetDevice(device.MAC)
	if existing != nil {
		conflict(c, "device with this MAC already exists")
		return
	}

	if err := h.store.CreateDevice(&device); err != nil {
		internalError(c, err)
		return
	}

	h.triggerReload()
	created(c, device)
}

// Update modifies an existing device
func (h *DeviceHandler) Update(c *gin.Context) {
	mac := utils.NormalizeMac(c.Param("mac"))

	var device models.Device
	if err := c.ShouldBindJSON(&device); err != nil {
		badRequest(c, err)
		return
	}

	device.MAC = mac

	if err := h.store.UpdateDevice(&device); handleError(c, err, true) {
		return
	}

	h.triggerReload()
	ok(c, device)
}

// Delete removes a device
func (h *DeviceHandler) Delete(c *gin.Context) {
	mac := utils.NormalizeMac(c.Param("mac"))

	if err := h.store.DeleteDevice(mac); handleError(c, err, true) {
		return
	}

	h.triggerReload()
	noContent(c)
}

func (h *DeviceHandler) triggerReload() {
	if h.configReload != nil {
		go h.configReload()
	}
}
