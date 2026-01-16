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

	CREATE TABLE IF NOT EXISTS vendors (
		id TEXT PRIMARY KEY,
		name TEXT NOT NULL,
		backup_command TEXT DEFAULT 'show running-config',
		ssh_port INTEGER DEFAULT 22,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
	);

	CREATE TABLE IF NOT EXISTS dhcp_options (
		id TEXT PRIMARY KEY,
		option_number INTEGER NOT NULL,
		name TEXT NOT NULL,
		value TEXT DEFAULT '',
		type TEXT DEFAULT 'string',
		vendor_id TEXT DEFAULT '',
		description TEXT DEFAULT '',
		enabled INTEGER DEFAULT 1,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
	);

	CREATE INDEX IF NOT EXISTS idx_dhcp_options_vendor ON dhcp_options(vendor_id);

	CREATE TABLE IF NOT EXISTS templates (
		id TEXT PRIMARY KEY,
		name TEXT NOT NULL,
		description TEXT DEFAULT '',
		vendor_id TEXT DEFAULT '',
		content TEXT NOT NULL,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
	);

	CREATE INDEX IF NOT EXISTS idx_templates_vendor ON templates(vendor_id);
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

	// Migration: Add vendor column if it doesn't exist
	s.db.Exec("ALTER TABLE devices ADD COLUMN vendor TEXT DEFAULT ''")

	return nil
}

// Device operations

