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

// Helper: boolToInt converts a boolean to SQLite integer (0/1)
func boolToInt(b bool) int {
	if b {
		return 1
	}
	return 0
}

// defaultTemplate is a simple struct for seeding templates
type defaultTemplate struct {
	ID          string
	Name        string
	Description string
	VendorID    string
	Content     string
}

// defaultDhcpOption is a simple struct for seeding DHCP options
type defaultDhcpOption struct {
	ID           string
	OptionNumber int
	Name         string
	Value        string
	Type         string
	VendorID     string
	Description  string
	Enabled      bool
}

// defaultVendor is a simple struct for seeding vendors
type defaultVendor struct {
	ID              string
	Name            string
	BackupCommand   string
	SSHPort         int
	MacPrefixes     []string
	VendorClass     string
	DefaultTemplate string
}

// getDefaultVendors returns the default vendors with MAC prefixes
func getDefaultVendors() []defaultVendor {
	return []defaultVendor{
		{
			ID:              "opengear",
			Name:            "OpenGear",
			BackupCommand:   "config export",
			SSHPort:         22,
			MacPrefixes:     []string{"00:13:C6"},
			VendorClass:     "OpenGear",
			DefaultTemplate: "opengear-lighthouse",
		},
		{
			ID:              "cisco",
			Name:            "Cisco",
			BackupCommand:   "show running-config",
			SSHPort:         22,
			MacPrefixes:     []string{"00:00:0C", "00:1A:2F", "00:1B:0D", "00:1C:0E", "00:1D:45", "00:22:55", "00:26:99", "2C:31:24", "64:F6:9D", "F8:C2:88"},
			VendorClass:     "Cisco Systems, Inc.",
			DefaultTemplate: "cisco-ios",
		},
		{
			ID:              "arista",
			Name:            "Arista",
			BackupCommand:   "show running-config",
			SSHPort:         22,
			MacPrefixes:     []string{"00:1C:73", "28:99:3A", "44:4C:A8", "50:01:00", "74:83:C2"},
			VendorClass:     "Arista Networks",
			DefaultTemplate: "arista-eos",
		},
		{
			ID:              "juniper",
			Name:            "Juniper",
			BackupCommand:   "show configuration | display set",
			SSHPort:         22,
			MacPrefixes:     []string{"00:05:85", "00:10:DB", "00:12:1E", "00:14:F6", "00:17:CB", "00:19:E2", "00:21:59", "00:23:9C", "00:26:88", "2C:6B:F5", "3C:61:04", "50:C7:09", "78:FE:3D", "84:B5:9C", "AC:4B:C8", "F4:B5:2F", "F8:C0:01"},
			VendorClass:     "Juniper Networks",
			DefaultTemplate: "juniper-junos",
		},
		{
			ID:              "raspberry-pi",
			Name:            "Raspberry Pi",
			BackupCommand:   "cat /etc/network/interfaces",
			SSHPort:         22,
			MacPrefixes:     []string{"B8:27:EB", "DC:A6:32", "E4:5F:01", "D8:3A:DD", "28:CD:C1"},
			VendorClass:     "Raspberry Pi",
			DefaultTemplate: "raspberry-pi",
		},
	}
}

// GetDefaultVendors returns the default vendors as models
func GetDefaultVendors() []models.Vendor {
	defaults := getDefaultVendors()
	vendors := make([]models.Vendor, len(defaults))
	for i, d := range defaults {
		vendors[i] = models.Vendor{
			ID:              d.ID,
			Name:            d.Name,
			BackupCommand:   d.BackupCommand,
			SSHPort:         d.SSHPort,
			MacPrefixes:     d.MacPrefixes,
			VendorClass:     d.VendorClass,
			DefaultTemplate: d.DefaultTemplate,
		}
	}
	return vendors
}

