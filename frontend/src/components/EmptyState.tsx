import type { ReactNode } from 'react';
import { Icon } from './Icon';

interface EmptyStateProps {
  /** Icon name from Material Symbols */
  icon?: string;
  /** Custom icon element (overrides icon prop) */
  iconElement?: ReactNode;
  /** Main message */
  message: string;
  /** Optional description below the message */
  description?: string;
  /** Optional action button or content */
  action?: ReactNode;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
}

const ICON_SIZES = {
  sm: 32,
  md: 48,
  lg: 64,
};

/**
 * Reusable empty state component for displaying when no data is available.
 *
 * @example
 * <EmptyState
 *   icon="search"
 *   message="No devices found"
 *   description="Try adjusting your search criteria"
 * />
 *
 * @example
 * <EmptyState
 *   icon="add_circle"
 *   message="No templates yet"
 *   description="Create your first template to get started"
 *   action={<Button onClick={handleAdd}>Add Template</Button>}
 * />
 */
export function EmptyState({
  icon,
  iconElement,
  message,
  description,
  action,
  size = 'md',
}: EmptyStateProps) {
  const iconSize = ICON_SIZES[size];

  return (
    <div className={`empty-state empty-state-${size}`}>
      {iconElement || (icon && <Icon name={icon} size={iconSize} />)}
      <p className="empty-state-message">{message}</p>
      {description && <p className="empty-state-description">{description}</p>}
      {action && <div className="empty-state-action">{action}</div>}
    </div>
  );
}
