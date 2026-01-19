# ZTP Server Mobile App

React Native mobile app for managing ZTP Server devices with barcode scanning support.

## Features

- **Dashboard** - Overview with device metrics, status breakdown, and recent activity
- **Device Management** - View, add, edit, delete devices with barcode/QR scanner
- **Templates** - Create and manage configuration templates with live preview
- **Templatizer** - Convert raw device configs into reusable templates
- **Vendors** - Manage vendor definitions with SSH defaults
- **DHCP Options** - Configure DHCP option codes
- **Settings** - Global SSH, DHCP, and OpenGear settings
- **Theming** - Dark, light, and plain themes
- Pull-to-refresh throughout

## Quick Start with Expo Go

### Prerequisites

1. **Expo Go app** on your phone:
   - iOS: [App Store](https://apps.apple.com/app/expo-go/id982107779)
   - Android: [Play Store](https://play.google.com/store/apps/details?id=host.exp.exponent)

2. **Node.js 18+** on your computer

3. **ZTP Server running** (see main README)

### Setup

```bash
# Install dependencies
npm install

# Configure API URL (see below)
# Edit src/config.ts with your server's IP

# Start Expo
npm start
```

### Configure API Connection

Edit `src/config.ts`:

```typescript
export const API_BASE_URL = __DEV__
  ? 'http://YOUR_COMPUTER_IP:8080'  // <-- Change this
  : 'http://your-production-server:8080';
```

**Find your computer's IP address:**

```bash
# macOS
ipconfig getifaddr en0

# Linux
hostname -I | awk '{print $1}'

# Windows
ipconfig | findstr IPv4
```

### Run on Your Phone

1. Make sure your phone and computer are on the **same WiFi network**
2. Run `npm start` in this directory
3. Scan the QR code:
   - **Android**: Open Expo Go app and scan the QR code
   - **iOS**: Open Camera app and scan the QR code, then tap the notification

### Run on Simulator/Emulator

```bash
# iOS Simulator (macOS only, requires Xcode)
npm run ios

# Android Emulator (requires Android Studio)
npm run android
```

## Using the App

### Device List

The home screen shows all configured devices with:
- Hostname and status badge (online/offline/provisioning)
- MAC address and IP
- Config template name

**Actions:**
- **Pull down** to refresh the list
- **Tap a device** to edit it
- **Tap Delete** to remove a device
- **Tap +** in header to add a device
- **Tap gear icon** to open settings

### Add Device with Barcode Scanner

1. Tap **+** in the header to add a new device
2. Tap the **scanner icon** in the header
3. Point your camera at the device's serial number barcode or QR code
4. The scanned value will be used as the hostname
5. Fill in the remaining fields (MAC, IP, template)
6. Tap **Add Device**

### Settings

Configure global options:
- **SSH Defaults**: Default credentials for device backups
- **Backup Command**: Command to run (e.g., `show running-config`)
- **DHCP Settings**: IP range, subnet, gateway
- **OpenGear ZTP**: Lighthouse enrollment settings

## Project Structure

```
mobile/
├── App.tsx                 # Root component with providers
├── src/
│   ├── config.ts           # API base URL configuration
│   ├── core/               # Shared core + mobile-specific overrides
│   │   ├── index.ts        # Re-exports from shared/core
│   │   └── typography.ts   # Mobile-specific font constants
│   ├── context/            # React contexts (theme, services)
│   ├── navigation/
│   │   ├── AppNavigator.tsx
│   │   └── types.ts
│   ├── screens/
│   │   ├── DashboardScreen.tsx    # Overview with metrics & activity
│   │   ├── DevicesHubScreen.tsx   # Device management hub
│   │   ├── DeviceFormScreen.tsx   # Add/edit device form
│   │   ├── TemplatesScreen.tsx    # Template management with preview
│   │   ├── TemplatizerScreen.tsx  # Config → template converter
│   │   ├── VendorsScreen.tsx      # Vendor management
│   │   ├── DhcpOptionsScreen.tsx  # DHCP option management
│   │   ├── SettingsScreen.tsx     # Global settings
│   │   └── ScannerScreen.tsx      # Barcode/QR scanner
│   ├── components/
│   │   ├── Button.tsx             # Themed button
│   │   ├── Card.tsx               # Card container
│   │   ├── CardActions.tsx        # Edit/delete action buttons
│   │   ├── CodePreview.tsx        # Monospace scrollable code display
│   │   ├── DeviceCard.tsx         # Device list item
│   │   ├── EmptyState.tsx         # Empty list placeholder
│   │   ├── ErrorState.tsx         # Error display
│   │   ├── FormInput.tsx          # Themed text input
│   │   ├── FormModal.tsx          # Modal form wrapper
│   │   ├── FormSelect.tsx         # Picker/dropdown
│   │   ├── InfoRow.tsx            # Label + value row
│   │   ├── LoadingState.tsx       # Loading spinner
│   │   ├── MetricCard.tsx         # Dashboard metric card
│   │   ├── Modal.tsx              # Base modal component
│   │   ├── ModalHeader.tsx        # Modal header with close button
│   │   ├── StatusBadge.tsx        # Device status indicator
│   │   ├── StepIndicator.tsx      # Multi-step wizard progress
│   │   ├── ThemedSwitch.tsx       # Themed toggle switch
│   │   └── ValidatedInput.tsx     # Input with validation
│   └── utils/
│       └── alerts.ts              # Alert helpers (showError, confirmDelete)
```

## Shared Code

This app shares code with the web frontend via `shared/core/`:
- **Types** - Device, Settings, Template, Vendor, etc.
- **Services** - API calls (DeviceService, SettingsService, TemplateService, etc.)
- **Hooks** - useDevices, useSettings, useTemplates, useVendors, useDhcpOptions, etc.
- **Utils** - Validation, formatting, status colors, variable type styling
- **Theme** - Color schemes (dark, light, plain)

The mobile app imports from `./core` which re-exports shared code and adds mobile-specific overrides (e.g., platform-specific monospace fonts).

## Troubleshooting

### "Network request failed" or can't connect

1. **Check WiFi**: Phone and computer must be on same network
2. **Check IP**: Verify the IP in `src/config.ts` is correct
3. **Test API**: Run `curl http://YOUR_IP:8080/api/devices` from your computer
4. **Firewall**: Ensure port 8080 is open on your computer
5. **VPN**: Disable VPN if active

### Camera permission denied

The barcode scanner requires camera access. If denied:
- **iOS**: Settings > Privacy > Camera > Expo Go
- **Android**: Settings > Apps > Expo Go > Permissions > Camera

### Expo Go won't scan QR code

1. Try pressing `s` in terminal to switch to Expo Go mode
2. Make sure you're not in tunnel mode (use LAN)
3. Restart Expo: `npm start --clear`

### Changes not reflecting

1. Shake device and tap "Reload"
2. Or press `r` in the terminal

## Development

### Building for Production

```bash
# Create development build (requires EAS CLI)
npx eas build --platform ios --profile development
npx eas build --platform android --profile development

# Create production build
npx eas build --platform all --profile production
```

### Running Tests

```bash
npm test
```

### Type Checking

```bash
npx tsc --noEmit
```

## Dependencies

Key dependencies:
- `expo` - Development platform
- `expo-barcode-scanner` - Barcode/QR scanning
- `@react-navigation/native` - Navigation
- `@react-navigation/native-stack` - Stack navigator
- `@react-native-async-storage/async-storage` - Local storage

## License

MIT
