// Discovery service - handles device discovery from DHCP leases

import { BaseService } from './base';
import type { DiscoveredDevice, DiscoveryLog } from '../types';

export class DiscoveryService extends BaseService {
  async list(): Promise<DiscoveredDevice[]> {
    return this.get<DiscoveredDevice[]>('/discovery');
  }

  async listAllLeases(): Promise<DiscoveredDevice[]> {
    return this.get<DiscoveredDevice[]>('/discovery/leases');
  }

  async clearTracking(): Promise<void> {
    await this.post<{ message: string }>('/discovery/clear');
  }

  async listLogs(limit?: number): Promise<DiscoveryLog[]> {
    const query = limit ? `?limit=${limit}` : '';
    return this.get<DiscoveryLog[]>(`/discovery/logs${query}`);
  }

  async clearLogs(): Promise<void> {
    await this.delete<{ message: string }>('/discovery/logs');
  }
}
