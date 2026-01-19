package main

import (
	"log"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/gin-gonic/gin"

	"github.com/ztp-server/backend/backup"
	"github.com/ztp-server/backend/config"
	"github.com/ztp-server/backend/db"
	"github.com/ztp-server/backend/dhcp"
	"github.com/ztp-server/backend/handlers"
	"github.com/ztp-server/backend/models"
	"github.com/ztp-server/backend/status"
	"github.com/ztp-server/backend/ws"
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

	// Initialize WebSocket hub for real-time notifications
	wsHub := ws.NewHub()
	go wsHub.Run()

	// Create WebSocket callback for lease notifications
	wsLeaseCallback := func(lease *models.Lease) {
		wsHub.BroadcastDeviceDiscovered(lease.MAC, lease.IP, lease.Hostname, "")
	}

	// Create discovery log callback
	discoveryLogCallback := func(lease *models.Lease) {
		// Check if device is already configured
		device, _ := store.GetDevice(lease.MAC)
		eventType := "discovered"
		message := "New device detected via DHCP"
		if device != nil {
			eventType = "lease_renewed"
			message = "DHCP lease renewed for configured device"
		}
		logEntry := &models.DiscoveryLog{
			EventType: eventType,
			MAC:       lease.MAC,
			IP:        lease.IP,
			Hostname:  lease.Hostname,
			Message:   message,
		}
		store.CreateDiscoveryLog(logEntry)
	}

	// Initialize lease watcher with backup, WebSocket, and logging callbacks
	leaseWatcher := dhcp.NewLeaseWatcher(cfg.LeasePath, backupSvc.OnNewLease, wsLeaseCallback, discoveryLogCallback)
	leaseWatcher.Start()
	defer leaseWatcher.Stop()

	// Initialize status checker to periodically ping devices
	statusChecker := status.NewChecker(store, 60*time.Second)
	statusChecker.Start()
	defer statusChecker.Stop()

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
		handlers.NewDeviceHandler(store, configMgr.GenerateConfig, cfg.TFTPDir).RegisterRoutes(api)
		handlers.NewSettingsHandler(store, configMgr.GenerateConfig).RegisterRoutes(api)
		handlers.NewBackupHandler(store, backupSvc.TriggerBackup, cfg.BackupDir).RegisterRoutes(api)
		handlers.NewVendorHandler(store).RegisterRoutes(api)
		handlers.NewDhcpOptionHandler(store, configMgr.GenerateConfig).RegisterRoutes(api)
		handlers.NewTemplateHandler(store, configMgr.GenerateConfig).RegisterRoutes(api)
		handlers.NewDiscoveryHandler(store, cfg.LeasePath, leaseWatcher.ClearKnownMACs).RegisterRoutes(api)
		handlers.NewNetBoxHandler(store).RegisterRoutes(api)

		// WebSocket handler for real-time notifications
		ws.NewHandler(wsHub).RegisterRoutes(api)

		// Docker handler for test containers (optional - only if Docker available)
		if dockerHandler, err := handlers.NewDockerHandler(); err == nil {
			dockerHandler.RegisterRoutes(api)
		} else {
			log.Printf("Docker handler not available: %v", err)
		}
	}

	// HTTP config server - serves generated device configs with WebSocket notifications
	handlers.NewConfigServerHandler(store, wsHub, cfg.TFTPDir).RegisterRoutes(router)

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