// GetDefaultDhcpOptions returns the default vendor-specific DHCP options as models
// These IDs match the frontend DEFAULT_DHCP_OPTIONS in shared/core/constants/defaults.ts
func GetDefaultDhcpOptions() []models.DhcpOption {
	defaults := getDefaultDhcpOptions()
	options := make([]models.DhcpOption, len(defaults))
	for i, d := range defaults {
		options[i] = models.DhcpOption{
			ID:           d.ID,
			OptionNumber: d.OptionNumber,
			Name:         d.Name,
			Value:        d.Value,
			Type:         d.Type,
			VendorID:     d.VendorID,
			Description:  d.Description,
			Enabled:      d.Enabled,
		}
	}
	return options
}

// getDefaultDhcpOptions returns the default vendor-specific DHCP options
// These IDs match the frontend DEFAULT_DHCP_OPTIONS in shared/core/constants/defaults.ts
func getDefaultDhcpOptions() []defaultDhcpOption {
	return []defaultDhcpOption{
		// Global TFTP server option
		{
			ID:           "tftp-server",
			OptionNumber: 66,
			Name:         "TFTP Server",
			Value:        "${tftp_server_ip}",
			Type:         "ip",
			VendorID:     "",
			Description:  "TFTP server for config files",
			Enabled:      true,
		},

		// Cisco-specific options
		{
			ID:           "tftp-cisco-150",
			OptionNumber: 150,
			Name:         "Cisco TFTP (Option 150)",
			Value:        "${tftp_server_ip}",
			Type:         "ip",
			VendorID:     "cisco",
			Description:  "Cisco-specific TFTP server option",
			Enabled:      true,
		},
		{
			ID:           "bootfile-cisco",
			OptionNumber: 67,
			Name:         "Cisco Bootfile",
			Value:        "network-confg",
			Type:         "string",
			VendorID:     "cisco",
			Description:  "Cisco IOS config filename",
			Enabled:      true,
		},

		// Arista-specific options
		{
			ID:           "bootfile-arista",
			OptionNumber: 67,
			Name:         "Arista Bootfile",
			Value:        "startup-config",
			Type:         "string",
			VendorID:     "arista",
			Description:  "Arista EOS config filename",
			Enabled:      true,
		},

		// Juniper-specific options
		{
			ID:           "bootfile-juniper",
			OptionNumber: 67,
			Name:         "Juniper Bootfile",
			Value:        "juniper.conf",
			Type:         "string",
			VendorID:     "juniper",
			Description:  "Juniper config filename",
			Enabled:      true,
		},

		// OpenGear-specific options
		{
			ID:           "opengear-ztp",
			OptionNumber: 43,
			Name:         "OpenGear ZTP",
			Value:        "",
			Type:         "hex",
			VendorID:     "opengear",
			Description:  "OpenGear vendor-specific enrollment options",
			Enabled:      false,
		},
	}
}

