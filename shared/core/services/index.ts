// Service layer - aggregates all services

import { DeviceService } from './devices';
import { SettingsService } from './settings';
import { VendorService } from './vendors';
import { DhcpOptionService } from './dhcpOptions';
import { TemplateService } from './templates';

export { BaseService, configureServices, getServiceConfig, type ServiceConfig } from './base';
export { DeviceService } from './devices';
export { SettingsService } from './settings';
export { VendorService } from './vendors';
export { DhcpOptionService } from './dhcpOptions';
export { TemplateService } from './templates';

export interface Services {
  devices: DeviceService;
  settings: SettingsService;
  vendors: VendorService;
  dhcpOptions: DhcpOptionService;
  templates: TemplateService;
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
    };
  }
  return services;
}
