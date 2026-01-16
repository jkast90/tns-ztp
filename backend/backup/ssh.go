package backup

import (
	"fmt"
	"log"
	"os"
	"path/filepath"
	"strings"
	"time"

	"golang.org/x/crypto/ssh"

	"github.com/ztp-server/backend/db"
	"github.com/ztp-server/backend/models"
)

// Service handles automated config backups via SSH
type Service struct {
	store       *db.Store
	backupDir   string
	pendingMACs chan string
	stopCh      chan struct{}
}

// NewService creates a new backup service
func NewService(store *db.Store, backupDir string) *Service {
	return &Service{
		store:       store,
		backupDir:   backupDir,
		pendingMACs: make(chan string, 100),
		stopCh:      make(chan struct{}),
	}
}

// Start begins the backup worker
func (s *Service) Start() {
	go s.worker()
}

// Stop stops the backup service
func (s *Service) Stop() {
	close(s.stopCh)
}

// QueueBackup adds a device to the backup queue
func (s *Service) QueueBackup(mac string) {
	select {
	case s.pendingMACs <- mac:
	default:
		log.Printf("Backup queue full, dropping MAC: %s", mac)
	}
}

// TriggerBackup immediately triggers a backup for a device
func (s *Service) TriggerBackup(mac string) error {
	return s.performBackup(mac)
}

// OnNewLease handles a new DHCP lease event
func (s *Service) OnNewLease(lease *models.Lease) {
	// Check if this MAC is registered
	device, err := s.store.GetDevice(lease.MAC)
	if err != nil || device == nil {
		return
	}

	// Update device status
	s.store.UpdateDeviceStatus(lease.MAC, "provisioning")

	// Get settings for backup delay
	settings, err := s.store.GetSettings()
	if err != nil {
		settings = &models.Settings{BackupDelay: 30}
	}

	// Schedule backup after delay
	go func() {
		log.Printf("Scheduling backup for %s (%s) in %d seconds", device.Hostname, lease.IP, settings.BackupDelay)
		time.Sleep(time.Duration(settings.BackupDelay) * time.Second)
		s.QueueBackup(lease.MAC)
	}()
}

func (s *Service) worker() {
	for {
		select {
		case <-s.stopCh:
			return
		case mac := <-s.pendingMACs:
			if err := s.performBackup(mac); err != nil {
				log.Printf("Backup failed for %s: %v", mac, err)
			}
		}
	}
}

func (s *Service) performBackup(mac string) error {
	device, err := s.store.GetDevice(mac)
	if err != nil {
		return fmt.Errorf("failed to get device: %w", err)
	}
	if device == nil {
		return fmt.Errorf("device not found: %s", mac)
	}

	settings, err := s.store.GetSettings()
	if err != nil {
		return fmt.Errorf("failed to get settings: %w", err)
	}

	// Determine credentials
	user := device.SSHUser
	pass := device.SSHPass
	if user == "" {
		user = settings.DefaultSSHUser
	}
	if pass == "" {
		pass = settings.DefaultSSHPass
	}

	// Determine command
	command := settings.BackupCommand
	if command == "" {
		command = "show running-config"
	}

	log.Printf("Starting backup for %s (%s) as %s", device.Hostname, device.IP, user)

	// Connect via SSH with retries
	var config string
	var lastErr error

	for attempt := 1; attempt <= 3; attempt++ {
		config, lastErr = s.sshCommand(device.IP, user, pass, command)
		if lastErr == nil {
			break
		}
		log.Printf("SSH attempt %d failed for %s: %v", attempt, device.IP, lastErr)
		time.Sleep(time.Duration(attempt*5) * time.Second)
	}

	if lastErr != nil {
		s.store.UpdateDeviceStatus(mac, "offline")
		return fmt.Errorf("all SSH attempts failed: %w", lastErr)
	}

	// Save backup
	if err := s.saveBackup(device, config); err != nil {
		return fmt.Errorf("failed to save backup: %w", err)
	}

	// Update device status
	s.store.UpdateDeviceStatus(mac, "online")
	s.store.UpdateDeviceBackupTime(mac)

	log.Printf("Backup completed for %s", device.Hostname)
	return nil
}

func (s *Service) sshCommand(host, user, pass, command string) (string, error) {
	config := &ssh.ClientConfig{
		User: user,
		Auth: []ssh.AuthMethod{
			ssh.Password(pass),
		},
		HostKeyCallback: ssh.InsecureIgnoreHostKey(),
		Timeout:         30 * time.Second,
	}

	// Connect
	addr := fmt.Sprintf("%s:22", host)
	client, err := ssh.Dial("tcp", addr, config)
	if err != nil {
		return "", fmt.Errorf("failed to dial: %w", err)
	}
	defer client.Close()

	// Create session
	session, err := client.NewSession()
	if err != nil {
		return "", fmt.Errorf("failed to create session: %w", err)
	}
	defer session.Close()

	// Run command
	output, err := session.CombinedOutput(command)
	if err != nil {
		return "", fmt.Errorf("command failed: %w", err)
	}

	return string(output), nil
}

func (s *Service) saveBackup(device *models.Device, config string) error {
	// Ensure backup directory exists
	if err := os.MkdirAll(s.backupDir, 0755); err != nil {
		return err
	}

	// Generate filename
	timestamp := time.Now().Format("20060102_150405")
	safeName := strings.ReplaceAll(device.Hostname, "/", "_")
	filename := fmt.Sprintf("%s_%s.cfg", safeName, timestamp)
	filePath := filepath.Join(s.backupDir, filename)

	// Write file
	if err := os.WriteFile(filePath, []byte(config), 0644); err != nil {
		return err
	}

	// Record in database
	info, _ := os.Stat(filePath)
	backup := &models.Backup{
		DeviceMAC: device.MAC,
		Filename:  filename,
		Size:      info.Size(),
		CreatedAt: time.Now(),
	}

	return s.store.CreateBackup(backup)
}
