// Async modal hook - manages modal state with loading and result
// Eliminates the repeated pattern of device + loading + result state

import { useState, useCallback } from 'react';

export interface UseAsyncModalOptions<TData> {
  /** Called when modal opens (before async operation) */
  onOpen?: (item: TData) => void;
  /** Called when modal closes */
  onClose?: () => void;
}

export interface UseAsyncModalReturn<TData, TResult> {
  /** The item that triggered the modal (null when closed) */
  item: TData | null;
  /** Whether an async operation is in progress */
  loading: boolean;
  /** The result of the async operation */
  result: TResult | null;
  /** Error message if operation failed */
  error: string | null;
  /** Whether the modal is open */
  isOpen: boolean;
  /** Open the modal with an item */
  open: (item: TData) => void;
  /** Close the modal and reset state */
  close: () => void;
  /** Set loading state */
  setLoading: (loading: boolean) => void;
  /** Set result */
  setResult: (result: TResult | null) => void;
  /** Set error */
  setError: (error: string | null) => void;
  /** Reset result and error (useful for retrying) */
  reset: () => void;
  /** Execute an async operation with automatic loading/error handling */
  execute: <T extends TResult>(
    operation: () => Promise<T>
  ) => Promise<T | null>;
}

/**
 * Hook for managing modal state with async operations.
 * Replaces the common pattern of:
 *   const [device, setDevice] = useState(null);
 *   const [loading, setLoading] = useState(false);
 *   const [result, setResult] = useState(null);
 *
 * @example
 * ```tsx
 * const connectModal = useAsyncModal<Device, ConnectResult>();
 *
 * const handleConnect = async (device: Device) => {
 *   connectModal.open(device);
 *   await connectModal.execute(() => services.devices.testConnection(device.mac));
 * };
 *
 * // In render:
 * <Modal isOpen={connectModal.isOpen} onClose={connectModal.close}>
 *   {connectModal.loading && <LoadingState />}
 *   {connectModal.result && <ResultDisplay result={connectModal.result} />}
 *   {connectModal.error && <ErrorDisplay error={connectModal.error} />}
 * </Modal>
 * ```
 */
export function useAsyncModal<TData, TResult = unknown>(
  options: UseAsyncModalOptions<TData> = {}
): UseAsyncModalReturn<TData, TResult> {
  const { onOpen, onClose } = options;

  const [item, setItem] = useState<TData | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const open = useCallback(
    (newItem: TData) => {
      setItem(newItem);
      setLoading(false);
      setResult(null);
      setError(null);
      onOpen?.(newItem);
    },
    [onOpen]
  );

  const close = useCallback(() => {
    setItem(null);
    setLoading(false);
    setResult(null);
    setError(null);
    onClose?.();
  }, [onClose]);

  const reset = useCallback(() => {
    setResult(null);
    setError(null);
  }, []);

  const execute = useCallback(
    async <T extends TResult>(operation: () => Promise<T>): Promise<T | null> => {
      setLoading(true);
      setError(null);
      try {
        const data = await operation();
        setResult(data);
        return data;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'An error occurred';
        setError(message);
        return null;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return {
    item,
    loading,
    result,
    error,
    isOpen: item !== null,
    open,
    close,
    setLoading,
    setResult,
    setError,
    reset,
    execute,
  };
}

/**
 * Simplified version for modals that don't need async operations.
 * Just manages open/close state with an optional item.
 */
export function useSimpleModal<TData = void>() {
  const [item, setItem] = useState<TData | null>(null);

  const open = useCallback((newItem: TData) => {
    setItem(newItem);
  }, []);

  const close = useCallback(() => {
    setItem(null);
  }, []);

  return {
    item,
    isOpen: item !== null,
    open,
    close,
  };
}
