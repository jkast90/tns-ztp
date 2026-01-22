// Local addresses hook - fetches network interfaces from the server

import { useState, useCallback, useEffect } from 'react';
import type { NetworkInterface } from '../types';
import { getServices } from '../services';

export interface UseLocalAddressesReturn {
  addresses: NetworkInterface[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useLocalAddresses(autoLoad = false): UseLocalAddressesReturn {
  const [addresses, setAddresses] = useState<NetworkInterface[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const services = getServices();

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await services.settings.getLocalAddresses();
      setAddresses(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load addresses');
    } finally {
      setLoading(false);
    }
  }, [services.settings]);

  useEffect(() => {
    if (autoLoad) {
      refresh();
    }
  }, [autoLoad, refresh]);

  return {
    addresses,
    loading,
    error,
    refresh,
  };
}
