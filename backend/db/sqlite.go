package db

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"time"

	"github.com/ztp-server/backend/models"

	_ "github.com/mattn/go-sqlite3"
)

// Store handles all database operations
type Store struct {
	db *sql.DB
}

// New creates a new database store
func New(dbPath string) (*Store, error) {
	db, err := sql.Open("sqlite3", dbPath)
	if err != nil {
		return nil, fmt.Errorf("failed to open database: %w", err)
	}

	store := &Store{db: db}
	if err := store.migrate(); err != nil {
		return nil, fmt.Errorf("failed to migrate database: %w", err)
	}

	return store, nil
}

// Close closes the database connection
func (s *Store) Close() error {
	return s.db.Close()
}

func (s *Store) migrate() error {
	schema := `
	CREATE TABLE IF NOT EXISTS devices (
		mac TEXT PRIMARY KEY,
		ip TEXT NOT NULL,
		hostname TEXT NOT NULL,
		serial_number TEXT DEFAULT '',
		config_template TEXT DEFAULT '',
		ssh_user TEXT DEFAULT '',
		ssh_pass TEXT DEFAULT '',
		status TEXT DEFAULT 'offline',
		last_seen DATETIME,
		last_backup DATETIME,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
	);

	CREATE TABLE IF NOT EXISTS settings (
		id INTEGER PRIMARY KEY CHECK (id = 1),
		data TEXT NOT NULL
	);

	CREATE TABLE IF NOT EXISTS backups (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		device_mac TEXT NOT NULL,
		filename TEXT NOT NULL,
		size INTEGER DEFAULT 0,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		FOREIGN KEY (device_mac) REFERENCES devices(mac) ON DELETE CASCADE
	);

	CREATE INDEX IF NOT EXISTS idx_backups_device ON backups(device_mac);
	`

	if _, err := s.db.Exec(schema); err != nil {
		return err
	}

	// Initialize default settings if not exists
	var count int
	if err := s.db.QueryRow("SELECT COUNT(*) FROM settings").Scan(&count); err != nil {
		return err
	}

	if count == 0 {
		defaults := models.DefaultSettings()
		data, _ := json.Marshal(defaults)
		_, err := s.db.Exec("INSERT INTO settings (id, data) VALUES (1, ?)", string(data))
		if err != nil {
			return err
		}
	}

	// Migration: Add serial_number column if it doesn't exist
	s.db.Exec("ALTER TABLE devices ADD COLUMN serial_number TEXT DEFAULT ''")

	return nil
}

// Device operations

