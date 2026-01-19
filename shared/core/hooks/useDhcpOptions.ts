// DHCP Options management hook - uses generic useCrud for CRUD operations

import { useMemo, useCallback } from 'react';
import type { DhcpOption, Message } from '../types';
import { getServices } from '../services';
import { useCrud, type UseCrudOptions } from './useCrud';

export interface UseDhcpOptionsOptions {
  autoRefresh?: boolean;
  refreshInterval?: number;
  vendorFilter?: string; // Filter by vendor_id
}

export interface UseDhcpOptionsReturn {
  options: DhcpOption[];
  filteredOptions: DhcpOption[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  createOption: (option: Partial<DhcpOption>) => Promise<boolean>;
  updateOption: (id: string, option: Partial<DhcpOption>) => Promise<boolean>;
  deleteOption: (id: string) => Promise<boolean>;
  resetToDefaults: () => Promise<boolean>;
  message: Message | null;
  clearMessage: () => void;
}

export function useDhcpOptions(options: UseDhcpOptionsOptions = {}): UseDhcpOptionsReturn {
  const { autoRefresh = false, refreshInterval = 30000, vendorFilter } = options;

  const services = useMemo(() => getServices(), []);

  // Create filter function based on vendorFilter
  const filterFn = useCallback((items: DhcpOption[]) => {
    if (!vendorFilter || vendorFilter === 'all') {
      return items;
    }
    if (vendorFilter === 'global') {
      return items.filter(o => !o.vendor_id);
    }
    return items.filter(o => o.vendor_id === vendorFilter);
  }, [vendorFilter]);

  const crudOptions: UseCrudOptions<DhcpOption> = useMemo(() => ({
    autoRefresh,
    refreshInterval,
    filter: filterFn,
  }), [autoRefresh, refreshInterval, filterFn]);

  const {
    items: dhcpOptions,
    filteredItems: filteredOptions,
    loading,
    error,
    refresh,
    create: createOption,
    update: updateOption,
    remove: deleteOption,
    message,
    clearMessage,
    setMessage,
  } = useCrud({
    service: services.dhcpOptions,
    labels: { singular: 'DHCP option', plural: 'DHCP options' },
    options: crudOptions,
  });

  // Reset to defaults: delete all existing options and create defaults from API
  const resetToDefaults = useCallback(async (): Promise<boolean> => {
    try {
      // Get defaults from API
      const defaults = await services.dhcpOptions.listDefaults();

      // Delete all existing options
      for (const option of dhcpOptions) {
        await services.dhcpOptions.remove(option.id);
      }

      // Create default options
      for (const option of defaults) {
        await services.dhcpOptions.create(option);
      }

      await refresh();
      setMessage({ type: 'success', text: 'DHCP options reset to defaults' });
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to reset DHCP options';
      setMessage({ type: 'error', text: errorMessage });
      return false;
    }
  }, [dhcpOptions, services.dhcpOptions, refresh, setMessage]);

  return {
    options: dhcpOptions,
    filteredOptions,
    loading,
    error,
    refresh,
    createOption,
    updateOption,
    deleteOption,
    resetToDefaults,
    message,
    clearMessage,
  };
}
