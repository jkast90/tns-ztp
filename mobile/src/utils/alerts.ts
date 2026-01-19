// Alert utilities for React Native
// Provides consistent confirmation dialogs across the app

import { Alert } from 'react-native';

export interface ConfirmDeleteOptions {
  /** Name of the item being deleted (shown in message) */
  itemName: string;
  /** Type of item (e.g., "device", "template") for the title */
  itemType?: string;
  /** Custom title (defaults to "Delete {itemType}") */
  title?: string;
  /** Custom message (defaults to "Are you sure you want to delete {itemName}?") */
  message?: string;
  /** Callback when user confirms deletion */
  onConfirm: () => void | Promise<void>;
  /** Callback when user cancels (optional) */
  onCancel?: () => void;
}

/**
 * Show a confirmation dialog for deleting an item.
 *
 * @example
 * confirmDelete({
 *   itemName: device.hostname,
 *   itemType: 'device',
 *   onConfirm: () => deleteDevice(device.mac),
 * });
 */
export function confirmDelete({
  itemName,
  itemType = 'item',
  title,
  message,
  onConfirm,
  onCancel,
}: ConfirmDeleteOptions): void {
  Alert.alert(
    title || `Delete ${itemType.charAt(0).toUpperCase() + itemType.slice(1)}`,
    message || `Are you sure you want to delete "${itemName}"?`,
    [
      {
        text: 'Cancel',
        style: 'cancel',
        onPress: onCancel,
      },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: onConfirm,
      },
    ]
  );
}

export interface ConfirmResetOptions {
  /** Custom title (defaults to "Reset") */
  title?: string;
  /** Message explaining what will be reset */
  message: string;
  /** Callback when user confirms reset */
  onConfirm: () => void | Promise<void>;
  /** Callback when user cancels (optional) */
  onCancel?: () => void;
  /** Custom confirm button text (defaults to "Reset") */
  confirmText?: string;
}

/**
 * Show a confirmation dialog for resetting/clearing data.
 *
 * @example
 * confirmReset({
 *   message: 'Reset all vendors to defaults? This will remove any custom vendors.',
 *   onConfirm: handleReset,
 * });
 */
export function confirmReset({
  title = 'Confirm Reset',
  message,
  onConfirm,
  onCancel,
  confirmText = 'Reset',
}: ConfirmResetOptions): void {
  Alert.alert(title, message, [
    {
      text: 'Cancel',
      style: 'cancel',
      onPress: onCancel,
    },
    {
      text: confirmText,
      style: 'destructive',
      onPress: onConfirm,
    },
  ]);
}

export interface ConfirmActionOptions {
  /** Dialog title */
  title: string;
  /** Dialog message */
  message: string;
  /** Confirm button text */
  confirmText: string;
  /** Whether the action is destructive (changes button style) */
  destructive?: boolean;
  /** Callback when user confirms */
  onConfirm: () => void | Promise<void>;
  /** Callback when user cancels (optional) */
  onCancel?: () => void;
  /** Cancel button text (defaults to "Cancel") */
  cancelText?: string;
}

/**
 * Show a generic confirmation dialog.
 *
 * @example
 * confirmAction({
 *   title: 'Remove Container',
 *   message: `Remove "${container.hostname}"?`,
 *   confirmText: 'Remove',
 *   destructive: true,
 *   onConfirm: () => remove(container.id),
 * });
 */
export function confirmAction({
  title,
  message,
  confirmText,
  destructive = false,
  onConfirm,
  onCancel,
  cancelText = 'Cancel',
}: ConfirmActionOptions): void {
  Alert.alert(title, message, [
    {
      text: cancelText,
      style: 'cancel',
      onPress: onCancel,
    },
    {
      text: confirmText,
      style: destructive ? 'destructive' : 'default',
      onPress: onConfirm,
    },
  ]);
}

/**
 * Show an error alert.
 *
 * @example
 * showError('Vendor name is required');
 * showError('Failed to save', 'Please try again');
 */
export function showError(message: string, title = 'Error'): void {
  Alert.alert(title, message);
}

/**
 * Show a success alert.
 *
 * @example
 * showSuccess('Device saved successfully');
 */
export function showSuccess(message: string, title = 'Success'): void {
  Alert.alert(title, message);
}

/**
 * Show an info alert.
 *
 * @example
 * showInfo('This vendor has devices assigned to it.', 'Cannot Delete');
 */
export function showInfo(message: string, title = 'Info'): void {
  Alert.alert(title, message);
}
