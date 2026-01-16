// Template management hook

import { useState, useEffect, useCallback } from 'react';
import type { Template, TemplateVariable } from '../types';
import { getServices } from '../services';

export interface UseTemplatesOptions {
  vendorFilter?: string;
}

export interface UseTemplatesReturn {
  templates: Template[];
  variables: TemplateVariable[];
  loading: boolean;
  error: string | null;
  message: { type: 'success' | 'error'; text: string } | null;
  clearMessage: () => void;
  createTemplate: (template: Partial<Template>) => Promise<boolean>;
  updateTemplate: (id: string, template: Partial<Template>) => Promise<boolean>;
  deleteTemplate: (id: string) => Promise<boolean>;
  previewTemplate: (id: string, data: {
    device: {
      mac: string;
      ip: string;
      hostname: string;
      vendor?: string;
      serial_number?: string;
    };
    subnet: string;
    gateway: string;
  }) => Promise<string | null>;
  refresh: () => Promise<void>;
}

export function useTemplates(options: UseTemplatesOptions = {}): UseTemplatesReturn {
  const { vendorFilter } = options;
  const [templates, setTemplates] = useState<Template[]>([]);
  const [variables, setVariables] = useState<TemplateVariable[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const clearMessage = useCallback(() => setMessage(null), []);

  const fetchTemplates = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const services = getServices();
      const data = await services.templates.list();

      // Apply client-side vendor filter if specified
      let filtered = data;
      if (vendorFilter && vendorFilter !== 'all') {
        filtered = data.filter(t => !t.vendor_id || t.vendor_id === vendorFilter);
      }

      setTemplates(filtered);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch templates';
      setError(errorMessage);
      setTemplates([]);
    } finally {
      setLoading(false);
    }
  }, [vendorFilter]);

  const fetchVariables = useCallback(async () => {
    try {
      const services = getServices();
      const data = await services.templates.getVariables();
      setVariables(data);
    } catch (err) {
      console.error('Failed to fetch template variables:', err);
      setVariables([]);
    }
  }, []);

  useEffect(() => {
    fetchTemplates();
    fetchVariables();
  }, [fetchTemplates, fetchVariables]);

  const createTemplate = useCallback(async (template: Partial<Template>): Promise<boolean> => {
    try {
      const services = getServices();
      await services.templates.create(template);
      setMessage({ type: 'success', text: 'Template created successfully' });
      await fetchTemplates();
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create template';
      setMessage({ type: 'error', text: errorMessage });
      return false;
    }
  }, [fetchTemplates]);

  const updateTemplate = useCallback(async (id: string, template: Partial<Template>): Promise<boolean> => {
    try {
      const services = getServices();
      await services.templates.update(id, template);
      setMessage({ type: 'success', text: 'Template updated successfully' });
      await fetchTemplates();
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update template';
      setMessage({ type: 'error', text: errorMessage });
      return false;
    }
  }, [fetchTemplates]);

  const deleteTemplate = useCallback(async (id: string): Promise<boolean> => {
    try {
      const services = getServices();
      await services.templates.remove(id);
      setMessage({ type: 'success', text: 'Template deleted successfully' });
      await fetchTemplates();
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete template';
      setMessage({ type: 'error', text: errorMessage });
      return false;
    }
  }, [fetchTemplates]);

  const previewTemplate = useCallback(async (id: string, data: {
    device: {
      mac: string;
      ip: string;
      hostname: string;
      vendor?: string;
      serial_number?: string;
    };
    subnet: string;
    gateway: string;
  }): Promise<string | null> => {
    try {
      const services = getServices();
      const result = await services.templates.preview(id, data);
      return result.output;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to preview template';
      setMessage({ type: 'error', text: errorMessage });
      return null;
    }
  }, []);

  return {
    templates,
    variables,
    loading,
    error,
    message,
    clearMessage,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    previewTemplate,
    refresh: fetchTemplates,
  };
}
