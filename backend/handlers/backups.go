package handlers

import (
	"os"
	"path/filepath"

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
	backupDir     string
}

// NewBackupHandler creates a new backup handler
func NewBackupHandler(store *db.Store, trigger BackupTrigger, backupDir string) *BackupHandler {
	return &BackupHandler{
		store:         store,
		backupTrigger: trigger,
		backupDir:     backupDir,
	}
}

// RegisterRoutes registers all backup routes
func (h *BackupHandler) RegisterRoutes(r *gin.RouterGroup) {
	r.POST("/devices/:mac/backup", h.TriggerBackup)
	r.GET("/devices/:mac/backups", h.ListBackups)
	r.GET("/backups/:id", h.GetBackup)
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

// GetBackup returns the content of a specific backup file
func (h *BackupHandler) GetBackup(c *gin.Context) {
	id := c.Param("id")

	backup, err := h.store.GetBackup(id)
	if err != nil {
		internalError(c, err)
		return
	}

	if backup == nil {
		notFound(c, "backup")
		return
	}

	// Read backup file content
	filePath := filepath.Join(h.backupDir, backup.Filename)
	content, err := os.ReadFile(filePath)
	if err != nil {
		if os.IsNotExist(err) {
			ok(c, gin.H{
				"id":       backup.ID,
				"filename": backup.Filename,
				"content":  "",
				"exists":   false,
			})
			return
		}
		internalError(c, err)
		return
	}

	ok(c, gin.H{
		"id":       backup.ID,
		"filename": backup.Filename,
		"content":  string(content),
		"exists":   true,
	})
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
