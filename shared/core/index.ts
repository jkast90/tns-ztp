// Core module - platform agnostic code
// This can be shared between React Web and React Native

// Types
export * from './types';

// Services
export {
  BaseService,
  DeviceService,
  SettingsService,
  configureServices,
  getServiceConfig,
  getServices,
  type ServiceConfig,
  type Services,
} from './services';

// Hooks
export {
  useDevices,
  useSettings,
  useBackups,
  useTheme,
  useWebTheme,
  THEME_OPTIONS,
  type UseDevicesOptions,
  type UseDevicesReturn,
  type UseSettingsReturn,
  type UseBackupsReturn,
  type ThemeConfig,
  type UseThemeOptions,
  type UseThemeReturn,
} from './hooks';

// Utils
export {
  formatDate,
  formatRelativeTime,
  formatMacAddress,
  formatFileSize,
  validateMacAddress,
  validateIpAddress,
  validateHostname,
  validateDeviceForm,
  validateSettingsForm,
  type ValidationResult,
} from './utils';
