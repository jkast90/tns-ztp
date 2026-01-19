// Hooks barrel export

export {
  useCrud,
  type CrudService,
  type UseCrudOptions,
  type UseCrudReturn,
  type CrudLabels,
} from './useCrud';
export { useDevices, type UseDevicesOptions, type UseDevicesReturn } from './useDevices';
export { useSettings, type UseSettingsReturn } from './useSettings';
export { useBackups, type UseBackupsReturn } from './useBackups';
export { useVendors, type UseVendorsOptions, type UseVendorsReturn } from './useVendors';
export { useDhcpOptions, type UseDhcpOptionsOptions, type UseDhcpOptionsReturn } from './useDhcpOptions';
export { useTemplates, type UseTemplatesOptions, type UseTemplatesReturn } from './useTemplates';
export { useDiscovery, type UseDiscoveryOptions, type UseDiscoveryReturn } from './useDiscovery';
export { useTestContainers, type UseTestContainersOptions, type UseTestContainersReturn } from './useTestContainers';
export {
  useTheme,
  useWebTheme,
  THEME_OPTIONS,
  type ThemeConfig,
  type UseThemeOptions,
  type UseThemeReturn
} from './useTheme';
export {
  useForm,
  type UseFormOptions,
  type UseFormReturn,
} from './useForm';
export {
  useWebSocket,
  type UseWebSocketOptions,
  type UseWebSocketReturn,
} from './useWebSocket';
export {
  useModalForm,
  type UseModalFormOptions,
  type UseModalFormReturn,
} from './useModalForm';
export {
  useNotification,
  createMobileNotificationHandler,
  createWebNotificationHandler,
  type NotificationType,
  type NotificationMessage,
  type ConfirmOptions,
  type NotificationHandler,
  type UseNotificationOptions,
  type UseNotificationReturn,
} from './useNotification';
export {
  useListFiltering,
  filterByVendor,
  groupByVendor,
  type UseListFilteringOptions,
  type UseListFilteringReturn,
  type GroupedItems,
} from './useListFiltering';
export {
  useAsyncModal,
  useSimpleModal,
  type UseAsyncModalOptions,
  type UseAsyncModalReturn,
} from './useAsyncModal';
