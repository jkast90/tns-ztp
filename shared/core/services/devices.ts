// Device service - handles all device-related API operations

import { BaseService } from './base';
import type { Device, Backup } from '../types';

export interface PingResult {
  reachable: boolean;
  latency?: string;
  error?: string;
}

export interface SSHResult {
  connected: boolean;
  uptime?: string;
  error?: string;
}

export interface ConnectResult {
  ping: PingResult;
  ssh: SSHResult;
  success: boolean;
}

export interface ConfigResult {
  mac: string;
  hostname: string;
  filename: string;
  content: string;
  exists: boolean;
}

export interface BackupContentResult {
  id: number;
  filename: string;
  content: string;
  exists: boolean;
}

export class DeviceService extends BaseService {
  async list(): Promise<Device[]> {
    return this.get<Device[]>('/devices');
  }

  async getByMac(mac: string): Promise<Device> {
    return this.get<Device>(`/devices/${encodeURIComponent(mac)}`);
  }

  async create(device: Partial<Device>): Promise<Device> {
    return this.post<Device>('/devices', device);
  }

  async update(mac: string, device: Partial<Device>): Promise<Device> {
    return this.put<Device>(`/devices/${encodeURIComponent(mac)}`, device);
  }

  async remove(mac: string): Promise<void> {
    return this.delete<void>(`/devices/${encodeURIComponent(mac)}`);
  }

  async triggerBackup(mac: string): Promise<void> {
    return this.post<void>(`/devices/${encodeURIComponent(mac)}/backup`);
  }

  async listBackups(mac: string): Promise<Backup[]> {
    return this.get<Backup[]>(`/devices/${encodeURIComponent(mac)}/backups`);
  }

  async connect(mac: string): Promise<ConnectResult> {
    return this.post<ConnectResult>(`/devices/${encodeURIComponent(mac)}/connect`);
  }

  async getConfig(mac: string): Promise<ConfigResult> {
    return this.get<ConfigResult>(`/devices/${encodeURIComponent(mac)}/config`);
  }

  async getBackupContent(id: number): Promise<BackupContentResult> {
    return this.get<BackupContentResult>(`/backups/${id}`);
  }
}
