// Template management hook - uses generic useCrud for CRUD operations

import { useState, useEffect, useCallback, useMemo } from 'react';
import type { Template, TemplateVariable } from '../types';
import { getServices } from '../services';
import { useCrud, type UseCrudOptions } from './useCrud';

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
  const [variables, setVariables] = useState<TemplateVariable[]>([]);

  const services = useMemo(() => getServices(), []);

  // Filter function for vendor filtering
  const filterFn = useCallback((items: Template[]) => {
    if (!vendorFilter || vendorFilter === 'all') {
      return items;
    }
    return items.filter(t => !t.vendor_id || t.vendor_id === vendorFilter);
  }, [vendorFilter]);

  const crudOptions: UseCrudOptions<Template> = useMemo(() => ({
    filter: filterFn,
  }), [filterFn]);

  const {
    filteredItems: templates,
    loading,
    error,
    message,
    clearMessage,
    create: createTemplate,
    update: updateTemplate,
    remove: deleteTemplate,
    refresh,
    setMessage,
  } = useCrud({
    service: services.templates,
    labels: { singular: 'template', plural: 'templates' },
    options: crudOptions,
  });

  // Fetch variables separately (not part of CRUD)
  const fetchVariables = useCallback(async () => {
    try {
      const data = await services.templates.getVariables();
      setVariables(data);
    } catch (err) {
      console.error('Failed to fetch template variables:', err);
      setVariables([]);
    }
  }, [services.templates]);

  useEffect(() => {
    fetchVariables();
  }, [fetchVariables]);

  // Template-specific method: preview
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
      const result = await services.templates.preview(id, data);
      return result.output;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to preview template';
      setMessage({ type: 'error', text: errorMessage });
      return null;
    }
  }, [services.templates, setMessage]);

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
    refresh,
  };
}
