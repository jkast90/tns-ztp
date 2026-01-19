// Notification hook - platform agnostic
// Provides a unified interface for alerts, confirmations, and messages
// Implementations are platform-specific (Alert.alert on mobile, toast/modal on web)

import { useCallback, useRef } from 'react';

export type NotificationType = 'success' | 'error' | 'warning' | 'info';

export interface NotificationMessage {
  type: NotificationType;
  title?: string;
  text: string;
}

export interface ConfirmOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  destructive?: boolean;
}

export interface NotificationHandler {
  /** Show a message/alert */
  showMessage: (message: NotificationMessage) => void;
  /** Show a confirmation dialog and return the user's choice */
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

export interface UseNotificationOptions {
  /** Platform-specific handler for showing messages */
  showMessage: (message: NotificationMessage) => void;
  /** Platform-specific handler for confirmations */
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

export interface UseNotificationReturn {
  /** Show a success message */
  success: (text: string, title?: string) => void;
  /** Show an error message */
  error: (text: string, title?: string) => void;
  /** Show a warning message */
  warning: (text: string, title?: string) => void;
  /** Show an info message */
  info: (text: string, title?: string) => void;
  /** Show a message with custom type */
  show: (message: NotificationMessage) => void;
  /** Show a confirmation dialog */
  confirm: (options: ConfirmOptions) => Promise<boolean>;
  /** Confirm deletion with standard text */
  confirmDelete: (itemName: string, itemType?: string) => Promise<boolean>;
  /** Confirm reset/destructive action */
  confirmReset: (message: string) => Promise<boolean>;
}

/**
 * Platform-agnostic notification hook.
 *
 * Usage:
 * ```tsx
 * // Create a platform-specific provider
 * const notification = useNotification({
 *   showMessage: (msg) => Alert.alert(msg.title || 'Notice', msg.text),
 *   confirm: (opts) => new Promise((resolve) => {
 *     Alert.alert(opts.title, opts.message, [
 *       { text: opts.cancelText || 'Cancel', onPress: () => resolve(false) },
 *       { text: opts.confirmText || 'OK', onPress: () => resolve(true) },
 *     ]);
 *   }),
 * });
 *
 * // Then use it
 * notification.success('Saved successfully');
 * const shouldDelete = await notification.confirmDelete('My Device');
 * ```
 */
export function useNotification(handler: UseNotificationOptions): UseNotificationReturn {
  // Use ref to avoid dependency issues in callbacks
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  const show = useCallback((message: NotificationMessage) => {
    handlerRef.current.showMessage(message);
  }, []);

  const success = useCallback((text: string, title?: string) => {
    show({ type: 'success', title: title || 'Success', text });
  }, [show]);

  const error = useCallback((text: string, title?: string) => {
    show({ type: 'error', title: title || 'Error', text });
  }, [show]);

  const warning = useCallback((text: string, title?: string) => {
    show({ type: 'warning', title: title || 'Warning', text });
  }, [show]);

  const info = useCallback((text: string, title?: string) => {
    show({ type: 'info', title: title || 'Info', text });
  }, [show]);

  const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return handlerRef.current.confirm(options);
  }, []);

  const confirmDelete = useCallback((itemName: string, itemType = 'item'): Promise<boolean> => {
    return confirm({
      title: `Delete ${itemType}`,
      message: `Are you sure you want to delete "${itemName}"?`,
      confirmText: 'Delete',
      cancelText: 'Cancel',
      destructive: true,
    });
  }, [confirm]);

  const confirmReset = useCallback((message: string): Promise<boolean> => {
    return confirm({
      title: 'Confirm Reset',
      message,
      confirmText: 'Reset',
      cancelText: 'Cancel',
      destructive: true,
    });
  }, [confirm]);

  return {
    success,
    error,
    warning,
    info,
    show,
    confirm,
    confirmDelete,
    confirmReset,
  };
}

/**
 * Create notification handlers for React Native (Alert.alert)
 */
export function createMobileNotificationHandler(): UseNotificationOptions {
  // This returns the config - actual Alert usage happens in the mobile app
  // since we can't import react-native here
  return {
    showMessage: () => {
      throw new Error('Mobile notification handler must be implemented in mobile app');
    },
    confirm: () => {
      throw new Error('Mobile notification handler must be implemented in mobile app');
    },
  };
}

/**
 * Create notification handlers for Web (would use toast library)
 */
export function createWebNotificationHandler(): UseNotificationOptions {
  // Web implementation would use a toast library or window.confirm
  return {
    showMessage: (message) => {
      // Simple fallback - real implementation would use toast
      if (typeof window !== 'undefined') {
        window.alert(`${message.title || message.type}: ${message.text}`);
      }
    },
    confirm: (options) => {
      if (typeof window !== 'undefined') {
        return Promise.resolve(window.confirm(`${options.title}\n\n${options.message}`));
      }
      return Promise.resolve(false);
    },
  };
}
