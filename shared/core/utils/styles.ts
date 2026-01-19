// Style utilities for common visual patterns
import type { ThemeColors } from '../theme';
import type { DeviceStatus } from '../types';

/**
 * Status colors mapping - maps device status to theme colors
 */
export function getStatusColor(status: DeviceStatus, colors: ThemeColors): string {
  switch (status) {
    case 'online':
      return colors.success;
    case 'offline':
      return colors.error;
    case 'provisioning':
      return colors.warning;
    case 'unknown':
    default:
      return colors.textMuted;
  }
}

/**
 * Get all status colors as a record
 */
export function getStatusColors(colors: ThemeColors): Record<DeviceStatus, string> {
  return {
    online: colors.success,
    offline: colors.error,
    provisioning: colors.warning,
    unknown: colors.textMuted,
  };
}

/**
 * Variable type icon mapping for template variables
 */
export type VariableTypeIcon = 'lan' | 'memory' | 'dns' | 'router' | 'code';

export function getVariableTypeIcon(type: string): VariableTypeIcon {
  switch (type) {
    case 'ip':
    case 'gateway':
    case 'server':
      return 'lan';
    case 'mac':
      return 'memory';
    case 'hostname':
      return 'dns';
    case 'subnet':
      return 'router';
    default:
      return 'code';
  }
}

/**
 * Variable type color mapping for template variables
 */
export function getVariableTypeColor(type: string, colors: ThemeColors): string {
  switch (type) {
    case 'ip':
      return colors.accentBlue;
    case 'gateway':
      return colors.success;
    case 'server':
      return '#f59e0b'; // amber
    case 'mac':
      return colors.accentCyan;
    case 'hostname':
      return colors.accentPurple;
    case 'subnet':
      return colors.textMuted;
    default:
      return colors.textSecondary;
  }
}

/**
 * Get status icon name for device status
 */
export type StatusIcon = 'check-circle' | 'cancel' | 'sync' | 'help';

export function getStatusIcon(status: DeviceStatus): StatusIcon {
  switch (status) {
    case 'online':
      return 'check-circle';
    case 'offline':
      return 'cancel';
    case 'provisioning':
      return 'sync';
    case 'unknown':
    default:
      return 'help';
  }
}

/**
 * Get status label for device status
 */
export function getStatusLabel(status: DeviceStatus): string {
  switch (status) {
    case 'online':
      return 'Online';
    case 'offline':
      return 'Offline';
    case 'provisioning':
      return 'Prov.';
    case 'unknown':
    default:
      return 'Unknown';
  }
}
