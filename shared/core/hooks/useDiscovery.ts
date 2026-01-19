// Discovery hook - manages discovered devices from DHCP leases

import { useState, useEffect, useCallback, useRef } from 'react';
import type { DiscoveredDevice } from '../types';
import { getServices } from '../services';

export interface UseDiscoveryOptions {
  autoRefresh?: boolean;
  refreshInterval?: number; // in milliseconds
  onNewDevices?: (devices: DiscoveredDevice[]) => void;
}

export interface UseDiscoveryReturn {
  discovered: DiscoveredDevice[];
  allLeases: DiscoveredDevice[];
  loading: boolean;
  error: string | null;
  message: { type: 'success' | 'error'; text: string } | null;
  clearMessage: () => void;
  refresh: () => Promise<void>;
  refreshLeases: () => Promise<void>;
  clearKnownDevices: () => void;
}

export function useDiscovery(options: UseDiscoveryOptions = {}): UseDiscoveryReturn {
  const { autoRefresh = false, refreshInterval = 10000, onNewDevices } = options;

  const [discovered, setDiscovered] = useState<DiscoveredDevice[]>([]);
  const [allLeases, setAllLeases] = useState<DiscoveredDevice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Track known MACs to detect new devices
  const knownMacsRef = useRef<Set<string>>(new Set());
  const initialLoadRef = useRef(true);
  // Track consecutive failures to avoid log spam
  const failureCountRef = useRef(0);

  const clearMessage = useCallback(() => setMessage(null), []);

  // Clear known devices so they'll be treated as "new" on next fetch
  const clearKnownDevices = useCallback(() => {
    knownMacsRef.current = new Set();
  }, []);

  const fetchDiscovered = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const services = getServices();
      const data = await services.discovery.list();

      // Reset failure count on success
      failureCountRef.current = 0;

      // Check for new devices (only after initial load)
      if (!initialLoadRef.current && onNewDevices) {
        const newDevices = data.filter(device => !knownMacsRef.current.has(device.mac));
        if (newDevices.length > 0) {
          onNewDevices(newDevices);
        }
      }

      // Update known MACs
      knownMacsRef.current = new Set(data.map(d => d.mac));
      initialLoadRef.current = false;

      setDiscovered(data);
    } catch (err) {
      // Only log on first failure to avoid spam
      if (failureCountRef.current === 0) {
        console.warn('Discovery fetch failed (will retry silently):', err instanceof Error ? err.message : err);
      }
      failureCountRef.current++;
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch discovered devices';
      setError(errorMessage);
      setDiscovered([]);
    } finally {
      setLoading(false);
    }
  }, [onNewDevices]);

  const fetchAllLeases = useCallback(async () => {
    try {
      const services = getServices();
      const data = await services.discovery.listAllLeases();
      setAllLeases(data);
    } catch {
      // Silently fail - error is already shown from fetchDiscovered
      setAllLeases([]);
    }
  }, []);

  useEffect(() => {
    fetchDiscovered();
    fetchAllLeases();
  }, [fetchDiscovered, fetchAllLeases]);

  // Auto-refresh if enabled
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      fetchDiscovered();
      fetchAllLeases();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, fetchDiscovered, fetchAllLeases]);

  return {
    discovered,
    allLeases,
    loading,
    error,
    message,
    clearMessage,
    refresh: fetchDiscovered,
    refreshLeases: fetchAllLeases,
    clearKnownDevices,
  };
}
