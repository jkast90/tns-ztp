package models

import "time"

// Device represents a network device managed by the ZTP server
type Device struct {
	MAC            string     `json:"mac"`
	IP             string     `json:"ip"`
	Hostname       string     `json:"hostname"`
	Vendor         string     `json:"vendor,omitempty"`
	SerialNumber   string     `json:"serial_number,omitempty"`
	ConfigTemplate string     `json:"config_template"`
	SSHUser        string     `json:"ssh_user,omitempty"`
	SSHPass        string     `json:"ssh_pass,omitempty"`
	Status         string     `json:"status"` // online, offline, provisioning
	LastSeen       *time.Time `json:"last_seen,omitempty"`
	LastBackup     *time.Time `json:"last_backup,omitempty"`
	CreatedAt      time.Time  `json:"created_at"`
	UpdatedAt      time.Time  `json:"updated_at"`
}

// Settings represents global ZTP server settings
type Settings struct {
	DefaultSSHUser  string `json:"default_ssh_user"`
	DefaultSSHPass  string `json:"default_ssh_pass"`
	BackupCommand   string `json:"backup_command"`
	BackupDelay     int    `json:"backup_delay"` // seconds to wait before backup
	DHCPRangeStart  string `json:"dhcp_range_start"`
	DHCPRangeEnd    string `json:"dhcp_range_end"`
	DHCPSubnet      string `json:"dhcp_subnet"`
	DHCPGateway     string `json:"dhcp_gateway"`
	TFTPServerIP    string `json:"tftp_server_ip"`
	// OpenGear ZTP enrollment options
	OpenGearEnrollURL      string `json:"opengear_enroll_url"`
	OpenGearEnrollBundle   string `json:"opengear_enroll_bundle"`
	OpenGearEnrollPassword string `json:"opengear_enroll_password"`
}

// Backup represents a config backup record
type Backup struct {
	ID        int64     `json:"id"`
	DeviceMAC string    `json:"device_mac"`
	Filename  string    `json:"filename"`
	Size      int64     `json:"size"`
	CreatedAt time.Time `json:"created_at"`
}

// Lease represents a DHCP lease from dnsmasq
type Lease struct {
	ExpiryTime int64
	MAC        string
	IP         string
	Hostname   string
	ClientID   string
}

// Vendor represents a network device vendor configuration
type Vendor struct {
	ID            string    `json:"id"`
	Name          string    `json:"name"`
	BackupCommand string    `json:"backup_command"`
	SSHPort       int       `json:"ssh_port"`
	DeviceCount   int       `json:"device_count,omitempty"` // Computed field
	CreatedAt     time.Time `json:"created_at"`
	UpdatedAt     time.Time `json:"updated_at"`
}

// DhcpOption represents a DHCP option configuration
type DhcpOption struct {
	ID           string    `json:"id"`
	OptionNumber int       `json:"option_number"`
	Name         string    `json:"name"`
	Value        string    `json:"value"`
	Type         string    `json:"type"` // string, ip, hex, number
	VendorID     string    `json:"vendor_id,omitempty"`
	Description  string    `json:"description,omitempty"`
	Enabled      bool      `json:"enabled"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
}

// Template represents a configuration template
type Template struct {
	ID          string    `json:"id"`
	Name        string    `json:"name"`
	Description string    `json:"description,omitempty"`
	VendorID    string    `json:"vendor_id,omitempty"`
	Content     string    `json:"content"`
	DeviceCount int       `json:"device_count,omitempty"` // Computed field
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

// DefaultSettings returns settings with sensible defaults
func DefaultSettings() Settings {
	return Settings{
		DefaultSSHUser:  "admin",
		DefaultSSHPass:  "admin",
		BackupCommand:   "show running-config",
		BackupDelay:     30,
		DHCPRangeStart:  "172.30.0.100",
		DHCPRangeEnd:    "172.30.0.200",
		DHCPSubnet:      "255.255.255.0",
		DHCPGateway:     "172.30.0.1",
		TFTPServerIP:    "172.30.0.2",
	}
}
