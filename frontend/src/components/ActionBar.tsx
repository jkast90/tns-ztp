import type { ReactNode } from 'react';

export interface ActionBarProps {
  /** Action buttons and controls */
  children: ReactNode;
  /** Additional class name */
  className?: string;
}

/**
 * ActionBar - consistent actions bar layout for page headers.
 * Typically contains primary action buttons and filter controls.
 *
 * @example
 * <ActionBar>
 *   <Button onClick={handleAdd}><PlusIcon /> Add Item</Button>
 *   <Button variant="secondary" onClick={handleReset}>Reset</Button>
 *   <DropdownSelect ... />
 * </ActionBar>
 */
export function ActionBar({ children, className = '' }: ActionBarProps) {
  return (
    <div className={`actions-bar ${className}`.trim()}>
      {children}
    </div>
  );
}