// ListDevices returns all devices
func (s *Store) ListDevices() ([]models.Device, error) {
	rows, err := s.db.Query(`
		SELECT mac, ip, hostname, serial_number, config_template, ssh_user, ssh_pass,
		       status, last_seen, last_backup, created_at, updated_at
		FROM devices ORDER BY hostname
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var devices []models.Device
	for rows.Next() {
		var d models.Device
		var lastSeen, lastBackup sql.NullTime
		err := rows.Scan(
			&d.MAC, &d.IP, &d.Hostname, &d.SerialNumber, &d.ConfigTemplate,
			&d.SSHUser, &d.SSHPass, &d.Status,
			&lastSeen, &lastBackup, &d.CreatedAt, &d.UpdatedAt,
		)
		if err != nil {
			return nil, err
		}
		if lastSeen.Valid {
			d.LastSeen = &lastSeen.Time
		}
		if lastBackup.Valid {
			d.LastBackup = &lastBackup.Time
		}
		devices = append(devices, d)
	}

	return devices, rows.Err()
}

// GetDevice returns a device by MAC address
func (s *Store) GetDevice(mac string) (*models.Device, error) {
	var d models.Device
	var lastSeen, lastBackup sql.NullTime

	err := s.db.QueryRow(`
		SELECT mac, ip, hostname, serial_number, config_template, ssh_user, ssh_pass,
		       status, last_seen, last_backup, created_at, updated_at
		FROM devices WHERE mac = ?
	`, mac).Scan(
		&d.MAC, &d.IP, &d.Hostname, &d.SerialNumber, &d.ConfigTemplate,
		&d.SSHUser, &d.SSHPass, &d.Status,
		&lastSeen, &lastBackup, &d.CreatedAt, &d.UpdatedAt,
	)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}

	if lastSeen.Valid {
		d.LastSeen = &lastSeen.Time
	}
	if lastBackup.Valid {
		d.LastBackup = &lastBackup.Time
	}

	return &d, nil
}

// CreateDevice creates a new device
func (s *Store) CreateDevice(d *models.Device) error {
	now := time.Now()
	d.CreatedAt = now
	d.UpdatedAt = now
	d.Status = "offline"

	_, err := s.db.Exec(`
		INSERT INTO devices (mac, ip, hostname, serial_number, config_template, ssh_user, ssh_pass, status, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	`, d.MAC, d.IP, d.Hostname, d.SerialNumber, d.ConfigTemplate, d.SSHUser, d.SSHPass, d.Status, d.CreatedAt, d.UpdatedAt)

	return err
}

// UpdateDevice updates an existing device
func (s *Store) UpdateDevice(d *models.Device) error {
	d.UpdatedAt = time.Now()

	result, err := s.db.Exec(`
		UPDATE devices SET ip = ?, hostname = ?, serial_number = ?, config_template = ?,
		       ssh_user = ?, ssh_pass = ?, updated_at = ?
		WHERE mac = ?
	`, d.IP, d.Hostname, d.SerialNumber, d.ConfigTemplate, d.SSHUser, d.SSHPass, d.UpdatedAt, d.MAC)
	if err != nil {
		return err
	}

	rows, _ := result.RowsAffected()
	if rows == 0 {
		return fmt.Errorf("device not found: %s", d.MAC)
	}

	return nil
}

// DeleteDevice removes a device
func (s *Store) DeleteDevice(mac string) error {
	result, err := s.db.Exec("DELETE FROM devices WHERE mac = ?", mac)
	if err != nil {
		return err
	}

	rows, _ := result.RowsAffected()
	if rows == 0 {
		return fmt.Errorf("device not found: %s", mac)
	}

	return nil
}

// UpdateDeviceStatus updates device status and last_seen
func (s *Store) UpdateDeviceStatus(mac, status string) error {
	_, err := s.db.Exec(`
		UPDATE devices SET status = ?, last_seen = ?, updated_at = ?
		WHERE mac = ?
	`, status, time.Now(), time.Now(), mac)
	return err
}

// UpdateDeviceBackupTime updates the last backup timestamp
func (s *Store) UpdateDeviceBackupTime(mac string) error {
	now := time.Now()
	_, err := s.db.Exec(`
		UPDATE devices SET last_backup = ?, updated_at = ?
		WHERE mac = ?
	`, now, now, mac)
	return err
}

// Settings operations

// GetSettings returns the global settings
func (s *Store) GetSettings() (*models.Settings, error) {
	var data string
	err := s.db.QueryRow("SELECT data FROM settings WHERE id = 1").Scan(&data)
	if err != nil {
		return nil, err
	}

	var settings models.Settings
	if err := json.Unmarshal([]byte(data), &settings); err != nil {
		return nil, err
	}

	return &settings, nil
}

// UpdateSettings updates the global settings
func (s *Store) UpdateSettings(settings *models.Settings) error {
	data, err := json.Marshal(settings)
	if err != nil {
		return err
	}

	_, err = s.db.Exec("UPDATE settings SET data = ? WHERE id = 1", string(data))
	return err
}

// Backup operations

// CreateBackup records a new backup
func (s *Store) CreateBackup(b *models.Backup) error {
	result, err := s.db.Exec(`
		INSERT INTO backups (device_mac, filename, size, created_at)
		VALUES (?, ?, ?, ?)
	`, b.DeviceMAC, b.Filename, b.Size, time.Now())
	if err != nil {
		return err
	}

	id, _ := result.LastInsertId()
	b.ID = id
	return nil
}

// ListBackups returns all backups for a device
func (s *Store) ListBackups(mac string) ([]models.Backup, error) {
	rows, err := s.db.Query(`
		SELECT id, device_mac, filename, size, created_at
		FROM backups WHERE device_mac = ?
		ORDER BY created_at DESC
	`, mac)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var backups []models.Backup
	for rows.Next() {
		var b models.Backup
		if err := rows.Scan(&b.ID, &b.DeviceMAC, &b.Filename, &b.Size, &b.CreatedAt); err != nil {
			return nil, err
		}
		backups = append(backups, b)
	}

	return backups, rows.Err()
}
