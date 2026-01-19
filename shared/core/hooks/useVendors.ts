// Vendor management hook - uses generic useCrud for CRUD operations

import { useMemo, useCallback } from 'react';
import type { Vendor, Message } from '../types';
import { getServices } from '../services';
import { useCrud, type UseCrudOptions } from './useCrud';

export interface UseVendorsOptions {
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export interface UseVendorsReturn {
  vendors: Vendor[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  createVendor: (vendor: Partial<Vendor>) => Promise<boolean>;
  updateVendor: (id: string, vendor: Partial<Vendor>) => Promise<boolean>;
  deleteVendor: (id: string) => Promise<boolean>;
  resetToDefaults: () => Promise<boolean>;
  message: Message | null;
  clearMessage: () => void;
}

export function useVendors(options: UseVendorsOptions = {}): UseVendorsReturn {
  const { autoRefresh = false, refreshInterval = 30000 } = options;

  const services = useMemo(() => getServices(), []);

  const crudOptions: UseCrudOptions<Vendor> = useMemo(() => ({
    autoRefresh,
    refreshInterval,
  }), [autoRefresh, refreshInterval]);

  const {
    items: vendors,
    loading,
    error,
    refresh,
    create: createVendor,
    update: updateVendor,
    remove: deleteVendor,
    message,
    clearMessage,
    setMessage,
  } = useCrud({
    service: services.vendors,
    labels: { singular: 'vendor', plural: 'vendors' },
    options: crudOptions,
  });

  // Reset to defaults: update existing vendors with defaults or create missing ones
  const resetToDefaults = useCallback(async (): Promise<boolean> => {
    try {
      // Get defaults from API
      const defaults = await services.vendors.listDefaults();

      // Update existing vendors with default MAC prefixes, or create if missing
      for (const defaultVendor of defaults) {
        const existing = vendors.find(v => v.id === defaultVendor.id);
        if (existing) {
          // Update with default MAC prefixes
          await services.vendors.update(defaultVendor.id, {
            ...existing,
            mac_prefixes: defaultVendor.mac_prefixes,
          });
        } else {
          // Create the vendor
          await services.vendors.create(defaultVendor);
        }
      }

      await refresh();
      setMessage({ type: 'success', text: 'Vendors reset to defaults' });
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to reset vendors';
      setMessage({ type: 'error', text: errorMessage });
      return false;
    }
  }, [vendors, services.vendors, refresh, setMessage]);

  return {
    vendors,
    loading,
    error,
    refresh,
    createVendor,
    updateVendor,
    deleteVendor,
    resetToDefaults,
    message,
    clearMessage,
  };
}
