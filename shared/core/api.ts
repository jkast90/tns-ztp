// API Client - platform agnostic (works with any fetch implementation)

import type { Device, Settings, Backup } from './types';

export interface ApiClientConfig {
  baseUrl: string;
  fetch?: typeof fetch;
}

export class ApiClient {
  private baseUrl: string;
  private fetchFn: typeof fetch;

  constructor(config: ApiClientConfig) {
    this.baseUrl = config.baseUrl;
    this.fetchFn = config.fetch || fetch;
  }

  private async request<T>(path: string, options?: RequestInit): Promise<T> {
    const response = await this.fetchFn(`${this.baseUrl}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(error.error || `HTTP ${response.status}`);
    }

    if (response.status === 204) {
      return undefined as T;
    }

    return response.json();
  }

  // Devices
  async listDevices(): Promise<Device[]> {
    return this.request<Device[]>('/devices');
  }

  async getDevice(mac: string): Promise<Device> {
    return this.request<Device>(`/devices/${encodeURIComponent(mac)}`);
  }

  async createDevice(device: Partial<Device>): Promise<Device> {
    return this.request<Device>('/devices', {
      method: 'POST',
      body: JSON.stringify(device),
    });
  }

  async updateDevice(mac: string, device: Partial<Device>): Promise<Device> {
    return this.request<Device>(`/devices/${encodeURIComponent(mac)}`, {
      method: 'PUT',
      body: JSON.stringify(device),
    });
  }

  async deleteDevice(mac: string): Promise<void> {
    return this.request<void>(`/devices/${encodeURIComponent(mac)}`, {
      method: 'DELETE',
    });
  }

  // Settings
  async getSettings(): Promise<Settings> {
    return this.request<Settings>('/settings');
  }

  async updateSettings(settings: Settings): Promise<Settings> {
    return this.request<Settings>('/settings', {
      method: 'PUT',
      body: JSON.stringify(settings),
    });
  }

  // Config reload
  async reloadConfig(): Promise<void> {
    return this.request<void>('/reload', {
      method: 'POST',
    });
  }

  // Backups
  async triggerBackup(mac: string): Promise<void> {
    return this.request<void>(`/devices/${encodeURIComponent(mac)}/backup`, {
      method: 'POST',
    });
  }

  async listBackups(mac: string): Promise<Backup[]> {
    return this.request<Backup[]>(`/devices/${encodeURIComponent(mac)}/backups`);
  }
}

// Default instance for web
export const createApiClient = (baseUrl: string = '/api') => new ApiClient({ baseUrl });
