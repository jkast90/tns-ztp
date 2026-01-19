// Generic CRUD hook - reduces duplication across resource management hooks

import { useState, useCallback, useEffect, useMemo } from 'react';
import type { Message } from '../types';

/**
 * Configuration for a CRUD service
 */
export interface CrudService<T, TCreate = Partial<T>, TUpdate = Partial<T>> {
  list: () => Promise<T[]>;
  create: (data: TCreate) => Promise<T>;
  update: (id: string, data: TUpdate) => Promise<T>;
  remove: (id: string) => Promise<void>;
}

/**
 * Options for the useCrud hook
 */
export interface UseCrudOptions<T> {
  /** Enable auto-refresh polling */
  autoRefresh?: boolean;
  /** Interval for auto-refresh in ms */
  refreshInterval?: number;
  /** Auto-clear success messages after delay (ms). Set to 0 to disable. */
  messageClearDelay?: number;
  /** Client-side filter function */
  filter?: (items: T[]) => T[];
}

/**
 * Return type for the useCrud hook
 */
export interface UseCrudReturn<T, TCreate = Partial<T>, TUpdate = Partial<T>> {
  /** All items */
  items: T[];
  /** Filtered items (if filter option provided) */
  filteredItems: T[];
  /** Loading state for initial fetch */
  loading: boolean;
  /** Error message if fetch failed */
  error: string | null;
  /** Refresh items from server */
  refresh: () => Promise<void>;
  /** Create a new item */
  create: (data: TCreate) => Promise<boolean>;
  /** Update an existing item */
  update: (id: string, data: TUpdate) => Promise<boolean>;
  /** Delete an item */
  remove: (id: string) => Promise<boolean>;
  /** Current message (success/error) */
  message: Message | null;
  /** Clear the current message */
  clearMessage: () => void;
  /** Set a custom message */
  setMessage: (message: Message | null) => void;
}

/**
 * Labels for CRUD operations - customize error/success messages
 */
export interface CrudLabels {
  singular: string;  // e.g., "device", "vendor"
  plural: string;    // e.g., "devices", "vendors"
}

const DEFAULT_LABELS: CrudLabels = {
  singular: 'item',
  plural: 'items',
};

/**
 * Generic CRUD hook that handles common patterns for resource management
 *
 * @example
 * ```tsx
 * const {
 *   items: devices,
 *   loading,
 *   error,
 *   create: createDevice,
 *   update: updateDevice,
 *   remove: deleteDevice,
 * } = useCrud({
 *   service: services.devices,
 *   labels: { singular: 'device', plural: 'devices' },
 * });
 * ```
 */
export function useCrud<T, TCreate = Partial<T>, TUpdate = Partial<T>>(config: {
  service: CrudService<T, TCreate, TUpdate>;
  labels?: CrudLabels;
  options?: UseCrudOptions<T>;
}): UseCrudReturn<T, TCreate, TUpdate> {
  const { service, labels = DEFAULT_LABELS, options = {} } = config;
  const {
    autoRefresh = false,
    refreshInterval = 30000,
    messageClearDelay = 5000,
    filter,
  } = options;

  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<Message | null>(null);

  const clearMessage = useCallback(() => setMessage(null), []);

  const refresh = useCallback(async () => {
    try {
      const data = await service.list();
      setItems(data || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to load ${labels.plural}`);
    } finally {
      setLoading(false);
    }
  }, [service, labels.plural]);

  const filteredItems = useMemo(() => {
    if (!filter) return items;
    return filter(items);
  }, [items, filter]);

  const create = useCallback(async (data: TCreate): Promise<boolean> => {
    try {
      await service.create(data);
      setMessage({ type: 'success', text: `${capitalize(labels.singular)} added successfully` });
      await refresh();
      return true;
    } catch (err) {
      setMessage({ type: 'error', text: `Failed to add ${labels.singular}: ${err}` });
      return false;
    }
  }, [service, labels.singular, refresh]);

  const update = useCallback(async (id: string, data: TUpdate): Promise<boolean> => {
    try {
      await service.update(id, data);
      setMessage({ type: 'success', text: `${capitalize(labels.singular)} updated successfully` });
      await refresh();
      return true;
    } catch (err) {
      setMessage({ type: 'error', text: `Failed to update ${labels.singular}: ${err}` });
      return false;
    }
  }, [service, labels.singular, refresh]);

  const remove = useCallback(async (id: string): Promise<boolean> => {
    try {
      await service.remove(id);
      setMessage({ type: 'success', text: `${capitalize(labels.singular)} deleted successfully` });
      await refresh();
      return true;
    } catch (err) {
      setMessage({ type: 'error', text: `Failed to delete ${labels.singular}: ${err}` });
      return false;
    }
  }, [service, labels.singular, refresh]);

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
    if (!message || messageClearDelay === 0) return;
    const timer = setTimeout(clearMessage, messageClearDelay);
    return () => clearTimeout(timer);
  }, [message, messageClearDelay, clearMessage]);

  return {
    items,
    filteredItems,
    loading,
    error,
    refresh,
    create,
    update,
    remove,
    message,
    clearMessage,
    setMessage,
  };
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
