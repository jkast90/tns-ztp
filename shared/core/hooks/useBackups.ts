// Backup management hook

import { useState, useCallback } from 'react';
import type { Backup } from '../types';
import { getServices } from '../services';

export interface UseBackupsReturn {
  backups: Backup[];
  loading: boolean;
  error: string | null;
  loadBackups: (mac: string) => Promise<void>;
  clear: () => void;
}

export function useBackups(): UseBackupsReturn {
  const [backups, setBackups] = useState<Backup[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const services = getServices();

  const loadBackups = useCallback(async (mac: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await services.devices.listBackups(mac);
      setBackups(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load backups');
      setBackups([]);
    } finally {
      setLoading(false);
    }
  }, [services.devices]);

  const clear = useCallback(() => {
    setBackups([]);
    setError(null);
  }, []);

  return {
    backups,
    loading,
    error,
    loadBackups,
    clear,
  };
}
