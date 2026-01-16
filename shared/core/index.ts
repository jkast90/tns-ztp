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
  useVendors,
  useDhcpOptions,
  useTemplates,
  useTheme,
  useWebTheme,
  useForm,
  THEME_OPTIONS,
  type UseDevicesOptions,
  type UseDevicesReturn,
  type UseSettingsReturn,
  type UseBackupsReturn,
  type UseVendorsOptions,
  type UseVendorsReturn,
  type UseDhcpOptionsOptions,
  type UseDhcpOptionsReturn,
  type UseTemplatesOptions,
  type UseTemplatesReturn,
  type ThemeConfig,
  type UseThemeOptions,
  type UseThemeReturn,
  type UseFormOptions,
  type UseFormReturn,
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
  getErrorMessage,
  parseApiError,
  type ValidationResult,
  type ParsedApiError,
} from './utils';
