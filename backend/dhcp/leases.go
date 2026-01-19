package dhcp

import (
	"bufio"
	"fmt"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/ztp-server/backend/models"
)

// LeaseCallback is a function called when a new lease is detected
type LeaseCallback func(lease *models.Lease)

// LeaseWatcher monitors the dnsmasq lease file for changes
type LeaseWatcher struct {
	leasePath string
	callbacks []LeaseCallback
	stopCh    chan struct{}
	knownMACs map[string]int64 // MAC -> expiry time
}

// NewLeaseWatcher creates a new lease watcher
func NewLeaseWatcher(leasePath string, callbacks ...LeaseCallback) *LeaseWatcher {
	return &LeaseWatcher{
		leasePath: leasePath,
		callbacks: callbacks,
		stopCh:    make(chan struct{}),
		knownMACs: make(map[string]int64),
	}
}

// AddCallback adds a new callback to be notified on lease changes
func (w *LeaseWatcher) AddCallback(callback LeaseCallback) {
	w.callbacks = append(w.callbacks, callback)
}

// Start begins watching the lease file
func (w *LeaseWatcher) Start() {
	go w.watch()
}

// Stop stops watching the lease file
func (w *LeaseWatcher) Stop() {
	close(w.stopCh)
}

// ClearKnownMACs resets the known MACs and immediately re-checks leases to trigger notifications
func (w *LeaseWatcher) ClearKnownMACs() {
	w.knownMACs = make(map[string]int64)
	// Immediately check leases to trigger notifications for all current devices
	w.checkLeases()
}

func (w *LeaseWatcher) watch() {
	ticker := time.NewTicker(5 * time.Second)
	defer ticker.Stop()

	// Initial read
	w.checkLeases()

	for {
		select {
		case <-w.stopCh:
			return
		case <-ticker.C:
			w.checkLeases()
		}
	}
}

func (w *LeaseWatcher) checkLeases() {
	leases, err := w.parseLeaseFile()
	if err != nil {
		return
	}

	for _, lease := range leases {
		// Check if this is a new or renewed lease
		prevExpiry, known := w.knownMACs[lease.MAC]
		if !known || lease.ExpiryTime > prevExpiry {
			w.knownMACs[lease.MAC] = lease.ExpiryTime
			// Notify all callbacks
			for _, callback := range w.callbacks {
				if callback != nil {
					callback(lease)
				}
			}
		}
	}
}

func (w *LeaseWatcher) parseLeaseFile() ([]*models.Lease, error) {
	file, err := os.Open(w.leasePath)
	if err != nil {
		return nil, err
	}
	defer file.Close()

	var leases []*models.Lease
	scanner := bufio.NewScanner(file)

	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}

		lease, err := parseLeaseLine(line)
		if err != nil {
			continue
		}
		leases = append(leases, lease)
	}

	return leases, scanner.Err()
}

// parseLeaseLine parses a dnsmasq lease file line
// Format: expiry_time mac_address ip_address hostname client_id
func parseLeaseLine(line string) (*models.Lease, error) {
	fields := strings.Fields(line)
	if len(fields) < 4 {
		return nil, fmt.Errorf("invalid lease line: %s", line)
	}

	expiry, err := strconv.ParseInt(fields[0], 10, 64)
	if err != nil {
		return nil, err
	}

	lease := &models.Lease{
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
