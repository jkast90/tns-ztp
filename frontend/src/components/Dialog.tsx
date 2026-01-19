// Dialog is now an alias for Modal with controlled mode
// This provides backwards compatibility for existing code

import { Modal, type ModalProps } from './Modal';

export interface DialogProps extends ModalProps {
  isOpen: boolean; // Required for Dialog
}

/**
 * Dialog component - controlled modal wrapper.
 *
 * @deprecated Use Modal with isOpen prop instead for new code.
 *
 * @example
 * // Old pattern (still works):
 * <Dialog isOpen={show} onClose={handleClose} title="Title">Content</Dialog>
 *
 * // New pattern:
 * <Modal isOpen={show} onClose={handleClose} title="Title">Content</Modal>
 */
export function Dialog(props: DialogProps) {
  return <Modal {...props} />;
}
