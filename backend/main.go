package main

import (
	"log"
	"os"
	"os/signal"
	"syscall"

	"github.com/gin-gonic/gin"

	"github.com/ztp-server/backend/backup"
	"github.com/ztp-server/backend/config"
	"github.com/ztp-server/backend/db"
	"github.com/ztp-server/backend/dhcp"
	"github.com/ztp-server/backend/handlers"
)

func main() {
	cfg := config.Load()

	// Initialize database
	store, err := db.New(cfg.DBPath)
	if err != nil {
		log.Fatalf("Failed to initialize database: %v", err)
	}
	defer store.Close()

	// Initialize DHCP config manager
	configMgr := dhcp.NewConfigManager(store, cfg.DnsmasqConfig, cfg.TFTPDir, cfg.TemplatesDir, cfg.DnsmasqPID)

	// Initialize backup service
	backupSvc := backup.NewService(store, cfg.BackupDir)
	backupSvc.Start()
	defer backupSvc.Stop()

	// Initialize lease watcher
	leaseWatcher := dhcp.NewLeaseWatcher(cfg.LeasePath, backupSvc.OnNewLease)
	leaseWatcher.Start()
	defer leaseWatcher.Stop()

	// Generate initial config
	if err := configMgr.GenerateConfig(); err != nil {
		log.Printf("Warning: failed to generate initial config: %v", err)
	}

	// Setup router
	router := gin.Default()
	router.Use(corsMiddleware())

	// API routes
	api := router.Group("/api")
	{
		handlers.NewDeviceHandler(store, configMgr.GenerateConfig).RegisterRoutes(api)
		handlers.NewSettingsHandler(store, configMgr.GenerateConfig).RegisterRoutes(api)
		handlers.NewBackupHandler(store, backupSvc.TriggerBackup).RegisterRoutes(api)
		handlers.NewVendorHandler(store).RegisterRoutes(api)
		handlers.NewDhcpOptionHandler(store, configMgr.GenerateConfig).RegisterRoutes(api)
		handlers.NewTemplateHandler(store, configMgr.GenerateConfig).RegisterRoutes(api)
	}

	// HTTP config server - serves generated device configs
	router.Static("/configs", cfg.TFTPDir)

	// Serve static frontend files
	router.Static("/assets", "/app/frontend/assets")
	router.StaticFile("/", "/app/frontend/index.html")
	router.NoRoute(func(c *gin.Context) {
		c.File("/app/frontend/index.html")
	})

	// Start server in goroutine
	go func() {
		log.Printf("Starting ZTP server on %s", cfg.ListenAddr)
		if err := router.Run(cfg.ListenAddr); err != nil {
			log.Fatalf("Server failed: %v", err)
		}
	}()

	// Wait for shutdown signal
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	log.Println("Shutting down ZTP server...")
}

func corsMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Header("Access-Control-Allow-Origin", "*")
		c.Header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		c.Header("Access-Control-Allow-Headers", "Content-Type, Authorization")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}

		c.Next()
	}
}
