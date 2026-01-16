// DHCP Options service - handles all DHCP option-related API operations

import { BaseService } from './base';
import type { DhcpOption } from '../types';

export class DhcpOptionService extends BaseService {
  async list(): Promise<DhcpOption[]> {
    return this.get<DhcpOption[]>('/dhcp-options');
  }

  async getById(id: string): Promise<DhcpOption> {
    return this.get<DhcpOption>(`/dhcp-options/${encodeURIComponent(id)}`);
  }

  async create(option: Partial<DhcpOption>): Promise<DhcpOption> {
    return this.post<DhcpOption>('/dhcp-options', option);
  }

  async update(id: string, option: Partial<DhcpOption>): Promise<DhcpOption> {
    return this.put<DhcpOption>(`/dhcp-options/${encodeURIComponent(id)}`, option);
  }

  async remove(id: string): Promise<void> {
    return this.delete<void>(`/dhcp-options/${encodeURIComponent(id)}`);
  }
}
