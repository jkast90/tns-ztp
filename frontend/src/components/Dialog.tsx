import { ReactNode, useEffect } from 'react';
import { Icon } from './Icon';

interface DialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  variant?: 'default' | 'wide';
}

export function Dialog({ isOpen, onClose, title, children, variant = 'default' }: DialogProps) {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const dialogClass = variant === 'wide' ? 'dialog dialog-wide' : 'dialog';

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div className={dialogClass} onClick={(e) => e.stopPropagation()}>
        <div className="dialog-header">
          <h2>{title}</h2>
          <button className="dialog-close" onClick={onClose}>
            <Icon name="close" size={20} />
          </button>
        </div>
        <div className="dialog-content">
          {children}
        </div>
      </div>
    </div>
  );
}
