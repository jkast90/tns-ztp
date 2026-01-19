import { ReactNode } from 'react';
import { Button } from './Button';
import { Tooltip } from './Tooltip';
import { EditIcon, TrashIcon } from './Icon';

/**
 * Column definition for Table
 */
export interface TableColumn<T> {
  /** Column header label */
  header: string;
  /** Key to access data, or render function */
  accessor: keyof T | ((row: T, index: number) => ReactNode);
  /** Optional CSS class for the column */
  className?: string;
  /** Optional width (e.g., '100px', '20%') */
  width?: string;
  /** Align text (default: left) */
  align?: 'left' | 'center' | 'right';
  /** Hide on mobile */
  hideOnMobile?: boolean;
}

/**
 * Action button configuration
 */
export interface TableAction<T> {
  /** Icon to display */
  icon: ReactNode | ((row: T) => ReactNode);
  /** Button label (for accessibility) */
  label: string | ((row: T) => string);
  /** Click handler */
  onClick: (row: T) => void;
  /** Button variant */
  variant?: 'primary' | 'secondary' | 'danger';
  /** Whether the action is disabled */
  disabled?: (row: T) => boolean;
  /** Whether the action is loading */
  loading?: (row: T) => boolean;
  /** Tooltip content */
  tooltip?: string | ((row: T) => string);
  /** Whether to show this action */
  show?: (row: T) => boolean;
}

export interface TableProps<T> {
  /** Data to display */
  data: T[];
  /** Column definitions */
  columns: TableColumn<T>[];
  /** Unique key for each row */
  getRowKey: (row: T) => string | number;
  /** Row actions (rendered in Actions column) */
  actions?: TableAction<T>[];
  /** Custom actions renderer (alternative to actions array) */
  renderActions?: (row: T) => ReactNode;
  /** Callback when edit action is clicked (shorthand for common pattern) */
  onEdit?: (row: T) => void;
  /** Callback when delete action is clicked (shorthand for common pattern) */
  onDelete?: (row: T) => void;
  /** Confirm message for delete */
  deleteConfirmMessage?: (row: T) => string;
  /** Function to determine if delete is disabled for a row */
  deleteDisabled?: (row: T) => boolean;
  /** Function to determine row CSS class */
  rowClassName?: (row: T) => string | undefined;
  /** Empty state message */
  emptyMessage?: string;
  /** Empty state description */
  emptyDescription?: string;
  /** Actions column header label */
  actionsHeader?: string;
  /** Whether to use compact styling */
  compact?: boolean;
  /** Whether table is striped */
  striped?: boolean;
  /** Whether rows are hoverable */
  hoverable?: boolean;
  /** Callback when row is clicked */
  onRowClick?: (row: T) => void;
}

/**
 * Flexible Table component for displaying data with actions.
 *
 * Features:
 * - Flexible column definitions with accessor functions
 * - Built-in edit/delete shortcuts
 * - Custom actions with loading states
 * - Tooltips on action buttons
 * - Empty state handling
 * - Row click handling
 *
 * @example
 * // Simple usage with edit/delete
 * <Table
 *   data={items}
 *   columns={[
 *     { header: 'Name', accessor: 'name' },
 *     { header: 'Count', accessor: (row) => <Badge>{row.count}</Badge> },
 *   ]}
 *   getRowKey={(item) => item.id}
 *   onEdit={handleEdit}
 *   onDelete={handleDelete}
 *   deleteConfirmMessage={(item) => `Delete "${item.name}"?`}
 * />
 *
 * @example
 * // Custom actions with loading states
 * <Table
 *   data={devices}
 *   columns={columns}
 *   getRowKey={(d) => d.mac}
 *   actions={[
 *     {
 *       icon: (d) => loadingId === d.mac ? <Spinner /> : <ConnectIcon />,
 *       label: 'Connect',
 *       onClick: handleConnect,
 *       loading: (d) => loadingId === d.mac,
 *       tooltip: 'Test connection',
 *     },
 *   ]}
 * />
 */
