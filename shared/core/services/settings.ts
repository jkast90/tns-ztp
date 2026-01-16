// Settings service - handles global settings API operations

import { BaseService } from './base';
import type { Settings } from '../types';

export class SettingsService extends BaseService {
  async getSettings(): Promise<Settings> {
    return super.get<Settings>('/settings');
  }

  async update(settings: Settings): Promise<Settings> {
    return this.put<Settings>('/settings', settings);
  }

  async reloadConfig(): Promise<void> {
    return this.post<void>('/reload');
  }
}
