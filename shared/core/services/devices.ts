// Device service - handles all device-related API operations

import { BaseService } from './base';
import type { Device, Backup } from '../types';

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
}