export function Table<T>({
  data,
  columns,
  getRowKey,
  actions = [],
  renderActions,
  onEdit,
  onDelete,
  deleteConfirmMessage,
  deleteDisabled,
  rowClassName,
  emptyMessage = 'No data available',
  emptyDescription,
  actionsHeader = 'Actions',
  compact = false,
  striped = false,
  hoverable = true,
  onRowClick,
}: TableProps<T>) {
  // Build actions array from shortcuts + custom actions
  const allActions: TableAction<T>[] = [];

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

  const hasActions = allActions.length > 0 || renderActions;

  if (data.length === 0) {
    return (
      <div className="table-empty">
        <p className="table-empty-message">{emptyMessage}</p>
        {emptyDescription && (
          <p className="table-empty-description">{emptyDescription}</p>
        )}
      </div>
    );
  }

  const tableClassName = [
    'data-table',
    compact && 'data-table-compact',
    striped && 'data-table-striped',
    hoverable && 'data-table-hoverable',
    onRowClick && 'data-table-clickable',
  ].filter(Boolean).join(' ');

  return (
    <table className={tableClassName}>
      <thead>
        <tr>
          {columns.map((col, idx) => (
            <th
              key={idx}
              style={{
                width: col.width,
                textAlign: col.align,
              }}
              className={[col.className, col.hideOnMobile && 'hide-mobile'].filter(Boolean).join(' ')}
            >
              {col.header}
            </th>
          ))}
          {hasActions && <th style={{ textAlign: 'right' }}>{actionsHeader}</th>}
        </tr>
      </thead>
      <tbody>
        {data.map((row, rowIndex) => {
          const key = getRowKey(row);
          const className = rowClassName?.(row);

          return (
            <tr
              key={key}
              className={className}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
            >
              {columns.map((col, idx) => {
                const content = typeof col.accessor === 'function'
                  ? col.accessor(row, rowIndex)
                  : (row[col.accessor as keyof T] as ReactNode);

                return (
                  <td
                    key={idx}
                    style={{ textAlign: col.align }}
                    className={[col.className, col.hideOnMobile && 'hide-mobile'].filter(Boolean).join(' ')}
                  >
                    {content}
                  </td>
                );
              })}
              {hasActions && (
                <td>
                  <div className="table-actions">
                    {renderActions ? renderActions(row) : (
                      allActions.map((action, idx) => {
                        // Check if action should be shown
                        if (action.show && !action.show(row)) {
                          return null;
                        }

                        const isDisabled = action.disabled?.(row) ?? false;
                        const isLoading = action.loading?.(row) ?? false;
                        const icon = typeof action.icon === 'function' ? action.icon(row) : action.icon;
                        const tooltip = typeof action.tooltip === 'function' ? action.tooltip(row) : action.tooltip;
                        const label = typeof action.label === 'function' ? action.label(row) : action.label;

                        const button = (
                          <Button
                            key={idx}
                            variant={action.variant ?? 'secondary'}
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              action.onClick(row);
                            }}
                            disabled={isDisabled || isLoading}
                            title={!tooltip ? label : undefined}
                          >
                            {icon}
                          </Button>
                        );

                        return tooltip ? (
                          <Tooltip key={idx} content={tooltip}>
                            {button}
                          </Tooltip>
                        ) : button;
                      })
                    )}
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
 * Simple static table for reference data (no actions).
 */
export interface SimpleTableProps {
  headers: string[];
  rows: ReactNode[][];
  className?: string;
}

export function SimpleTable({ headers, rows, className }: SimpleTableProps) {
  return (
    <table className={className}>
      <thead>
        <tr>
          {headers.map((header, idx) => (
            <th key={idx}>{header}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, rowIdx) => (
          <tr key={rowIdx}>
            {row.map((cell, cellIdx) => (
              <td key={cellIdx}>{cell}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/**
 * Common cell renderers for reuse
 */
export const Cell = {
  /** Render a value in a code block */
  code: (value: ReactNode) => <code>{value ?? '—'}</code>,

  /** Render a status badge */
  status: (status: string, variant?: 'online' | 'offline' | 'warning' | 'provisioning') => (
    <span className={`status ${variant || status}`}>
      {status}
    </span>
  ),

  /** Render an enabled/disabled toggle appearance */
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

  /** Render a dash for empty/null values */
  dash: (value: ReactNode) => value || '—',

  /** Render a truncated text with tooltip */
  truncate: (text: string, maxLength = 30) => {
    if (text.length <= maxLength) return text;
    return (
      <Tooltip content={text}>
        <span>{text.substring(0, maxLength)}...</span>
      </Tooltip>
    );
  },
};
