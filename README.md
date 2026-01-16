# ZTP Server

A containerized Zero Touch Provisioning server for network devices with web and mobile management interfaces.

## Overview

ZTP Server automates the provisioning of network devices by:
- Assigning IP addresses via DHCP based on MAC address
- Serving device-specific configurations via TFTP
- Automatically backing up device configs after provisioning
- Providing web and mobile interfaces for device management

## Features

- **DHCP Server** - Static IP assignment based on MAC address using dnsmasq
- **TFTP Server** - Serves templated configuration files to network devices
- **Config Backup** - Automatically SSHs into devices after provisioning to backup running configs
- **Web UI** - React-based interface for managing devices and settings
- **Mobile App** - React Native app with barcode scanner for easy device onboarding
- **REST API** - Full API for automation and integration
- **OpenGear Support** - Built-in support for OpenGear Lighthouse ZTP enrollment

## Quick Start

### Prerequisites

- Docker and Docker Compose
- Node.js 18+ (for mobile development)
- Expo Go app on your phone (for mobile testing)

### 1. Start the Server

```bash
# Clone and start
git clone <repo-url>
cd ztp-server
docker-compose up -d ztp-server

# Verify it's running
curl http://localhost:8080/api/devices
```

### 2. Access the Web UI

Open http://localhost:8080 in your browser.

### 3. Configure Settings

1. Click the **Settings** icon (gear) in the header
2. Set your default SSH credentials for device backup
3. Configure DHCP range and gateway settings
4. (Optional) Configure OpenGear Lighthouse enrollment

### 4. Add Your First Device

1. Click **Add Device**
2. Enter the device's MAC address, desired IP, and hostname
3. Select a config template
4. Click **Add Device**

The device will receive its IP and config on next boot.

---

## Mobile App Setup

The mobile app lets you manage devices from your phone and scan barcodes/QR codes to quickly add device serial numbers.

### Development Setup

```bash
# Install dependencies
cd mobile
npm install

# Start Expo dev server
npm start
```

### Configure API Connection

Edit `mobile/src/config.ts` to set your server's IP address:

```typescript
export const API_BASE_URL = __DEV__
  ? 'http://192.168.1.100:8080'  // Your computer's local IP
  : 'http://your-production-server:8080';
```

**Finding your computer's IP:**
```bash
# macOS
ipconfig getifaddr en0

# Linux
hostname -I | awk '{print $1}'

# Windows
ipconfig | findstr IPv4
```

### Running on Your Phone

1. Install **Expo Go** from the App Store (iOS) or Play Store (Android)
2. Make sure your phone is on the same WiFi network as your computer
3. Run `npm start` in the mobile directory
4. Scan the QR code with Expo Go (Android) or Camera app (iOS)

### Mobile App Features

- **Device List** - View all configured devices with status
- **Add Device** - Add new devices with barcode scanner support
- **Edit Device** - Modify device settings
- **Settings** - Configure SSH defaults, DHCP, and OpenGear options
- **Pull to Refresh** - Refresh device list by pulling down
- **Barcode Scanner** - Scan device serial numbers to auto-fill hostname

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           Docker Compose                                 │
├──────────────────┬──────────────────┬────────────────┬──────────────────┤
│   DHCP Server    │   TFTP Server    │   API + Web UI │   Test Client    │
│   (dnsmasq)      │   (dnsmasq)      │   (Go + React) │   (alpine+ssh)   │
│   Port 67/udp    │   Port 69/udp    │   Port 8080    │   For testing    │
└──────────────────┴──────────────────┴────────────────┴──────────────────┘
                                │
                    ┌───────────┴───────────┐
                    │      SQLite DB        │
                    │   Device mappings     │
                    │   Settings & config   │
                    └───────────────────────┘
```

### Project Structure

```
ztp-server/
├── backend/              # Go API server
│   ├── main.go
│   ├── handlers/         # HTTP handlers
│   ├── models/           # Data models
│   ├── db/               # SQLite operations
│   ├── dhcp/             # dnsmasq config generation
│   ├── backup/           # SSH backup logic
│   ├── config/           # Configuration management
│   └── utils/            # Shared utilities
├── frontend/             # React web UI
│   └── src/
│       ├── components/   # Reusable UI components
│       └── core -> ../../shared/core
├── mobile/               # React Native app
│   └── src/
│       ├── screens/      # App screens
│       ├── components/   # Mobile UI components
│       ├── navigation/   # Stack navigation
│       └── core -> ../../shared/core
├── shared/               # Shared code between web and mobile
│   └── core/
│       ├── types.ts      # TypeScript types
│       ├── services/     # API service layer
│       ├── hooks/        # React hooks
│       └── utils/        # Validation & formatting
├── configs/
│   └── templates/        # Device config templates
├── docker-compose.yml
└── Dockerfile
```

---

## ZTP Flow

```
1. Device boots
        │
        ▼
2. DHCP Request ──────────► ZTP Server assigns IP based on MAC
        │
        ▼
3. TFTP Request ──────────► ZTP Server serves device-specific config
        │
        ▼
4. Device applies config and comes online
        │
        ▼
5. ZTP Server detects lease ──► Waits for backup delay
        │
        ▼
6. SSH to device ──────────► Runs backup command
        │
        ▼
7. Config saved to /backups/{hostname}_{timestamp}.cfg
```

---

## API Reference

### Devices

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/devices` | List all devices |
| POST | `/api/devices` | Create a new device |
| GET | `/api/devices/:mac` | Get device by MAC |
| PUT | `/api/devices/:mac` | Update device |
| DELETE | `/api/devices/:mac` | Delete device |