// getDefaultTemplates returns the default vendor-specific templates
func getDefaultTemplates() []defaultTemplate {
	return []defaultTemplate{
		{
			ID:          "cisco-ios",
			Name:        "Cisco IOS Default",
			Description: "Basic Cisco IOS configuration with SSH and management",
			VendorID:    "cisco",
			Content: `! ZTP Configuration for {{.Hostname}}
! Generated by ZTP Server
! MAC: {{.MAC}}
! IP: {{.IP}}
!
hostname {{.Hostname}}
!
no ip domain-lookup
ip domain-name local
!
interface Vlan1
 description Management Interface
 ip address {{.IP}} {{.Subnet}}
 no shutdown
!
ip default-gateway {{.Gateway}}
!
username admin privilege 15 secret admin
!
line console 0
 logging synchronous
!
line vty 0 4
 login local
 transport input ssh
 exec-timeout 30 0
!
crypto key generate rsa modulus 2048
ip ssh version 2
!
end`,
		},
		{
			ID:          "arista-eos",
			Name:        "Arista EOS Default",
			Description: "Basic Arista EOS configuration with SSH and management",
			VendorID:    "arista",
			Content: `! ZTP Configuration for {{.Hostname}}
! Generated by ZTP Server
! MAC: {{.MAC}}
! IP: {{.IP}}
!
hostname {{.Hostname}}
!
username admin privilege 15 role network-admin secret admin
!
interface Management1
   description Management Interface
   ip address {{.IP}}/24
   no shutdown
!
ip route 0.0.0.0/0 {{.Gateway}}
!
management api http-commands
   protocol https
   no shutdown
!
management ssh
   idle-timeout 30
   no shutdown
!
end`,
		},
		{
			ID:          "juniper-junos",
			Name:        "Juniper Junos Default",
			Description: "Basic Juniper Junos configuration with SSH and management",
			VendorID:    "juniper",
			Content: `## ZTP Configuration for {{.Hostname}}
## Generated by ZTP Server
## MAC: {{.MAC}}
## IP: {{.IP}}

system {
    host-name {{.Hostname}};
    root-authentication {
        encrypted-password "$6$admin";
    }
    login {
        user admin {
            uid 2000;
            class super-user;
            authentication {
                encrypted-password "$6$admin";
            }
        }
    }
    services {
        ssh {
            root-login allow;
        }
        netconf {
            ssh;
        }
    }
}

interfaces {
    em0 {
        unit 0 {
            family inet {
                address {{.IP}}/24;
            }
        }
    }
}

routing-options {
    static {
        route 0.0.0.0/0 next-hop {{.Gateway}};
    }
}`,
		},
		{
			ID:          "opengear-lighthouse",
			Name:        "OpenGear Lighthouse Enrollment",
			Description: "OpenGear OM device configuration for Lighthouse enrollment",
			VendorID:    "opengear",
			Content: `# ZTP Configuration for {{.Hostname}}
# Generated by ZTP Server
# MAC: {{.MAC}}
# IP: {{.IP}}

config.system.name={{.Hostname}}
config.interfaces.wan.mode=static
config.interfaces.wan.address={{.IP}}
config.interfaces.wan.netmask={{.Subnet}}
config.interfaces.wan.gateway={{.Gateway}}

# SSH access
config.services.ssh.enable=on

# Web interface
config.services.webui.enable=on`,
		},
		{
			ID:          "generic-switch",
			Name:        "Generic Switch Template",
			Description: "A generic template suitable for most network switches",
			VendorID:    "",
			Content: `! ZTP Configuration for {{.Hostname}}
! Generated by ZTP Server
! MAC: {{.MAC}}
! IP: {{.IP}}
!
hostname {{.Hostname}}
!
interface Vlan1
 ip address {{.IP}} {{.Subnet}}
 no shutdown
!
ip default-gateway {{.Gateway}}
!
username admin privilege 15 secret admin
!
line vty 0 4
 login local
 transport input ssh
!
end`,
		},
	}
}

