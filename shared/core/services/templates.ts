// Template service - handles all template-related API operations

import { BaseService } from './base';
import type { Template, TemplateVariable } from '../types';

export class TemplateService extends BaseService {
  async list(): Promise<Template[]> {
    return this.get<Template[]>('/templates');
  }

  async getById(id: string): Promise<Template> {
    return this.get<Template>(`/templates/${encodeURIComponent(id)}`);
  }

  async create(template: Partial<Template>): Promise<Template> {
    return this.post<Template>('/templates', template);
  }

  async update(id: string, template: Partial<Template>): Promise<Template> {
    return this.put<Template>(`/templates/${encodeURIComponent(id)}`, template);
  }

  async remove(id: string): Promise<void> {
    return this.delete<void>(`/templates/${encodeURIComponent(id)}`);
  }

  async preview(id: string, data: {
    device: {
      mac: string;
      ip: string;
      hostname: string;
      vendor?: string;
      serial_number?: string;
    };
    subnet: string;
    gateway: string;
  }): Promise<{ output: string }> {
    return this.post<{ output: string }>(`/templates/${encodeURIComponent(id)}/preview`, data);
  }

  async getVariables(): Promise<TemplateVariable[]> {
    return this.get<TemplateVariable[]>('/templates/_/variables');
  }
}
