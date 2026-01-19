import type { ReactNode } from 'react';

interface ActionButtonsProps {
  children: ReactNode;
  columns?: number;
}

/**
 * A grid layout for action buttons, displaying them in rows.
 * Default is 3 columns (for 6 buttons = 2 rows of 3).
 */
export function ActionButtons({ children, columns = 3 }: ActionButtonsProps) {
  return (
    <div className="action-buttons" style={{ gridTemplateColumns: `repeat(${columns}, auto)` }}>
      {children}
    </div>
  );
}
