import { ReactNode } from 'react';
import { Button } from './Button';
import { EditIcon, TrashIcon } from './Icon';

/**
 * Column definition for DataTable
 */
export interface Column<T> {
  /** Column header label */
  header: string;
  /** Key to access data, or render function */
  accessor: keyof T | ((row: T) => ReactNode);
  /** Optional CSS class for the column */
  className?: string;
  /** Optional width (e.g., '100px', '20%') */
  width?: string;
}

/**
 * Action button configuration
 */
export interface RowAction<T> {
  /** Icon to display */
  icon: ReactNode;
  /** Button label (for accessibility) */
  label: string;
  /** Click handler */
  onClick: (row: T) => void;
  /** Button variant */
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  /** Whether the action is disabled */
  disabled?: (row: T) => boolean;
  /** Tooltip content */
  tooltip?: string;
}

export interface DataTableProps<T> {
  /** Data to display */
  data: T[];
  /** Column definitions */
  columns: Column<T>[];
  /** Unique key for each row */
  getRowKey: (row: T) => string | number;
  /** Row actions (edit, delete, etc.) */
  actions?: RowAction<T>[];
  /** Callback when edit action is clicked (shorthand for common pattern) */
  onEdit?: (row: T) => void;
  /** Callback when delete action is clicked (shorthand for common pattern) */
  onDelete?: (row: T) => void;
  /** Confirm message for delete. If not provided, no confirmation. */
  deleteConfirmMessage?: (row: T) => string;
  /** Function to determine if delete is disabled for a row */
  deleteDisabled?: (row: T) => boolean;
  /** CSS class for disabled rows */
  rowClassName?: (row: T) => string;
  /** Empty state message */
  emptyMessage?: string;
}

/**
 * Reusable data table component with common patterns for CRUD operations.
 *
 * @example
 * <DataTable
 *   data={vendors}
 *   columns={[
 *     { header: 'Name', accessor: 'name' },
 *     { header: 'Port', accessor: 'ssh_port' },
 *     { header: 'Devices', accessor: (v) => <StatusBadge count={v.device_count} /> },
 *   ]}
 *   getRowKey={(v) => v.id}
 *   onEdit={handleEdit}
 *   onDelete={handleDelete}
 *   deleteConfirmMessage={(v) => `Delete vendor "${v.name}"?`}
 * />
 */
export function DataTable<T>({
  data,
  columns,
  getRowKey,
  actions = [],
  onEdit,
  onDelete,
  deleteConfirmMessage,
  deleteDisabled,
  rowClassName,
  emptyMessage = 'No data available',
}: DataTableProps<T>) {
  // Build actions array from shortcuts + custom actions
  const allActions: RowAction<T>[] = [];

  if (onEdit) {
    allActions.push({
      icon: <EditIcon size={14} />,
      label: 'Edit',
      onClick: onEdit,
      variant: 'secondary',
      tooltip: 'Edit',
    });
  }

  allActions.push(...actions);

  if (onDelete) {
    allActions.push({
      icon: <TrashIcon size={14} />,
      label: 'Delete',
      onClick: (row) => {
        if (deleteConfirmMessage) {
          if (confirm(deleteConfirmMessage(row))) {
            onDelete(row);
          }
        } else {
          onDelete(row);
        }
      },
      variant: 'danger',
      tooltip: 'Delete',
      disabled: deleteDisabled,
    });
  }

  const hasActions = allActions.length > 0;

  if (data.length === 0) {
    return (
      <div className="empty-state">
        <p>{emptyMessage}</p>
      </div>
    );
  }

  return (
    <table>
      <thead>
        <tr>
          {columns.map((col, idx) => (
            <th key={idx} style={col.width ? { width: col.width } : undefined}>
              {col.header}
            </th>
          ))}
          {hasActions && <th>Actions</th>}
        </tr>
      </thead>
      <tbody>
        {data.map((row) => {
          const key = getRowKey(row);
          const className = rowClassName?.(row);

          return (
            <tr key={key} className={className}>
              {columns.map((col, idx) => {
                const content = typeof col.accessor === 'function'
                  ? col.accessor(row)
                  : row[col.accessor as keyof T] as ReactNode;

                return (
                  <td key={idx} className={col.className}>
                    {content}
                  </td>
                );
              })}
              {hasActions && (
                <td>
                  <div className="actions">
                    {allActions.map((action, idx) => {
                      const isDisabled = action.disabled?.(row) ?? false;
                      return (
                        <Button
                          key={idx}
                          variant={action.variant || 'secondary'}
                          size="sm"
                          onClick={() => action.onClick(row)}
                          disabled={isDisabled}
                          title={action.tooltip || action.label}
                        >
                          {action.icon}
                        </Button>
                      );
                    })}
                  </div>
                </td>
              )}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

/**
 * Common cell renderers for reuse
 */
export const CellRenderers = {
  /** Render a value in a code block */
  code: <T,>(accessor: keyof T) => (row: T) => (
    <code>{String(row[accessor] || '(empty)')}</code>
  ),

  /** Render a status badge */
  status: (isOnline: boolean, label?: string) => (
    <span className={`status ${isOnline ? 'online' : 'offline'}`}>
      {label ?? (isOnline ? 'Online' : 'Offline')}
    </span>
  ),

  /** Render an enabled/disabled status */
  enabled: (enabled: boolean) => (
    <span className={`status ${enabled ? 'online' : 'offline'}`}>
      {enabled ? 'Enabled' : 'Disabled'}
    </span>
  ),

  /** Render a count with status styling */
  count: (count: number, zeroLabel = '0') => (
    <span className={`status ${count > 0 ? 'online' : 'offline'}`}>
      {count > 0 ? count : zeroLabel}
    </span>
  ),

  /** Render a dash for empty values */
  emptyDash: <T,>(accessor: keyof T) => (row: T) => (
    row[accessor] ? String(row[accessor]) : '—'
  ),
};
