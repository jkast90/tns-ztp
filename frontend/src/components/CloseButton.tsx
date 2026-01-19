import { ButtonHTMLAttributes } from 'react';

type CloseButtonSize = 'sm' | 'md' | 'lg';
type CloseButtonVariant = 'default' | 'subtle' | 'light';

interface CloseButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  size?: CloseButtonSize;
  variant?: CloseButtonVariant;
  label?: string;
}

const sizeMap: Record<CloseButtonSize, { icon: number; padding: string }> = {
  sm: { icon: 16, padding: '4px' },
  md: { icon: 20, padding: '6px' },
  lg: { icon: 24, padding: '8px' },
};

export function CloseButton({
  size = 'md',
  variant = 'default',
  label = 'Close',
  className = '',
  style,
  ...props
}: CloseButtonProps) {
  const { icon: iconSize, padding } = sizeMap[size];

  const baseStyles: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding,
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    transition: 'background-color 0.15s, opacity 0.15s',
    lineHeight: 1,
  };

  const variantStyles: Record<CloseButtonVariant, React.CSSProperties> = {
    default: {
      background: 'transparent',
      color: 'var(--color-text-secondary)',
    },
    subtle: {
      background: 'transparent',
      color: 'var(--color-text-muted)',
      opacity: 0.7,
    },
    light: {
      background: 'var(--color-bg-tertiary)',
      color: 'var(--color-text-secondary)',
    },
  };

  return (
    <button
      type="button"
      className={`close-button close-button-${variant} ${className}`}
      aria-label={label}
      style={{ ...baseStyles, ...variantStyles[variant], ...style }}
      {...props}
    >
      <span className="material-icons-outlined" style={{ fontSize: iconSize }}>
        close
      </span>
    </button>
  );
}
