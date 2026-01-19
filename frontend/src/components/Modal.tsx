import { ReactNode, useEffect } from 'react';
import { CloseButton } from './CloseButton';
import { ResizableModal } from './ResizableModal';

export interface ModalProps {
  title: string;
  children: ReactNode;
  onClose: () => void;
  /** Whether the modal is open (for controlled usage) */
  isOpen?: boolean;
  /** Size variant */
  variant?: 'default' | 'wide';
  /** Enable resizable/draggable mode */
  resizable?: boolean;
  /** Footer content rendered outside the scrollable area */
  footer?: ReactNode;
}

/**
 * Unified Modal component for dialogs and overlays.
 *
 * Can be used in two modes:
 * 1. Controlled: Pass isOpen prop to control visibility
 * 2. Uncontrolled: Just render the component when you want it shown
 *
 * @example
 * // Uncontrolled (original Modal pattern)
 * {showModal && <Modal title="My Modal" onClose={handleClose}>Content</Modal>}
 *
 * @example
 * // Controlled (Dialog pattern)
 * <Modal isOpen={showModal} title="My Modal" onClose={handleClose}>Content</Modal>
 */
export function Modal({ title, children, onClose, isOpen, variant = 'default', resizable = false, footer }: ModalProps) {
  // Use ResizableModal for resizable mode
  if (resizable) {
    return (
      <ResizableModal
        title={title}
        onClose={onClose}
        isOpen={isOpen}
        variant={variant}
      >
        {children}
      </ResizableModal>
    );
  }

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    // For controlled mode, only attach listeners when open
    const shouldBeActive = isOpen === undefined ? true : isOpen;

    if (shouldBeActive) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  // For controlled mode, return null when not open
  if (isOpen !== undefined && !isOpen) {
    return null;
  }

  const modalClass = variant === 'wide' ? 'modal modal-wide' : 'modal';

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className={modalClass} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{title}</h3>
          <CloseButton onClick={onClose} label="Close modal" />
        </div>
        <div className="modal-content">
          {children}
        </div>
        {footer && (
          <div className="modal-footer">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