// ListDevices returns all devices
func (s *Store) ListDevices() ([]models.Device, error) {
	rows, err := s.db.Query(`
		SELECT mac, ip, hostname, vendor, serial_number, config_template, ssh_user, ssh_pass,
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
			&d.MAC, &d.IP, &d.Hostname, &d.Vendor, &d.SerialNumber, &d.ConfigTemplate,
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
		SELECT mac, ip, hostname, vendor, serial_number, config_template, ssh_user, ssh_pass,
		       status, last_seen, last_backup, created_at, updated_at
		FROM devices WHERE mac = ?
	`, mac).Scan(
		&d.MAC, &d.IP, &d.Hostname, &d.Vendor, &d.SerialNumber, &d.ConfigTemplate,
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
		INSERT INTO devices (mac, ip, hostname, vendor, serial_number, config_template, ssh_user, ssh_pass, status, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	`, d.MAC, d.IP, d.Hostname, d.Vendor, d.SerialNumber, d.ConfigTemplate, d.SSHUser, d.SSHPass, d.Status, d.CreatedAt, d.UpdatedAt)

	return err
}

// UpdateDevice updates an existing device
func (s *Store) UpdateDevice(d *models.Device) error {
	d.UpdatedAt = time.Now()

	result, err := s.db.Exec(`
		UPDATE devices SET ip = ?, hostname = ?, vendor = ?, serial_number = ?, config_template = ?,
		       ssh_user = ?, ssh_pass = ?, updated_at = ?
		WHERE mac = ?
	`, d.IP, d.Hostname, d.Vendor, d.SerialNumber, d.ConfigTemplate, d.SSHUser, d.SSHPass, d.UpdatedAt, d.MAC)
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

// Vendor operations

// ListVendors returns all vendors with device counts
func (s *Store) ListVendors() ([]models.Vendor, error) {
	rows, err := s.db.Query(`
		SELECT v.id, v.name, v.backup_command, v.ssh_port, v.created_at, v.updated_at,
		       COALESCE(COUNT(d.mac), 0) as device_count
		FROM vendors v
		LEFT JOIN devices d ON d.vendor = v.id
		GROUP BY v.id
		ORDER BY v.name
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var vendors []models.Vendor
	for rows.Next() {
		var v models.Vendor
		if err := rows.Scan(&v.ID, &v.Name, &v.BackupCommand, &v.SSHPort, &v.CreatedAt, &v.UpdatedAt, &v.DeviceCount); err != nil {
			return nil, err
		}
		vendors = append(vendors, v)
	}

	return vendors, rows.Err()
}

// GetVendor returns a vendor by ID
func (s *Store) GetVendor(id string) (*models.Vendor, error) {
	var v models.Vendor
	err := s.db.QueryRow(`
		SELECT v.id, v.name, v.backup_command, v.ssh_port, v.created_at, v.updated_at,
		       COALESCE(COUNT(d.mac), 0) as device_count
		FROM vendors v
		LEFT JOIN devices d ON d.vendor = v.id
		WHERE v.id = ?
		GROUP BY v.id
	`, id).Scan(&v.ID, &v.Name, &v.BackupCommand, &v.SSHPort, &v.CreatedAt, &v.UpdatedAt, &v.DeviceCount)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &v, nil
}

// CreateVendor creates a new vendor
func (s *Store) CreateVendor(v *models.Vendor) error {
	now := time.Now()
	v.CreatedAt = now
	v.UpdatedAt = now

	_, err := s.db.Exec(`
		INSERT INTO vendors (id, name, backup_command, ssh_port, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?, ?)
	`, v.ID, v.Name, v.BackupCommand, v.SSHPort, v.CreatedAt, v.UpdatedAt)

	return err
}

// UpdateVendor updates an existing vendor
func (s *Store) UpdateVendor(v *models.Vendor) error {
	v.UpdatedAt = time.Now()

	result, err := s.db.Exec(`
		UPDATE vendors SET name = ?, backup_command = ?, ssh_port = ?, updated_at = ?
		WHERE id = ?
	`, v.Name, v.BackupCommand, v.SSHPort, v.UpdatedAt, v.ID)
	if err != nil {
		return err
	}

	rows, _ := result.RowsAffected()
	if rows == 0 {
		return fmt.Errorf("vendor not found: %s", v.ID)
	}

	return nil
}

// DeleteVendor removes a vendor
func (s *Store) DeleteVendor(id string) error {
	result, err := s.db.Exec("DELETE FROM vendors WHERE id = ?", id)
	if err != nil {
		return err
	}

	rows, _ := result.RowsAffected()
	if rows == 0 {
		return fmt.Errorf("vendor not found: %s", id)
	}

	return nil
}

// DHCP Option operations

// ListDhcpOptions returns all DHCP options
func (s *Store) ListDhcpOptions() ([]models.DhcpOption, error) {
	rows, err := s.db.Query(`
		SELECT id, option_number, name, value, type, vendor_id, description, enabled, created_at, updated_at
		FROM dhcp_options
		ORDER BY option_number, vendor_id
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var options []models.DhcpOption
	for rows.Next() {
		var o models.DhcpOption
		var enabled int
		if err := rows.Scan(&o.ID, &o.OptionNumber, &o.Name, &o.Value, &o.Type, &o.VendorID, &o.Description, &enabled, &o.CreatedAt, &o.UpdatedAt); err != nil {
			return nil, err
		}
		o.Enabled = enabled == 1
		options = append(options, o)
	}

	return options, rows.Err()
}

// GetDhcpOption returns a DHCP option by ID
func (s *Store) GetDhcpOption(id string) (*models.DhcpOption, error) {
	var o models.DhcpOption
	var enabled int
	err := s.db.QueryRow(`
		SELECT id, option_number, name, value, type, vendor_id, description, enabled, created_at, updated_at
		FROM dhcp_options WHERE id = ?
	`, id).Scan(&o.ID, &o.OptionNumber, &o.Name, &o.Value, &o.Type, &o.VendorID, &o.Description, &enabled, &o.CreatedAt, &o.UpdatedAt)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	o.Enabled = enabled == 1
	return &o, nil
}

// CreateDhcpOption creates a new DHCP option
func (s *Store) CreateDhcpOption(o *models.DhcpOption) error {
	now := time.Now()
	o.CreatedAt = now
	o.UpdatedAt = now

	enabled := 0
	if o.Enabled {
		enabled = 1
	}

	_, err := s.db.Exec(`
		INSERT INTO dhcp_options (id, option_number, name, value, type, vendor_id, description, enabled, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	`, o.ID, o.OptionNumber, o.Name, o.Value, o.Type, o.VendorID, o.Description, enabled, o.CreatedAt, o.UpdatedAt)

	return err
}

// UpdateDhcpOption updates an existing DHCP option
func (s *Store) UpdateDhcpOption(o *models.DhcpOption) error {
	o.UpdatedAt = time.Now()

	enabled := 0
	if o.Enabled {
		enabled = 1
	}

	result, err := s.db.Exec(`
		UPDATE dhcp_options SET option_number = ?, name = ?, value = ?, type = ?, vendor_id = ?, description = ?, enabled = ?, updated_at = ?
		WHERE id = ?
	`, o.OptionNumber, o.Name, o.Value, o.Type, o.VendorID, o.Description, enabled, o.UpdatedAt, o.ID)
	if err != nil {
		return err
	}

	rows, _ := result.RowsAffected()
	if rows == 0 {
		return fmt.Errorf("dhcp option not found: %s", o.ID)
	}

	return nil
}

// DeleteDhcpOption removes a DHCP option
func (s *Store) DeleteDhcpOption(id string) error {
	result, err := s.db.Exec("DELETE FROM dhcp_options WHERE id = ?", id)
	if err != nil {
		return err
	}

	rows, _ := result.RowsAffected()
	if rows == 0 {
		return fmt.Errorf("dhcp option not found: %s", id)
	}

	return nil
}

// Template operations

// ListTemplates returns all templates with device counts
func (s *Store) ListTemplates() ([]models.Template, error) {
	rows, err := s.db.Query(`
		SELECT t.id, t.name, t.description, t.vendor_id, t.content, t.created_at, t.updated_at,
		       COALESCE(COUNT(d.mac), 0) as device_count
		FROM templates t
		LEFT JOIN devices d ON d.config_template = t.id
		GROUP BY t.id
		ORDER BY t.name
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var templates []models.Template
	for rows.Next() {
		var t models.Template
		if err := rows.Scan(&t.ID, &t.Name, &t.Description, &t.VendorID, &t.Content, &t.CreatedAt, &t.UpdatedAt, &t.DeviceCount); err != nil {
			return nil, err
		}
		templates = append(templates, t)
	}

	return templates, rows.Err()
}

// GetTemplate returns a template by ID
func (s *Store) GetTemplate(id string) (*models.Template, error) {
	var t models.Template
	err := s.db.QueryRow(`
		SELECT t.id, t.name, t.description, t.vendor_id, t.content, t.created_at, t.updated_at,
		       COALESCE(COUNT(d.mac), 0) as device_count
		FROM templates t
		LEFT JOIN devices d ON d.config_template = t.id
		WHERE t.id = ?
		GROUP BY t.id
	`, id).Scan(&t.ID, &t.Name, &t.Description, &t.VendorID, &t.Content, &t.CreatedAt, &t.UpdatedAt, &t.DeviceCount)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &t, nil
}

// CreateTemplate creates a new template
func (s *Store) CreateTemplate(t *models.Template) error {
	now := time.Now()
	t.CreatedAt = now
	t.UpdatedAt = now

	_, err := s.db.Exec(`
		INSERT INTO templates (id, name, description, vendor_id, content, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?, ?, ?)
	`, t.ID, t.Name, t.Description, t.VendorID, t.Content, t.CreatedAt, t.UpdatedAt)

	return err
}

// UpdateTemplate updates an existing template
func (s *Store) UpdateTemplate(t *models.Template) error {
	t.UpdatedAt = time.Now()

	result, err := s.db.Exec(`
		UPDATE templates SET name = ?, description = ?, vendor_id = ?, content = ?, updated_at = ?
		WHERE id = ?
	`, t.Name, t.Description, t.VendorID, t.Content, t.UpdatedAt, t.ID)
	if err != nil {
		return err
	}

	rows, _ := result.RowsAffected()
	if rows == 0 {
		return fmt.Errorf("template not found: %s", t.ID)
	}

	return nil
}

// DeleteTemplate removes a template
func (s *Store) DeleteTemplate(id string) error {
	result, err := s.db.Exec("DELETE FROM templates WHERE id = ?", id)
	if err != nil {
		return err
	}

	rows, _ := result.RowsAffected()
	if rows == 0 {
		return fmt.Errorf("template not found: %s", id)
	}

	return nil
}