// Helper: execWithRowCheck executes a query and returns an error if no rows were affected
func (s *Store) execWithRowCheck(resourceName, id, query string, args ...interface{}) error {
	result, err := s.db.Exec(query, args...)
	if err != nil {
		return err
	}
	rows, _ := result.RowsAffected()
	if rows == 0 {
		return fmt.Errorf("%s not found: %s", resourceName, id)
	}
	return nil
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
		mac_prefixes TEXT DEFAULT '[]',
		vendor_class TEXT DEFAULT '',
		default_template TEXT DEFAULT '',
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

	CREATE TABLE IF NOT EXISTS discovery_logs (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		event_type TEXT NOT NULL,
		mac TEXT NOT NULL,
		ip TEXT NOT NULL,
		hostname TEXT DEFAULT '',
		vendor TEXT DEFAULT '',
		message TEXT DEFAULT '',
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP
	);

	CREATE INDEX IF NOT EXISTS idx_discovery_logs_mac ON discovery_logs(mac);
	CREATE INDEX IF NOT EXISTS idx_discovery_logs_created ON discovery_logs(created_at DESC);

	CREATE TABLE IF NOT EXISTS netbox_config (
		id INTEGER PRIMARY KEY CHECK (id = 1),
		url TEXT DEFAULT '',
		token TEXT DEFAULT '',
		site_id INTEGER DEFAULT 0,
		role_id INTEGER DEFAULT 0,
		sync_enabled INTEGER DEFAULT 0,
		updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
	);
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

	// Migration: Add model column if it doesn't exist
	s.db.Exec("ALTER TABLE devices ADD COLUMN model TEXT DEFAULT ''")

	// Migration: Add last_error column if it doesn't exist
	s.db.Exec("ALTER TABLE devices ADD COLUMN last_error TEXT DEFAULT ''")

	// Seed default templates if they don't exist (insert or ignore)
	defaultTemplates := getDefaultTemplates()
	for _, t := range defaultTemplates {
		// Use INSERT OR IGNORE to only add if not already present
		_, err := s.db.Exec(`
			INSERT OR IGNORE INTO templates (id, name, description, vendor_id, content, created_at, updated_at)
			VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
		`, t.ID, t.Name, t.Description, t.VendorID, t.Content)
		if err != nil {
			return err
		}
	}

	// Seed default DHCP options if they don't exist (insert or ignore)
	defaultDhcpOptions := getDefaultDhcpOptions()
	for _, o := range defaultDhcpOptions {
		// Use INSERT OR IGNORE to only add if not already present
		_, err := s.db.Exec(`
			INSERT OR IGNORE INTO dhcp_options (id, option_number, name, value, type, vendor_id, description, enabled, created_at, updated_at)
			VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
		`, o.ID, o.OptionNumber, o.Name, o.Value, o.Type, o.VendorID, o.Description, boolToInt(o.Enabled))
		if err != nil {
			return err
		}
	}

	// Migration: Add columns if they don't exist
	s.db.Exec("ALTER TABLE vendors ADD COLUMN mac_prefixes TEXT DEFAULT '[]'")
	s.db.Exec("ALTER TABLE vendors ADD COLUMN vendor_class TEXT DEFAULT ''")
	s.db.Exec("ALTER TABLE vendors ADD COLUMN default_template TEXT DEFAULT ''")

	// Seed default vendors if they don't exist (insert or ignore)
	defaultVendors := getDefaultVendors()
	for _, v := range defaultVendors {
		macPrefixesJSON, _ := json.Marshal(v.MacPrefixes)
		// Use INSERT OR IGNORE to only add if not already present
		_, err := s.db.Exec(`
			INSERT OR IGNORE INTO vendors (id, name, backup_command, ssh_port, mac_prefixes, vendor_class, default_template, created_at, updated_at)
			VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
		`, v.ID, v.Name, v.BackupCommand, v.SSHPort, string(macPrefixesJSON), v.VendorClass, v.DefaultTemplate)
		if err != nil {
			return err
		}
		// Always update all fields for default vendors (ensures they have the latest values)
		s.db.Exec(`
			UPDATE vendors SET mac_prefixes = ?, vendor_class = ?, default_template = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
		`, string(macPrefixesJSON), v.VendorClass, v.DefaultTemplate, v.ID)
	}

	return nil
}

// Device operations

