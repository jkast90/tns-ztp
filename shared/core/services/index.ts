// Service layer - aggregates all services

import { DeviceService } from './devices';
import { SettingsService } from './settings';

export { BaseService, configureServices, getServiceConfig, type ServiceConfig } from './base';
export { DeviceService } from './devices';
export { SettingsService } from './settings';

export interface Services {
  devices: DeviceService;
  settings: SettingsService;
}

// Singleton services that use global config
let services: Services | null = null;

export function getServices(): Services {
  if (!services) {
    services = {
      devices: new DeviceService(),
      settings: new SettingsService(),
    };
  }
  return services;
}
