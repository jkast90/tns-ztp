package handlers

import (
	"github.com/gin-gonic/gin"
	"github.com/ztp-server/backend/db"
	"github.com/ztp-server/backend/models"
	"github.com/ztp-server/backend/utils"
)

// BackupTrigger is a function that triggers a backup for a device
type BackupTrigger func(mac string) error

// BackupHandler handles backup-related HTTP requests
type BackupHandler struct {
	store         *db.Store
	backupTrigger BackupTrigger
}

// NewBackupHandler creates a new backup handler
func NewBackupHandler(store *db.Store, trigger BackupTrigger) *BackupHandler {
	return &BackupHandler{
		store:         store,
		backupTrigger: trigger,
	}
}

// RegisterRoutes registers all backup routes
func (h *BackupHandler) RegisterRoutes(r *gin.RouterGroup) {
	r.POST("/devices/:mac/backup", h.TriggerBackup)
	r.GET("/devices/:mac/backups", h.ListBackups)
}

// TriggerBackup initiates a manual backup for a device
func (h *BackupHandler) TriggerBackup(c *gin.Context) {
	mac := utils.NormalizeMac(c.Param("mac"))

	device, err := h.requireDevice(c, mac)
	if device == nil {
		return // Response already sent
	}
	if err != nil {
		return
	}

	if h.backupTrigger == nil {
		errorResponse(c, 500, "backup service not configured")
		return
	}

	go h.backupTrigger(mac)

	accepted(c, "backup initiated")
}

// ListBackups returns all backups for a device
func (h *BackupHandler) ListBackups(c *gin.Context) {
	mac := utils.NormalizeMac(c.Param("mac"))

	device, err := h.requireDevice(c, mac)
	if device == nil || err != nil {
		return // Response already sent
	}

	backups, err := h.store.ListBackups(mac)
	if err != nil {
		internalError(c, err)
		return
	}

	if backups == nil {
		backups = []models.Backup{}
	}

	ok(c, backups)
}

// requireDevice checks if a device exists and returns it, or sends an error response
func (h *BackupHandler) requireDevice(c *gin.Context, mac string) (*models.Device, error) {
	device, err := h.store.GetDevice(mac)
	if err != nil {
		internalError(c, err)
		return nil, err
	}
	if device == nil {
		notFound(c, "device")
		return nil, nil
	}
	return device, nil
}