// ListDevices returns all devices
func (s *Store) ListDevices() ([]models.Device, error) {
	rows, err := s.db.Query(`
		SELECT mac, ip, hostname, vendor, model, serial_number, config_template, ssh_user, ssh_pass,
		       status, last_seen, last_backup, last_error, created_at, updated_at
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
		var lastError sql.NullString
		err := rows.Scan(
			&d.MAC, &d.IP, &d.Hostname, &d.Vendor, &d.Model, &d.SerialNumber, &d.ConfigTemplate,
			&d.SSHUser, &d.SSHPass, &d.Status,
			&lastSeen, &lastBackup, &lastError, &d.CreatedAt, &d.UpdatedAt,
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
		if lastError.Valid {
			d.LastError = lastError.String
		}
		devices = append(devices, d)
	}

	return devices, rows.Err()
}

// GetDevice returns a device by MAC address
func (s *Store) GetDevice(mac string) (*models.Device, error) {
	var d models.Device
	var lastSeen, lastBackup sql.NullTime
	var lastError sql.NullString

	err := s.db.QueryRow(`
		SELECT mac, ip, hostname, vendor, model, serial_number, config_template, ssh_user, ssh_pass,
		       status, last_seen, last_backup, last_error, created_at, updated_at
		FROM devices WHERE mac = ?
	`, mac).Scan(
		&d.MAC, &d.IP, &d.Hostname, &d.Vendor, &d.Model, &d.SerialNumber, &d.ConfigTemplate,
		&d.SSHUser, &d.SSHPass, &d.Status,
		&lastSeen, &lastBackup, &lastError, &d.CreatedAt, &d.UpdatedAt,
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
	if lastError.Valid {
		d.LastError = lastError.String
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
		INSERT INTO devices (mac, ip, hostname, vendor, model, serial_number, config_template, ssh_user, ssh_pass, status, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	`, d.MAC, d.IP, d.Hostname, d.Vendor, d.Model, d.SerialNumber, d.ConfigTemplate, d.SSHUser, d.SSHPass, d.Status, d.CreatedAt, d.UpdatedAt)

	return err
}

