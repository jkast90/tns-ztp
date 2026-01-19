package handlers

import (
	"bufio"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/ztp-server/backend/db"
	"github.com/ztp-server/backend/models"
)

// DiscoveredDevice represents a device found in DHCP leases but not yet configured
type DiscoveredDevice struct {
	MAC        string `json:"mac"`
	IP         string `json:"ip"`
	Hostname   string `json:"hostname"`
	ExpiryTime int64  `json:"expiry_time"`
	ExpiresAt  string `json:"expires_at"`
	FirstSeen  string `json:"first_seen"`
}

// DiscoveryHandler handles device discovery from DHCP leases
type DiscoveryHandler struct {
	store         *db.Store
	leasePath     string
	clearKnownFn  func()
}

// NewDiscoveryHandler creates a new discovery handler
func NewDiscoveryHandler(store *db.Store, leasePath string, clearKnownFn func()) *DiscoveryHandler {
	return &DiscoveryHandler{
		store:        store,
		leasePath:    leasePath,
		clearKnownFn: clearKnownFn,
	}
}

// RegisterRoutes registers all discovery routes
func (h *DiscoveryHandler) RegisterRoutes(r *gin.RouterGroup) {
	r.GET("/discovery", h.List)
	r.GET("/discovery/leases", h.ListAllLeases)
	r.GET("/discovery/logs", h.ListLogs)
	r.POST("/discovery/clear", h.ClearKnown)
	r.DELETE("/discovery/logs", h.ClearLogs)
}

// ClearKnown clears the known MACs so all current leases will trigger notifications
func (h *DiscoveryHandler) ClearKnown(c *gin.Context) {
	if h.clearKnownFn != nil {
		h.clearKnownFn()
	}
	ok(c, gin.H{"message": "Discovery tracking cleared"})
}

// List returns discovered devices (in DHCP leases but not in device database)
func (h *DiscoveryHandler) List(c *gin.Context) {
	// Get all current leases
	leases, err := h.parseLeaseFile()
	if err != nil {
		internalError(c, err)
		return
	}

	// Get all configured devices
	devices, err := h.store.ListDevices()
	if err != nil {
		internalError(c, err)
		return
	}

	// Build a set of known MACs
	knownMACs := make(map[string]bool)
	for _, d := range devices {
		knownMACs[strings.ToLower(d.MAC)] = true
	}

	// Filter leases to only include unknown devices
	var discovered []DiscoveredDevice
	for _, lease := range leases {
		mac := strings.ToLower(lease.MAC)
		if !knownMACs[mac] {
			discovered = append(discovered, leaseToDiscovered(lease, true))
		}
	}
	okList(c, discovered)
}

// ListAllLeases returns all DHCP leases (for debugging)
func (h *DiscoveryHandler) ListAllLeases(c *gin.Context) {
	leases, err := h.parseLeaseFile()
	if err != nil {
		internalError(c, err)
		return
	}

	var result []DiscoveredDevice
	for _, lease := range leases {
		result = append(result, leaseToDiscovered(lease, false))
	}
	okList(c, result)
}

// Lease represents a DHCP lease entry
type Lease struct {
	ExpiryTime int64
	MAC        string
	IP         string
	Hostname   string
	ClientID   string
}

// leaseToDiscovered converts a Lease to a DiscoveredDevice
func leaseToDiscovered(lease *Lease, includeFirstSeen bool) DiscoveredDevice {
	d := DiscoveredDevice{
		MAC:        lease.MAC,
		IP:         lease.IP,
		Hostname:   lease.Hostname,
		ExpiryTime: lease.ExpiryTime,
		ExpiresAt:  time.Unix(lease.ExpiryTime, 0).Format(time.RFC3339),
	}
	if includeFirstSeen {
		d.FirstSeen = time.Now().Format(time.RFC3339)
	}
	return d
}

func (h *DiscoveryHandler) parseLeaseFile() ([]*Lease, error) {
	file, err := os.Open(h.leasePath)
	if err != nil {
		// Return empty list if lease file doesn't exist yet
		if os.IsNotExist(err) {
			return []*Lease{}, nil
		}
		return nil, err
	}
	defer file.Close()

	var leases []*Lease
	scanner := bufio.NewScanner(file)

	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}

		lease, err := h.parseLeaseLine(line)
		if err != nil {
			continue
		}
		leases = append(leases, lease)
	}

	return leases, scanner.Err()
}

// parseLeaseLine parses a dnsmasq lease file line
// Format: expiry_time mac_address ip_address hostname client_id
func (h *DiscoveryHandler) parseLeaseLine(line string) (*Lease, error) {
	fields := strings.Fields(line)
	if len(fields) < 4 {
		return nil, nil
	}

	expiry, err := strconv.ParseInt(fields[0], 10, 64)
	if err != nil {
		return nil, err
	}

	lease := &Lease{
		ExpiryTime: expiry,
		MAC:        strings.ToLower(fields[1]),
		IP:         fields[2],
		Hostname:   fields[3],
	}

	if len(fields) > 4 {
		lease.ClientID = fields[4]
	}

	return lease, nil
}

// ListLogs returns discovery log entries
func (h *DiscoveryHandler) ListLogs(c *gin.Context) {
	limitStr := c.DefaultQuery("limit", "100")
	limit, _ := strconv.Atoi(limitStr)

	logs, err := h.store.ListDiscoveryLogs(limit)
	if err != nil {
		internalError(c, err)
		return
	}
	okList(c, logs)
}

// ClearLogs removes all discovery log entries
func (h *DiscoveryHandler) ClearLogs(c *gin.Context) {
	if err := h.store.ClearDiscoveryLogs(); err != nil {
		internalError(c, err)
		return
	}
	ok(c, gin.H{"message": "Discovery logs cleared"})
}

// LogDiscoveryEvent creates a discovery log entry (exported for use by other components)
func (h *DiscoveryHandler) LogDiscoveryEvent(eventType, mac, ip, hostname, vendor, message string) {
	log := &models.DiscoveryLog{
		EventType: eventType,
		MAC:       mac,
		IP:        ip,
		Hostname:  hostname,
		Vendor:    vendor,
		Message:   message,
	}
	h.store.CreateDiscoveryLog(log)
}
