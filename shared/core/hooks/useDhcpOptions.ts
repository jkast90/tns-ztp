// DHCP Options management hook - handles DHCP option CRUD operations and state

import { useState, useCallback, useEffect, useMemo } from 'react';
import type { DhcpOption, Message } from '../types';
import { getServices } from '../services';

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
  message: Message | null;
  clearMessage: () => void;
}

export function useDhcpOptions(options: UseDhcpOptionsOptions = {}): UseDhcpOptionsReturn {
  const { autoRefresh = false, refreshInterval = 30000, vendorFilter } = options;

  const [dhcpOptions, setDhcpOptions] = useState<DhcpOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<Message | null>(null);

  const services = getServices();

  const clearMessage = useCallback(() => setMessage(null), []);

  const refresh = useCallback(async () => {
    try {
      const data = await services.dhcpOptions.list();
      setDhcpOptions(data || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load DHCP options');
    } finally {
      setLoading(false);
    }
  }, [services.dhcpOptions]);

  const filteredOptions = useMemo(() => {
    if (!vendorFilter || vendorFilter === 'all') {
      return dhcpOptions;
    }
    if (vendorFilter === 'global') {
      return dhcpOptions.filter(o => !o.vendor_id);
    }
    return dhcpOptions.filter(o => o.vendor_id === vendorFilter);
  }, [dhcpOptions, vendorFilter]);

  const createOption = useCallback(async (option: Partial<DhcpOption>): Promise<boolean> => {
    try {
      await services.dhcpOptions.create(option);
      setMessage({ type: 'success', text: 'DHCP option added successfully' });
      await refresh();
      return true;
    } catch (err) {
      setMessage({ type: 'error', text: `Failed to add DHCP option: ${err}` });
      return false;
    }
  }, [services.dhcpOptions, refresh]);

  const updateOption = useCallback(async (id: string, option: Partial<DhcpOption>): Promise<boolean> => {
    try {
      await services.dhcpOptions.update(id, option);
      setMessage({ type: 'success', text: 'DHCP option updated successfully' });
      await refresh();
      return true;
    } catch (err) {
      setMessage({ type: 'error', text: `Failed to update DHCP option: ${err}` });
      return false;
    }
  }, [services.dhcpOptions, refresh]);

  const deleteOption = useCallback(async (id: string): Promise<boolean> => {
    try {
      await services.dhcpOptions.remove(id);
      setMessage({ type: 'success', text: 'DHCP option deleted successfully' });
      await refresh();
      return true;
    } catch (err) {
      setMessage({ type: 'error', text: `Failed to delete DHCP option: ${err}` });
      return false;
    }
  }, [services.dhcpOptions, refresh]);

  // Initial load
  useEffect(() => {
    refresh();
  }, [refresh]);

  // Auto refresh
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(refresh, refreshInterval);
    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, refresh]);

  // Auto clear messages
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(clearMessage, 5000);
    return () => clearTimeout(timer);
  }, [message, clearMessage]);

  return {
    options: dhcpOptions,
    filteredOptions,
    loading,
    error,
    refresh,
    createOption,
    updateOption,
    deleteOption,
    message,
    clearMessage,
  };
}