### Backups

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/devices/:mac/backup` | Trigger manual backup |
| GET | `/api/devices/:mac/backups` | List backups for device |
| GET | `/api/backups/:id/download` | Download backup file |

### Settings

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/settings` | Get global settings |
| PUT | `/api/settings` | Update settings |
| POST | `/api/reload` | Reload DHCP/TFTP config |

### Example: Add a Device

```bash
curl -X POST http://localhost:8080/api/devices \
  -H "Content-Type: application/json" \
  -d '{
    "mac": "00:11:22:33:44:55",
    "ip": "192.168.1.100",
    "hostname": "switch-01",
    "config_template": "cisco-switch.template"
  }'
```

---

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `DB_PATH` | `/data/ztp.db` | SQLite database path |
| `TFTP_DIR` | `/tftp` | TFTP root directory |
| `BACKUP_DIR` | `/backups` | Config backup directory |
| `TEMPLATES_DIR` | `/configs/templates` | Config templates directory |
| `LISTEN_ADDR` | `:8080` | API server listen address |

### Settings (via UI or API)

| Setting | Description |
|---------|-------------|
| **Default SSH User** | Username for device backup connections |
| **Default SSH Password** | Password for device backup connections |
| **Backup Command** | Command to run on device (default: `show running-config`) |
| **Backup Delay** | Seconds to wait after lease before backup attempt |
| **DHCP Range Start/End** | IP pool for dynamic assignments |
| **DHCP Subnet** | Subnet mask for DHCP |
| **DHCP Gateway** | Default gateway for DHCP clients |
| **TFTP Server IP** | IP address advertised to clients |
| **OpenGear Enroll URL** | Lighthouse enrollment server address |
| **OpenGear Bundle** | Lighthouse bundle name |
| **OpenGear Password** | Lighthouse enrollment password |

---

## Config Templates

Place templates in `configs/templates/`. Use Go template syntax with these variables:

| Variable | Description |
|----------|-------------|
| `{{.MAC}}` | Device MAC address |
| `{{.IP}}` | Assigned IP address |
| `{{.Hostname}}` | Device hostname |
| `{{.Subnet}}` | Subnet mask |
| `{{.Gateway}}` | Default gateway |

### Example: Cisco Switch Template

```
hostname {{.Hostname}}
!
interface Vlan1
 ip address {{.IP}} {{.Subnet}}
 no shutdown
!
ip default-gateway {{.Gateway}}
!
line vty 0 15
 login local
 transport input ssh
!
end
```

### Example: OpenGear Console Server

```
config.system.name={{.Hostname}}
config.interfaces.wan.static.address={{.IP}}
config.interfaces.wan.static.netmask={{.Subnet}}
config.interfaces.wan.static.gateway={{.Gateway}}
```

---

## Testing with Test Client

The included test client simulates a network device going through ZTP:

```bash
# 1. Add the test client's MAC in the UI:
#    MAC: 02:42:ac:1e:00:99
#    IP: 172.30.0.99
#    Hostname: test-switch
#    Template: default.template

# 2. Set default SSH credentials in Settings:
#    Username: admin
#    Password: admin

# 3. Start the test client
docker-compose --profile test up test-client

# 4. Watch the logs
docker-compose logs -f ztp-server test-client
```

The test client will:
1. Request an IP via DHCP
2. Fetch its config via TFTP
3. Start an SSH server
4. Get backed up by the ZTP server

---

## Development

### Backend (Go)

```bash
cd backend
go mod download
go run .

# Run with hot reload
go install github.com/air-verse/air@latest
air
```

### Frontend (React)

```bash
cd frontend
npm install
npm run dev
```

### Mobile (React Native)

```bash
cd mobile
npm install
npm start

# iOS Simulator
npm run ios

# Android Emulator
npm run android
```

### Shared Core Module

The `shared/core/` directory contains platform-agnostic code shared between web and mobile:

- **types.ts** - TypeScript interfaces for Device, Settings, etc.
- **services/** - API service layer (DeviceService, SettingsService)
- **hooks/** - React hooks (useDevices, useSettings, useBackups, useTheme)
- **utils/** - Validation and formatting utilities

Both `frontend/src/core` and `mobile/src/core` are symlinks to `shared/core/`.

---

## Docker Volumes

| Volume | Purpose |
|--------|---------|
| `ztp-data` | SQLite database |
| `ztp-tftp` | Generated device configs |
| `ztp-backups` | Backed up running configs |

---

## Troubleshooting

### Mobile app can't connect to API

1. Ensure your phone and computer are on the same WiFi network
2. Check that the IP in `mobile/src/config.ts` is correct
3. Verify the API is accessible: `curl http://<your-ip>:8080/api/devices`
4. Check firewall settings allow port 8080

### DHCP not working

1. Ensure Docker is running with `--net=host` or proper network configuration
2. Check dnsmasq logs: `docker-compose logs ztp-server | grep dnsmasq`
3. Verify no other DHCP server is running on the network

### Backup failing

1. Check SSH credentials in Settings
2. Verify device is reachable: `ping <device-ip>`
3. Test SSH manually: `ssh admin@<device-ip>`
4. Check backup logs: `docker-compose logs ztp-server | grep backup`

### Template not applying

1. Verify template exists in `configs/templates/`
2. Check template syntax with Go template validator
3. Look for errors in logs during TFTP request

---

## Security Considerations

- Change default SSH credentials immediately
- Use strong passwords for OpenGear enrollment
- Consider running behind a reverse proxy with TLS for production
- Restrict API access to trusted networks
- Regularly backup the SQLite database

---

## License

MIT
