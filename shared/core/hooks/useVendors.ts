// Vendor management hook - handles vendor CRUD operations and state

import { useState, useCallback, useEffect } from 'react';
import type { Vendor, Message } from '../types';
import { getServices } from '../services';

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
  message: Message | null;
  clearMessage: () => void;
}

export function useVendors(options: UseVendorsOptions = {}): UseVendorsReturn {
  const { autoRefresh = false, refreshInterval = 30000 } = options;

  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<Message | null>(null);

  const services = getServices();

  const clearMessage = useCallback(() => setMessage(null), []);

  const refresh = useCallback(async () => {
    try {
      const data = await services.vendors.list();
      setVendors(data || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load vendors');
    } finally {
      setLoading(false);
    }
  }, [services.vendors]);

  const createVendor = useCallback(async (vendor: Partial<Vendor>): Promise<boolean> => {
    try {
      await services.vendors.create(vendor);
      setMessage({ type: 'success', text: 'Vendor added successfully' });
      await refresh();
      return true;
    } catch (err) {
      setMessage({ type: 'error', text: `Failed to add vendor: ${err}` });
      return false;
    }
  }, [services.vendors, refresh]);

  const updateVendor = useCallback(async (id: string, vendor: Partial<Vendor>): Promise<boolean> => {
    try {
      await services.vendors.update(id, vendor);
      setMessage({ type: 'success', text: 'Vendor updated successfully' });
      await refresh();
      return true;
    } catch (err) {
      setMessage({ type: 'error', text: `Failed to update vendor: ${err}` });
      return false;
    }
  }, [services.vendors, refresh]);

  const deleteVendor = useCallback(async (id: string): Promise<boolean> => {
    try {
      await services.vendors.remove(id);
      setMessage({ type: 'success', text: 'Vendor deleted successfully' });
      await refresh();
      return true;
    } catch (err) {
      setMessage({ type: 'error', text: `Failed to delete vendor: ${err}` });
      return false;
    }
  }, [services.vendors, refresh]);

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
    vendors,
    loading,
    error,
    refresh,
    createVendor,
    updateVendor,
    deleteVendor,
    message,
    clearMessage,
  };
}