// UpdateDevice updates an existing device
func (s *Store) UpdateDevice(d *models.Device) error {
	d.UpdatedAt = time.Now()

	result, err := s.db.Exec(`
		UPDATE devices SET ip = ?, hostname = ?, vendor = ?, model = ?, serial_number = ?, config_template = ?,
		       ssh_user = ?, ssh_pass = ?, updated_at = ?
		WHERE mac = ?
	`, d.IP, d.Hostname, d.Vendor, d.Model, d.SerialNumber, d.ConfigTemplate, d.SSHUser, d.SSHPass, d.UpdatedAt, d.MAC)
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

// UpdateDeviceError updates the last error message for a device
func (s *Store) UpdateDeviceError(mac, errorMsg string) error {
	_, err := s.db.Exec(`
		UPDATE devices SET last_error = ?, updated_at = ?
		WHERE mac = ?
	`, errorMsg, time.Now(), mac)
	return err
}

// ClearDeviceError clears the last error message for a device
func (s *Store) ClearDeviceError(mac string) error {
	return s.UpdateDeviceError(mac, "")
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

// GetBackup returns a single backup by ID
func (s *Store) GetBackup(id string) (*models.Backup, error) {
	var b models.Backup
	err := s.db.QueryRow(`
		SELECT id, device_mac, filename, size, created_at
		FROM backups WHERE id = ?
	`, id).Scan(&b.ID, &b.DeviceMAC, &b.Filename, &b.Size, &b.CreatedAt)

	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &b, nil
}

// Vendor operations

// ListVendors returns all vendors with device counts
func (s *Store) ListVendors() ([]models.Vendor, error) {
	rows, err := s.db.Query(`
		SELECT v.id, v.name, v.backup_command, v.ssh_port, v.mac_prefixes, v.vendor_class, v.default_template, v.created_at, v.updated_at,
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
		var macPrefixesJSON string
		if err := rows.Scan(&v.ID, &v.Name, &v.BackupCommand, &v.SSHPort, &macPrefixesJSON, &v.VendorClass, &v.DefaultTemplate, &v.CreatedAt, &v.UpdatedAt, &v.DeviceCount); err != nil {
			return nil, err
		}
		// Parse mac_prefixes JSON
		if macPrefixesJSON != "" {
			json.Unmarshal([]byte(macPrefixesJSON), &v.MacPrefixes)
		}
		if v.MacPrefixes == nil {
			v.MacPrefixes = []string{}
		}
		vendors = append(vendors, v)
	}

	return vendors, rows.Err()
}

// GetVendor returns a vendor by ID
func (s *Store) GetVendor(id string) (*models.Vendor, error) {
	var v models.Vendor
	var macPrefixesJSON string
	err := s.db.QueryRow(`
		SELECT v.id, v.name, v.backup_command, v.ssh_port, v.mac_prefixes, v.vendor_class, v.default_template, v.created_at, v.updated_at,
		       COALESCE(COUNT(d.mac), 0) as device_count
		FROM vendors v
		LEFT JOIN devices d ON d.vendor = v.id
		WHERE v.id = ?
		GROUP BY v.id
	`, id).Scan(&v.ID, &v.Name, &v.BackupCommand, &v.SSHPort, &macPrefixesJSON, &v.VendorClass, &v.DefaultTemplate, &v.CreatedAt, &v.UpdatedAt, &v.DeviceCount)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	// Parse mac_prefixes JSON
	if macPrefixesJSON != "" {
		json.Unmarshal([]byte(macPrefixesJSON), &v.MacPrefixes)
	}
	if v.MacPrefixes == nil {
		v.MacPrefixes = []string{}
	}
	return &v, nil
}

// CreateVendor creates a new vendor
func (s *Store) CreateVendor(v *models.Vendor) error {
	now := time.Now()
	v.CreatedAt = now
	v.UpdatedAt = now

	if v.MacPrefixes == nil {
		v.MacPrefixes = []string{}
	}
	macPrefixesJSON, _ := json.Marshal(v.MacPrefixes)

	_, err := s.db.Exec(`
		INSERT INTO vendors (id, name, backup_command, ssh_port, mac_prefixes, vendor_class, default_template, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
	`, v.ID, v.Name, v.BackupCommand, v.SSHPort, string(macPrefixesJSON), v.VendorClass, v.DefaultTemplate, v.CreatedAt, v.UpdatedAt)

	return err
}

// UpdateVendor updates an existing vendor
func (s *Store) UpdateVendor(v *models.Vendor) error {
	v.UpdatedAt = time.Now()

	if v.MacPrefixes == nil {
		v.MacPrefixes = []string{}
	}
	macPrefixesJSON, _ := json.Marshal(v.MacPrefixes)

	return s.execWithRowCheck("vendor", v.ID, `
		UPDATE vendors SET name = ?, backup_command = ?, ssh_port = ?, mac_prefixes = ?, vendor_class = ?, default_template = ?, updated_at = ?
		WHERE id = ?
	`, v.Name, v.BackupCommand, v.SSHPort, string(macPrefixesJSON), v.VendorClass, v.DefaultTemplate, v.UpdatedAt, v.ID)
}

// DeleteVendor removes a vendor
func (s *Store) DeleteVendor(id string) error {
	return s.execWithRowCheck("vendor", id, "DELETE FROM vendors WHERE id = ?", id)
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

	_, err := s.db.Exec(`
		INSERT INTO dhcp_options (id, option_number, name, value, type, vendor_id, description, enabled, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	`, o.ID, o.OptionNumber, o.Name, o.Value, o.Type, o.VendorID, o.Description, boolToInt(o.Enabled), o.CreatedAt, o.UpdatedAt)

	return err
}

// UpdateDhcpOption updates an existing DHCP option
func (s *Store) UpdateDhcpOption(o *models.DhcpOption) error {
	o.UpdatedAt = time.Now()

	return s.execWithRowCheck("dhcp option", o.ID, `
		UPDATE dhcp_options SET option_number = ?, name = ?, value = ?, type = ?, vendor_id = ?, description = ?, enabled = ?, updated_at = ?
		WHERE id = ?
	`, o.OptionNumber, o.Name, o.Value, o.Type, o.VendorID, o.Description, boolToInt(o.Enabled), o.UpdatedAt, o.ID)
}

// DeleteDhcpOption removes a DHCP option
func (s *Store) DeleteDhcpOption(id string) error {
	return s.execWithRowCheck("dhcp option", id, "DELETE FROM dhcp_options WHERE id = ?", id)
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

	return s.execWithRowCheck("template", t.ID, `
		UPDATE templates SET name = ?, description = ?, vendor_id = ?, content = ?, updated_at = ?
		WHERE id = ?
	`, t.Name, t.Description, t.VendorID, t.Content, t.UpdatedAt, t.ID)
}

// DeleteTemplate removes a template
func (s *Store) DeleteTemplate(id string) error {
	return s.execWithRowCheck("template", id, "DELETE FROM templates WHERE id = ?", id)
}

// Discovery Log operations

// CreateDiscoveryLog creates a new discovery log entry
func (s *Store) CreateDiscoveryLog(log *models.DiscoveryLog) error {
	log.CreatedAt = time.Now()
	result, err := s.db.Exec(`
		INSERT INTO discovery_logs (event_type, mac, ip, hostname, vendor, message, created_at)
		VALUES (?, ?, ?, ?, ?, ?, ?)
	`, log.EventType, log.MAC, log.IP, log.Hostname, log.Vendor, log.Message, log.CreatedAt)
	if err != nil {
		return err
	}
	id, _ := result.LastInsertId()
	log.ID = id
	return nil
}

// ListDiscoveryLogs returns discovery logs with optional limit
func (s *Store) ListDiscoveryLogs(limit int) ([]models.DiscoveryLog, error) {
	if limit <= 0 {
		limit = 100
	}
	rows, err := s.db.Query(`
		SELECT id, event_type, mac, ip, hostname, vendor, message, created_at
		FROM discovery_logs
		ORDER BY created_at DESC
		LIMIT ?
	`, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var logs []models.DiscoveryLog
	for rows.Next() {
		var l models.DiscoveryLog
		if err := rows.Scan(&l.ID, &l.EventType, &l.MAC, &l.IP, &l.Hostname, &l.Vendor, &l.Message, &l.CreatedAt); err != nil {
			return nil, err
		}
		logs = append(logs, l)
	}

	return logs, rows.Err()
}

// ClearDiscoveryLogs removes all discovery log entries
func (s *Store) ClearDiscoveryLogs() error {
	_, err := s.db.Exec("DELETE FROM discovery_logs")
	return err
}

// NetBox config operations

// NetBoxConfig holds the NetBox integration settings
type NetBoxConfig struct {
	URL         string `json:"url"`
	Token       string `json:"token"`
	SiteID      int    `json:"site_id"`
	RoleID      int    `json:"role_id"`
	SyncEnabled bool   `json:"sync_enabled"`
}

// GetNetBoxConfig returns the NetBox configuration
func (s *Store) GetNetBoxConfig() (*NetBoxConfig, error) {
	var config NetBoxConfig
	var syncEnabled int
	err := s.db.QueryRow(`
		SELECT url, token, site_id, role_id, sync_enabled
		FROM netbox_config WHERE id = 1
	`).Scan(&config.URL, &config.Token, &config.SiteID, &config.RoleID, &syncEnabled)

	if err == sql.ErrNoRows {
		// Return empty config if not set
		return &NetBoxConfig{}, nil
	}
	if err != nil {
		return nil, err
	}

	config.SyncEnabled = syncEnabled == 1
	return &config, nil
}

// SaveNetBoxConfig saves the NetBox configuration
func (s *Store) SaveNetBoxConfig(config *NetBoxConfig) error {
	syncEnabled := 0
	if config.SyncEnabled {
		syncEnabled = 1
	}

	// Try to update first
	result, err := s.db.Exec(`
		UPDATE netbox_config
		SET url = ?, token = ?, site_id = ?, role_id = ?, sync_enabled = ?, updated_at = CURRENT_TIMESTAMP
		WHERE id = 1
	`, config.URL, config.Token, config.SiteID, config.RoleID, syncEnabled)
	if err != nil {
		return err
	}

	rowsAffected, _ := result.RowsAffected()
	if rowsAffected == 0 {
		// Insert if no row exists
		_, err = s.db.Exec(`
			INSERT INTO netbox_config (id, url, token, site_id, role_id, sync_enabled)
			VALUES (1, ?, ?, ?, ?, ?)
		`, config.URL, config.Token, config.SiteID, config.RoleID, syncEnabled)
		return err
	}

	return nil
}
