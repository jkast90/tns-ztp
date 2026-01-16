// Device management hook - handles device CRUD operations and state

import { useState, useCallback, useEffect } from 'react';
import type { Device, Message } from '../types';
import { getServices } from '../services';

export interface UseDevicesOptions {
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export interface UseDevicesReturn {
  devices: Device[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  createDevice: (device: Partial<Device>) => Promise<boolean>;
  updateDevice: (mac: string, device: Partial<Device>) => Promise<boolean>;
  deleteDevice: (mac: string) => Promise<boolean>;
  triggerBackup: (mac: string) => Promise<boolean>;
  message: Message | null;
  clearMessage: () => void;
}

export function useDevices(options: UseDevicesOptions = {}): UseDevicesReturn {
  const { autoRefresh = true, refreshInterval = 10000 } = options;

  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<Message | null>(null);

  const services = getServices();

  const clearMessage = useCallback(() => setMessage(null), []);

  const refresh = useCallback(async () => {
    try {
      const data = await services.devices.list();
      setDevices(data || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load devices');
    } finally {
      setLoading(false);
    }
  }, [services.devices]);

  const createDevice = useCallback(async (device: Partial<Device>): Promise<boolean> => {
    try {
      await services.devices.create(device);
      setMessage({ type: 'success', text: 'Device added successfully' });
      await refresh();
      return true;
    } catch (err) {
      setMessage({ type: 'error', text: `Failed to add device: ${err}` });
      return false;
    }
  }, [services.devices, refresh]);

  const updateDevice = useCallback(async (mac: string, device: Partial<Device>): Promise<boolean> => {
    try {
      await services.devices.update(mac, device);
      setMessage({ type: 'success', text: 'Device updated successfully' });
      await refresh();
      return true;
    } catch (err) {
      setMessage({ type: 'error', text: `Failed to update device: ${err}` });
      return false;
    }
  }, [services.devices, refresh]);

  const deleteDevice = useCallback(async (mac: string): Promise<boolean> => {
    try {
      await services.devices.remove(mac);
      setMessage({ type: 'success', text: 'Device deleted successfully' });
      await refresh();
      return true;
    } catch (err) {
      setMessage({ type: 'error', text: `Failed to delete device: ${err}` });
      return false;
    }
  }, [services.devices, refresh]);

  const triggerBackup = useCallback(async (mac: string): Promise<boolean> => {
    try {
      await services.devices.triggerBackup(mac);
      setMessage({ type: 'success', text: 'Backup initiated' });
      return true;
    } catch (err) {
      setMessage({ type: 'error', text: `Failed to trigger backup: ${err}` });
      return false;
    }
  }, [services.devices]);

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
    devices,
    loading,
    error,
    refresh,
    createDevice,
    updateDevice,
    deleteDevice,
    triggerBackup,
    message,
    clearMessage,
  };
}
