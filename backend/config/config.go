package config

import "os"

// Config holds all application configuration
type Config struct {
	DBPath        string
	DnsmasqConfig string
	TFTPDir       string
	TemplatesDir  string
	BackupDir     string
	LeasePath     string
	DnsmasqPID    string
	ListenAddr    string
}

// Load returns configuration from environment variables with defaults
func Load() *Config {
	return &Config{
		DBPath:        getEnv("DB_PATH", "/data/ztp.db"),
		DnsmasqConfig: getEnv("DNSMASQ_CONFIG", "/dnsmasq/dnsmasq.conf"),
		TFTPDir:       getEnv("TFTP_DIR", "/tftp"),
		TemplatesDir:  getEnv("TEMPLATES_DIR", "/configs/templates"),
		BackupDir:     getEnv("BACKUP_DIR", "/backups"),
		LeasePath:     getEnv("LEASE_PATH", "/var/lib/misc/dnsmasq.leases"),
		DnsmasqPID:    getEnv("DNSMASQ_PID", "/var/run/dnsmasq.pid"),
		ListenAddr:    getEnv("LISTEN_ADDR", ":8080"),
	}
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}
