import { ReactNode, useEffect, useRef, useState, useCallback } from 'react';
import { CloseButton } from './CloseButton';

export interface ResizableModalProps {
  title: string;
  children: ReactNode;
  onClose: () => void;
  /** Whether the modal is open (for controlled usage) */
  isOpen?: boolean;
  /** Size variant */
  variant?: 'default' | 'wide';
  /** Initial width in pixels */
  initialWidth?: number;
  /** Initial height in pixels (undefined = auto) */
  initialHeight?: number;
  /** Minimum width */
  minWidth?: number;
  /** Minimum height */
  minHeight?: number;
  /** Whether the modal can be resized */
  resizable?: boolean;
  /** Whether the modal can be dragged */
  draggable?: boolean;
}

interface Position {
  x: number;
  y: number;
}

interface Size {
  width: number;
  height: number | 'auto';
}

/**
 * Resizable and draggable Modal component.
 */
export function ResizableModal({
  title,
  children,
  onClose,
  isOpen,
  variant = 'default',
  initialWidth,
  initialHeight,
  minWidth = 300,
  minHeight = 200,
  resizable = true,
  draggable = true,
}: ResizableModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);

  // Default widths based on variant
  const defaultWidth = variant === 'wide' ? 700 : 500;

  const [position, setPosition] = useState<Position | null>(null);
  const [size, setSize] = useState<Size>({
    width: initialWidth || defaultWidth,
    height: initialHeight || 'auto',
  });
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragStart, setDragStart] = useState<Position>({ x: 0, y: 0 });
  const [resizeStart, setResizeStart] = useState<{ x: number; y: number; width: number; height: number }>({
    x: 0,
    y: 0,
    width: 0,
    height: 0,
  });

  // Center modal on first render
  useEffect(() => {
    if (isOpen && !position && modalRef.current) {
      const rect = modalRef.current.getBoundingClientRect();
      setPosition({
        x: (window.innerWidth - rect.width) / 2,
        y: Math.max(50, (window.innerHeight - rect.height) / 2),
      });
    }
  }, [isOpen, position]);

  // Reset position when modal closes
  useEffect(() => {
    if (!isOpen) {
      setPosition(null);
    }
  }, [isOpen]);

  // Handle escape key and body scroll
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

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

  // Drag handlers
  const handleDragStart = useCallback(
    (e: React.MouseEvent) => {
      if (!draggable || !position) return;
      // Only start drag from header area
      if (!headerRef.current?.contains(e.target as Node)) return;

      e.preventDefault();
      setIsDragging(true);
      setDragStart({
        x: e.clientX - position.x,
        y: e.clientY - position.y,
      });
    },
    [draggable, position]
  );

  const handleDragMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging) return;

      const newX = Math.max(0, Math.min(window.innerWidth - 100, e.clientX - dragStart.x));
      const newY = Math.max(0, Math.min(window.innerHeight - 50, e.clientY - dragStart.y));

      setPosition({ x: newX, y: newY });
    },
    [isDragging, dragStart]
  );

  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Resize handlers
  const handleResizeStart = useCallback(
    (e: React.MouseEvent) => {
      if (!resizable || !modalRef.current) return;

      e.preventDefault();
      e.stopPropagation();

      const rect = modalRef.current.getBoundingClientRect();
      setIsResizing(true);
      setResizeStart({
        x: e.clientX,
        y: e.clientY,
        width: rect.width,
        height: rect.height,
      });
    },
    [resizable]
  );

  const handleResizeMove = useCallback(
    (e: MouseEvent) => {
      if (!isResizing) return;

      const deltaX = e.clientX - resizeStart.x;
      const deltaY = e.clientY - resizeStart.y;

      const newWidth = Math.max(minWidth, resizeStart.width + deltaX);
      const newHeight = Math.max(minHeight, resizeStart.height + deltaY);

      setSize({ width: newWidth, height: newHeight });
    },
    [isResizing, resizeStart, minWidth, minHeight]
  );

  const handleResizeEnd = useCallback(() => {
    setIsResizing(false);
  }, []);

  // Attach global mouse listeners for drag/resize
  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleDragMove);
      window.addEventListener('mouseup', handleDragEnd);
      return () => {
        window.removeEventListener('mousemove', handleDragMove);
        window.removeEventListener('mouseup', handleDragEnd);
      };
    }
  }, [isDragging, handleDragMove, handleDragEnd]);

  useEffect(() => {
    if (isResizing) {
      window.addEventListener('mousemove', handleResizeMove);
      window.addEventListener('mouseup', handleResizeEnd);
      return () => {
        window.removeEventListener('mousemove', handleResizeMove);
        window.removeEventListener('mouseup', handleResizeEnd);
      };
    }
  }, [isResizing, handleResizeMove, handleResizeEnd]);

  // For controlled mode, return null when not open
  if (isOpen !== undefined && !isOpen) {
    return null;
  }

  const modalStyle: React.CSSProperties = {
    position: 'absolute',
    left: position?.x ?? '50%',
    top: position?.y ?? '50%',
    transform: position ? 'none' : 'translate(-50%, -50%)',
    width: size.width,
    height: size.height,
    maxWidth: '95vw',
    maxHeight: '90vh',
    cursor: isDragging ? 'grabbing' : undefined,
  };

  return (
    <div className="modal-overlay modal-overlay-transparent" onClick={onClose}>
      <div
        ref={modalRef}
        className="modal modal-resizable"
        style={modalStyle}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          ref={headerRef}
          className={`modal-header modal-header-draggable ${draggable ? 'draggable' : ''}`}
          onMouseDown={handleDragStart}
          style={{ cursor: draggable ? (isDragging ? 'grabbing' : 'grab') : undefined }}
        >
          <h3>{title}</h3>
          <CloseButton onClick={onClose} label="Close modal" />
        </div>
        <div className="modal-content">{children}</div>
        {resizable && (
          <div
            className="modal-resize-handle"
            onMouseDown={handleResizeStart}
            style={{ cursor: 'nwse-resize' }}
          />
        )}
      </div>
    </div>
  );
}
