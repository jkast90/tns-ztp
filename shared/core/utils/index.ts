// Utils barrel export

export {
  formatDate,
  formatRelativeTime,
  formatMacAddress,
  formatFileSize,
  formatExpiry,
  formatEventType,
  getEventTypeIcon,
  type DiscoveryEventType,
} from './format';

export {
  validateMacAddress,
  validateIpAddress,
  validateHostname,
  validateDeviceForm,
  validateSettingsForm,
  type ValidationResult,
} from './validation';

export {
  getErrorMessage,
  parseApiError,
  type ParsedApiError,
} from './errors';

export { lookupVendorByMac, setVendorCache, getVendorCache } from './vendor';

export {
  randomHex,
  generateMac,
  getVendorPrefixOptions,
  getVendorClassForVendor,
  type VendorPrefixOption,
} from './mac-generation';

export {
  getVendorFilterOptions,
  getVendorSelectOptions,
  getVendorName,
  groupByVendor,
  filterByVendor,
  generateId,
  slugify,
  type VendorFilterOption,
  type VendorSelectOption,
  type GroupedByVendor,
} from './data-transform';

export {
  createChangeHandler,
  parseListValue,
  formatListValue,
} from './forms';

export {
  getStatusColor,
  getStatusColors,
  getVariableTypeIcon,
  getVariableTypeColor,
  getStatusIcon,
  getStatusLabel,
  type VariableTypeIcon,
  type StatusIcon,
} from './styles';
