// Formatting utilities - platform agnostic

export function formatDate(date?: string | Date | null): string {
  if (!date) return '-';
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleString();
}

export function formatRelativeTime(date?: string | Date | null): string {
  if (!date) return '-';
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return formatDate(d);
}

export function formatMacAddress(mac: string): string {
  return mac.toLowerCase();
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

/**
 * Format a future expiry time as a human-readable duration
 * @param expiresAt - ISO date string of the expiry time
 * @returns Duration string (e.g., "2h 15m", "45m", "Expired")
 */
export function formatExpiry(expiresAt: string): string {
  const expiry = new Date(expiresAt);
  const now = new Date();
  const diffMs = expiry.getTime() - now.getTime();

  if (diffMs < 0) {
    return 'Expired';
  }

  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

  if (diffHours > 0) {
    return `${diffHours}h ${diffMins}m`;
  }
  return `${diffMins}m`;
}

/**
 * Discovery event types
 */
export type DiscoveryEventType = 'discovered' | 'added' | 'lease_renewed' | string;

/**
 * Format a discovery event type as a human-readable label
 * @param eventType - The event type string
 * @returns Human-readable label
 */
export function formatEventType(eventType: DiscoveryEventType): string {
  switch (eventType) {
    case 'discovered':
      return 'New Device';
    case 'added':
      return 'Device Added';
    case 'lease_renewed':
      return 'Lease Renewed';
    default:
      return eventType;
  }
}

/**
 * Get the icon name for a discovery event type
 * @param eventType - The event type string
 * @returns Material icon name
 */
export function getEventTypeIcon(eventType: DiscoveryEventType): string {
  switch (eventType) {
    case 'discovered':
      return 'fiber_new';
    case 'added':
      return 'add_circle';
    case 'lease_renewed':
      return 'refresh';
    default:
      return 'schedule';
  }
}
