// NetBox integration service

import { BaseService } from './base';

export interface NetBoxConfig {
  url: string;
  token: string;
  site_id: number;
  role_id: number;
  sync_enabled: boolean;
}

export interface NetBoxStatus {
  connected: boolean;
  configured: boolean;
  url?: string;
  error?: string;
  message?: string;
}

export interface NetBoxSyncResult {
  created: number;
  updated: number;
  skipped: number;
  errors?: string[];
}

export interface NetBoxSyncPushResponse {
  message: string;
  result: NetBoxSyncResult;
}

export interface NetBoxSyncPullResponse {
  message: string;
  imported: number;
  skipped: number;
  result: NetBoxSyncResult;
}

export interface NetBoxManufacturer {
  id: number;
  name: string;
  slug: string;
  description?: string;
  custom_fields?: {
    mac_prefixes?: string;
    backup_command?: string;
    ssh_port?: number;
  };
}

export interface NetBoxVendorSyncResponse {
  message: string;
  result: {
    created: number;
    updated: number;
    errors?: string[];
  };
}

export interface NetBoxSite {
  id: number;
  name: string;
  slug: string;
  status?: { value: string; label: string };
  description?: string;
}

export interface NetBoxDeviceRole {
  id: number;
  name: string;
  slug: string;
  color?: string;
  description?: string;
}

export interface NetBoxDevice {
  id: number;
  name: string;
  device_type: {
    id: number;
    manufacturer: { id: number; name: string; slug: string };
    model: string;
    slug: string;
  };
  role: { id: number; name: string; slug: string };
  site: { id: number; name: string; slug: string };
  status: { value: string; label: string };
  serial?: string;
  primary_ip4?: { id: number; address: string };
  comments?: string;
  custom_fields?: Record<string, unknown>;
}

export class NetBoxService extends BaseService {
  // Status
  async getStatus(): Promise<NetBoxStatus> {
    return this.get<NetBoxStatus>('/netbox/status');
  }

  // Config
  async getConfig(): Promise<NetBoxConfig> {
    return this.get<NetBoxConfig>('/netbox/config');
  }

  async updateConfig(config: Partial<NetBoxConfig>): Promise<{ message: string }> {
    return this.put<{ message: string }>('/netbox/config', config);
  }

  // Sync operations
  async syncPush(): Promise<NetBoxSyncPushResponse> {
    return this.post<NetBoxSyncPushResponse>('/netbox/sync/push');
  }

  async syncPull(): Promise<NetBoxSyncPullResponse> {
    return this.post<NetBoxSyncPullResponse>('/netbox/sync/pull');
  }

  // Lists
  async getManufacturers(): Promise<NetBoxManufacturer[]> {
    return this.get<NetBoxManufacturer[]>('/netbox/manufacturers');
  }

  async getSites(): Promise<NetBoxSite[]> {
    return this.get<NetBoxSite[]>('/netbox/sites');
  }

  async getDeviceRoles(): Promise<NetBoxDeviceRole[]> {
    return this.get<NetBoxDeviceRole[]>('/netbox/device-roles');
  }

  // Vendor sync operations
  async syncVendorsPush(): Promise<NetBoxVendorSyncResponse> {
    return this.post<NetBoxVendorSyncResponse>('/netbox/sync/vendors/push');
  }

  async syncVendorsPull(): Promise<NetBoxVendorSyncResponse> {
    return this.post<NetBoxVendorSyncResponse>('/netbox/sync/vendors/pull');
  }
}
