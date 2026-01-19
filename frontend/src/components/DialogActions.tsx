import { ReactNode } from 'react';

type DialogActionsAlign = 'left' | 'center' | 'right' | 'space-between';

interface DialogActionsProps {
  children: ReactNode;
  align?: DialogActionsAlign;
  className?: string;
  style?: React.CSSProperties;
}

const alignMap: Record<DialogActionsAlign, string> = {
  left: 'flex-start',
  center: 'center',
  right: 'flex-end',
  'space-between': 'space-between',
};

export function DialogActions({
  children,
  align = 'right',
  className = '',
  style,
}: DialogActionsProps) {
  const baseStyles: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: alignMap[align],
    gap: '12px',
    marginTop: '24px',
    paddingTop: '16px',
    borderTop: '1px solid var(--color-border)',
  };

  return (
    <div
      className={`dialog-actions ${className}`}
      style={{ ...baseStyles, ...style }}
    >
      {children}
    </div>
  );
}
