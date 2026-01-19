import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { CloseButton } from './CloseButton';

// Toast types
export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration?: number; // ms, 0 = no auto-dismiss
  action?: ToastAction;
}

interface ToastContextValue {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => string;
  removeToast: (id: string) => void;
  clearToasts: () => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

// Generate unique ID
let toastIdCounter = 0;
const generateId = () => `toast-${++toastIdCounter}-${Date.now()}`;

// Default durations by type (ms)
const DEFAULT_DURATIONS: Record<ToastType, number> = {
  success: 4000,
  error: 0, // Errors don't auto-dismiss
  warning: 6000,
  info: 5000,
};

// Icons for each toast type
const TOAST_ICONS: Record<ToastType, string> = {
  success: 'check_circle',
  error: 'error',
  warning: 'warning',
  info: 'info',
};

// Maximum visible toasts
const MAX_VISIBLE_TOASTS = 3;

interface ToastProviderProps {
  children: ReactNode;
}

export function ToastProvider({ children }: ToastProviderProps) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = generateId();
    const duration = toast.duration ?? DEFAULT_DURATIONS[toast.type];

    setToasts(prev => [...prev, { ...toast, id, duration }]);
    return id;
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const clearToasts = useCallback(() => {
    setToasts([]);
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast, clearToasts }}>
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

// Options for toast convenience methods
interface ToastOptions {
  duration?: number;
  action?: ToastAction;
}

// Convenience hook for common toast operations
export function useToastActions() {
  const { addToast, removeToast, clearToasts } = useToast();

  return {
    success: (message: string, options?: ToastOptions) =>
      addToast({ type: 'success', message, ...options }),
    error: (message: string, options?: ToastOptions) =>
      addToast({ type: 'error', message, ...options }),
    warning: (message: string, options?: ToastOptions) =>
      addToast({ type: 'warning', message, ...options }),
    info: (message: string, options?: ToastOptions) =>
      addToast({ type: 'info', message, ...options }),
    remove: removeToast,
    clear: clearToasts,
  };
}

// Toast Container Component
interface ToastContainerProps {
  toasts: Toast[];
  onRemove: (id: string) => void;
}

function ToastContainer({ toasts, onRemove }: ToastContainerProps) {
  const visibleToasts = toasts.slice(-MAX_VISIBLE_TOASTS);
  const hiddenCount = Math.max(0, toasts.length - MAX_VISIBLE_TOASTS);
  // Calculate height: each toast ~52px + 8px gap + 12px padding top/bottom
  const toastHeight = visibleToasts.length > 0
    ? 12 + (visibleToasts.length * 52) + ((visibleToasts.length - 1) * 8) + (hiddenCount > 0 ? 28 : 0) + 12
    : 0;

  // Update CSS custom property for header offset
  useEffect(() => {
    document.documentElement.style.setProperty('--toast-offset', `${toastHeight}px`);
    return () => {
      document.documentElement.style.setProperty('--toast-offset', '0px');
    };
  }, [toastHeight]);

  return (
    <div
      className="toast-container"
      style={{
        position: 'fixed',
        top: 0,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        width: '100%',
        maxWidth: '500px',
        padding: '12px',
        gap: '8px',
        pointerEvents: 'none',
      }}
    >
      {/* Hidden count indicator */}
      {hiddenCount > 0 && (
        <div
          style={{
            fontSize: '0.75rem',
            color: 'var(--color-text-muted)',
            padding: '4px 12px',
            background: 'var(--color-bg-secondary)',
            borderRadius: '12px',
            border: '1px solid var(--color-border)',
            pointerEvents: 'auto',
          }}
        >
          +{hiddenCount} more notification{hiddenCount > 1 ? 's' : ''}
        </div>
      )}

      {visibleToasts.map((toast, index) => (
        <ToastItem
          key={toast.id}
          toast={toast}
          onRemove={onRemove}
          index={index}
          isNewest={index === visibleToasts.length - 1}
        />
      ))}
    </div>
  );
}

// Individual Toast Item
interface ToastItemProps {
  toast: Toast;
  onRemove: (id: string) => void;
  index: number;
  isNewest: boolean;
}

function ToastItem({ toast, onRemove, index, isNewest }: ToastItemProps) {
  const [isExiting, setIsExiting] = useState(false);

  // Auto-dismiss timer
  useEffect(() => {
    if (toast.duration && toast.duration > 0) {
      const timer = setTimeout(() => {
        setIsExiting(true);
        setTimeout(() => onRemove(toast.id), 300);
      }, toast.duration);

      return () => clearTimeout(timer);
    }
  }, [toast.id, toast.duration, onRemove]);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(() => onRemove(toast.id), 300);
  };

  const typeStyles: Record<ToastType, React.CSSProperties> = {
    success: {
      background: 'var(--color-success-bg)',
      borderColor: 'var(--color-success)',
      color: 'var(--color-success)',
    },
    error: {
      background: 'var(--color-error-bg)',
      borderColor: 'var(--color-error)',
      color: 'var(--color-error)',
    },
    warning: {
      background: 'var(--color-warning-bg)',
      borderColor: 'var(--color-warning)',
      color: 'var(--color-warning)',
    },
    info: {
      background: 'var(--color-bg-secondary)',
      borderColor: 'var(--color-accent-blue)',
      color: 'var(--color-accent-blue)',
    },
  };

  return (
    <div
      className={`toast toast-${toast.type}`}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '12px 16px',
        borderRadius: '8px',
        border: '1px solid',
        boxShadow: 'var(--shadow-lg)',
        width: '100%',
        pointerEvents: 'auto',
        opacity: isExiting ? 0 : 1,
        transform: isExiting ? 'translateY(-20px) scale(0.95)' : 'translateY(0) scale(1)',
        transition: 'opacity 0.3s ease, transform 0.3s ease',
        ...typeStyles[toast.type],
      }}
    >
      <span
        className="material-icons-outlined"
        style={{ fontSize: 20, flexShrink: 0 }}
      >
        {TOAST_ICONS[toast.type]}
      </span>

      <span
        style={{
          flex: 1,
          fontSize: '0.875rem',
          color: 'var(--color-text-primary)',
          lineHeight: 1.4,
        }}
      >
        {toast.message}
      </span>

      {toast.action && (
        <button
          type="button"
          onClick={() => {
            toast.action?.onClick();
            handleClose();
          }}
          style={{
            background: 'none',
            border: 'none',
            padding: '4px 8px',
            fontSize: '0.8rem',
            fontWeight: 500,
            color: typeStyles[toast.type].color,
            cursor: 'pointer',
            borderRadius: '4px',
            transition: 'background 0.2s ease',
            whiteSpace: 'nowrap',
          }}
          onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
          onMouseOut={(e) => e.currentTarget.style.background = 'none'}
        >
          {toast.action.label}
        </button>
      )}

      <CloseButton
        size="sm"
        variant="subtle"
        onClick={handleClose}
        label="Dismiss notification"
      />
    </div>
  );
}

// Export for use in header offset calculation
export { MAX_VISIBLE_TOASTS };
