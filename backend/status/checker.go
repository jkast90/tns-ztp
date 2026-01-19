package status

import (
	"log"
	"os/exec"
	"sync"
	"time"

	"github.com/ztp-server/backend/db"
)

// Checker periodically checks device connectivity and updates status
type Checker struct {
	store    *db.Store
	interval time.Duration
	stop     chan struct{}
	wg       sync.WaitGroup
}

// NewChecker creates a new status checker
func NewChecker(store *db.Store, interval time.Duration) *Checker {
	if interval == 0 {
		interval = 60 * time.Second // Default: check every 60 seconds
	}
	return &Checker{
		store:    store,
		interval: interval,
		stop:     make(chan struct{}),
	}
}

// Start begins the periodic status checking
func (c *Checker) Start() {
	c.wg.Add(1)
	go c.run()
	log.Printf("Status checker started (interval: %v)", c.interval)
}

// Stop stops the status checker
func (c *Checker) Stop() {
	close(c.stop)
	c.wg.Wait()
	log.Println("Status checker stopped")
}

func (c *Checker) run() {
	defer c.wg.Done()

	// Initial check after a short delay
	time.Sleep(5 * time.Second)
	c.checkAll()

	ticker := time.NewTicker(c.interval)
	defer ticker.Stop()

	for {
		select {
		case <-ticker.C:
			c.checkAll()
		case <-c.stop:
			return
		}
	}
}

func (c *Checker) checkAll() {
	devices, err := c.store.ListDevices()
	if err != nil {
		log.Printf("Status checker: failed to list devices: %v", err)
		return
	}

	for _, device := range devices {
		reachable := c.ping(device.IP)
		newStatus := "offline"
		if reachable {
			newStatus = "online"
		}

		// Only update if status changed
		if device.Status != newStatus {
			if err := c.store.UpdateDeviceStatus(device.MAC, newStatus); err != nil {
				log.Printf("Status checker: failed to update device %s: %v", device.MAC, err)
			} else {
				log.Printf("Status checker: device %s (%s) is now %s", device.Hostname, device.IP, newStatus)
			}
		}
	}
}

func (c *Checker) ping(ip string) bool {
	// Quick ping with 1 second timeout, 1 packet
	cmd := exec.Command("ping", "-c", "1", "-W", "1", ip)
	err := cmd.Run()
	return err == nil
}
