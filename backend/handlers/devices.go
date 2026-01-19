package handlers

import (
	"bytes"
	"fmt"
	"net"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/ztp-server/backend/db"
	"github.com/ztp-server/backend/models"
	"github.com/ztp-server/backend/utils"
	"golang.org/x/crypto/ssh"
)

// DeviceHandler handles device-related HTTP requests
type DeviceHandler struct {
	store        *db.Store
	configReload func() error
	tftpDir      string
}

// NewDeviceHandler creates a new device handler
func NewDeviceHandler(store *db.Store, configReload func() error, tftpDir string) *DeviceHandler {
	return &DeviceHandler{
		store:        store,
		configReload: configReload,
		tftpDir:      tftpDir,
	}
}

// RegisterRoutes registers all device routes
func (h *DeviceHandler) RegisterRoutes(r *gin.RouterGroup) {
	r.GET("/devices", h.List)
	r.GET("/devices/:mac", h.Get)
	r.POST("/devices", h.Create)
	r.PUT("/devices/:mac", h.Update)
	r.DELETE("/devices/:mac", h.Delete)
	r.POST("/devices/:mac/connect", h.Connect)
	r.GET("/devices/:mac/config", h.GetConfig)
}

// ConnectResult represents the result of a device connectivity check
type ConnectResult struct {
	Ping    PingResult `json:"ping"`
	SSH     SSHResult  `json:"ssh"`
	Success bool       `json:"success"`
}

// PingResult represents the ping check result
type PingResult struct {
	Reachable bool   `json:"reachable"`
	Latency   string `json:"latency,omitempty"`
	Error     string `json:"error,omitempty"`
}

// SSHResult represents the SSH connection result
type SSHResult struct {
	Connected bool   `json:"connected"`
	Uptime    string `json:"uptime,omitempty"`
	Error     string `json:"error,omitempty"`
}

// Connect tests connectivity to a device via ping and SSH
func (h *DeviceHandler) Connect(c *gin.Context) {
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

	// Get default SSH credentials if device doesn't have them
	sshUser := device.SSHUser
	sshPass := device.SSHPass
	if sshUser == "" || sshPass == "" {
		settings, err := h.store.GetSettings()
		if err == nil && settings != nil {
			if sshUser == "" {
				sshUser = settings.DefaultSSHUser
			}
			if sshPass == "" {
				sshPass = settings.DefaultSSHPass
			}
		}
	}

	result := ConnectResult{}

	// Ping check
	result.Ping = h.pingDevice(device.IP)

	// SSH check (only if ping succeeded or we want to try anyway)
	if sshUser != "" && sshPass != "" {
		result.SSH = h.sshConnect(device.IP, sshUser, sshPass)
	} else {
		result.SSH = SSHResult{
			Connected: false,
			Error:     "No SSH credentials configured",
		}
	}

	result.Success = result.Ping.Reachable && result.SSH.Connected

	// Update device status based on connectivity
	if result.Ping.Reachable {
		h.store.UpdateDeviceStatus(device.MAC, "online")
	}

	ok(c, result)
}

// GetConfig returns the generated configuration for a device
func (h *DeviceHandler) GetConfig(c *gin.Context) {
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

	// Build config file path
	filename := strings.ReplaceAll(mac, ":", "_") + ".cfg"
	configPath := filepath.Join(h.tftpDir, filename)

	// Read config file
	content, err := os.ReadFile(configPath)
	if err != nil {
		if os.IsNotExist(err) {
			ok(c, gin.H{
				"mac":      mac,
				"hostname": device.Hostname,
				"filename": filename,
				"content":  "",
				"exists":   false,
			})
			return
		}
		internalError(c, err)
		return
	}

	ok(c, gin.H{
		"mac":      mac,
		"hostname": device.Hostname,
		"filename": filename,
		"content":  string(content),
		"exists":   true,
	})
}

func (h *DeviceHandler) pingDevice(ip string) PingResult {
	// Use ping command with timeout
	cmd := exec.Command("ping", "-c", "3", "-W", "2", ip)
	output, err := cmd.CombinedOutput()

	if err != nil {
		return PingResult{
			Reachable: false,
			Error:     "Host unreachable",
		}
	}

	// Parse latency from ping output
	outputStr := string(output)
	latency := ""
	if strings.Contains(outputStr, "time=") {
		// Extract average time from stats line
		lines := strings.Split(outputStr, "\n")
		for _, line := range lines {
			if strings.Contains(line, "avg") {
				parts := strings.Split(line, "/")
				if len(parts) >= 5 {
					latency = parts[4] + "ms"
				}
				break
			}
		}
	}

	return PingResult{
		Reachable: true,
		Latency:   latency,
	}
}

func (h *DeviceHandler) sshConnect(ip, user, pass string) SSHResult {
	config := &ssh.ClientConfig{
		User: user,
		Auth: []ssh.AuthMethod{
			ssh.Password(pass),
		},
		HostKeyCallback: ssh.InsecureIgnoreHostKey(),
		Timeout:         10 * time.Second,
	}

	// Try to connect
	addr := net.JoinHostPort(ip, "22")
	client, err := ssh.Dial("tcp", addr, config)
	if err != nil {
		return SSHResult{
			Connected: false,
			Error:     fmt.Sprintf("SSH connection failed: %v", err),
		}
	}
	defer client.Close()

	// Create session to run uptime
	session, err := client.NewSession()
	if err != nil {
		return SSHResult{
			Connected: true,
			Error:     fmt.Sprintf("Failed to create session: %v", err),
		}
	}
	defer session.Close()

	// Run uptime command
	var stdout bytes.Buffer
	session.Stdout = &stdout
	err = session.Run("uptime")
	if err != nil {
		// Try alternative uptime commands for network devices
		session2, _ := client.NewSession()
		if session2 != nil {
			defer session2.Close()
			var stdout2 bytes.Buffer
			session2.Stdout = &stdout2
			// Try "show version" for Cisco-like devices
			if session2.Run("show version | include uptime") == nil {
				return SSHResult{
					Connected: true,
					Uptime:    strings.TrimSpace(stdout2.String()),
				}
			}
		}
		return SSHResult{
			Connected: true,
			Uptime:    "Connected (uptime command not available)",
		}
	}

	return SSHResult{
		Connected: true,
		Uptime:    strings.TrimSpace(stdout.String()),
	}
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
