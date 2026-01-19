// Device management hook - uses generic useCrud for CRUD operations

import { useCallback, useMemo } from 'react';
import type { Device, Message } from '../types';
import { getServices } from '../services';
import { useCrud, type UseCrudOptions } from './useCrud';

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

  const services = useMemo(() => getServices(), []);

  const crudOptions: UseCrudOptions<Device> = useMemo(() => ({
    autoRefresh,
    refreshInterval,
  }), [autoRefresh, refreshInterval]);

  const {
    items: devices,
    loading,
    error,
    refresh,
    create: createDevice,
    update: updateDevice,
    remove: deleteDevice,
    message,
    clearMessage,
    setMessage,
  } = useCrud({
    service: services.devices,
    labels: { singular: 'device', plural: 'devices' },
    options: crudOptions,
  });

  // Device-specific method: trigger backup
  const triggerBackup = useCallback(async (mac: string): Promise<boolean> => {
    try {
      await services.devices.triggerBackup(mac);
      setMessage({ type: 'success', text: 'Backup initiated' });
      return true;
    } catch (err) {
      setMessage({ type: 'error', text: `Failed to trigger backup: ${err}` });
      return false;
    }
  }, [services.devices, setMessage]);

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
