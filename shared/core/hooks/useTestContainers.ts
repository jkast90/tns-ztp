import { useState, useEffect, useCallback } from 'react';
import { getServices } from '../services';
import type { TestContainer, SpawnContainerRequest, Message } from '../types';

export interface UseTestContainersOptions {
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export interface UseTestContainersReturn {
  containers: TestContainer[];
  loading: boolean;
  error: string | null;
  message: Message | null;
  clearMessage: () => void;
  refresh: () => Promise<void>;
  spawn: (request: SpawnContainerRequest) => Promise<TestContainer | null>;
  remove: (id: string) => Promise<boolean>;
}

export function useTestContainers(options: UseTestContainersOptions = {}): UseTestContainersReturn {
  const { autoRefresh = false, refreshInterval = 5000 } = options;

  const [containers, setContainers] = useState<TestContainer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<Message | null>(null);

  const clearMessage = useCallback(() => setMessage(null), []);

  const refresh = useCallback(async () => {
    try {
      const data = await getServices().testContainers.list();
      setContainers(data);
      setError(null);
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Failed to fetch containers';
      setError(errMsg);
      // Don't clear containers on error - keep showing last known state
    } finally {
      setLoading(false);
    }
  }, []);

  const spawn = useCallback(async (request: SpawnContainerRequest): Promise<TestContainer | null> => {
    try {
      const container = await getServices().testContainers.spawn(request);
      setMessage({ type: 'success', text: `Container ${container.hostname} spawned successfully` });
      await refresh();
      return container;
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Failed to spawn container';
      setMessage({ type: 'error', text: errMsg });
      return null;
    }
  }, [refresh]);

  const remove = useCallback(async (id: string): Promise<boolean> => {
    try {
      await getServices().testContainers.remove(id);
      setMessage({ type: 'success', text: 'Container removed successfully' });
      await refresh();
      return true;
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Failed to remove container';
      setMessage({ type: 'error', text: errMsg });
      return false;
    }
  }, [refresh]);

  // Initial fetch
  useEffect(() => {
    refresh();
  }, [refresh]);

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(refresh, refreshInterval);
    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, refresh]);

  return {
    containers,
    loading,
    error,
    message,
    clearMessage,
    refresh,
    spawn,
    remove,
  };
}
