// Service layer - aggregates all services

import { DeviceService } from './devices';
import { SettingsService } from './settings';
import { VendorService } from './vendors';
import { DhcpOptionService } from './dhcpOptions';
import { TemplateService } from './templates';
import { DiscoveryService } from './discovery';
import { TestContainersService } from './testContainers';
import { NetBoxService } from './netbox';

export { BaseService, configureServices, getServiceConfig, type ServiceConfig } from './base';
export { DeviceService } from './devices';
export type { ConnectResult, ConfigResult, BackupContentResult, PingResult, SSHResult } from './devices';
export { SettingsService } from './settings';
export { VendorService } from './vendors';
export { DhcpOptionService } from './dhcpOptions';
export { TemplateService } from './templates';
export type { DetectedVariable, TemplatizeResponse } from './templates';
export { DiscoveryService } from './discovery';
export { TestContainersService } from './testContainers';
export { NetBoxService } from './netbox';
export type { NetBoxConfig, NetBoxStatus, NetBoxSyncResult, NetBoxManufacturer, NetBoxSite, NetBoxDeviceRole, NetBoxDevice, NetBoxVendorSyncResponse } from './netbox';
export { WebSocketService, getWebSocketService } from './websocket';
export type { WebSocketEvent, WebSocketEventType, DeviceDiscoveredPayload, ConfigPulledPayload, WebSocketEventHandler } from './websocket';

export interface Services {
  devices: DeviceService;
  settings: SettingsService;
  vendors: VendorService;
  dhcpOptions: DhcpOptionService;
  templates: TemplateService;
  discovery: DiscoveryService;
  testContainers: TestContainersService;
  netbox: NetBoxService;
}

// Singleton services that use global config
let services: Services | null = null;

export function getServices(): Services {
  if (!services) {
    services = {
      devices: new DeviceService(),
      settings: new SettingsService(),
      vendors: new VendorService(),
      dhcpOptions: new DhcpOptionService(),
      templates: new TemplateService(),
      discovery: new DiscoveryService(),
      testContainers: new TestContainersService(),
      netbox: new NetBoxService(),
    };
  }
  return services;
}
