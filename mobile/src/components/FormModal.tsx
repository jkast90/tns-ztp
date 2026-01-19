import { ReactNode } from 'react';
import { Modal } from './Modal';
import { Button } from './Button';

interface FormModalProps {
  /** Whether the modal is visible */
  visible: boolean;
  /** Called when modal should close */
  onClose: () => void;
  /** Called when form is submitted */
  onSubmit: () => void | Promise<void>;
  /** Modal title */
  title: string;
  /** Optional subtitle */
  subtitle?: string;
  /** Form content */
  children: ReactNode;
  /** Submit button text (default based on isEditing) */
  submitText?: string;
  /** Cancel button text (default: "Cancel") */
  cancelText?: string;
  /** Whether this is editing an existing item (affects default submit text) */
  isEditing?: boolean;
  /** Whether form is currently submitting */
  saving?: boolean;
  /** Height preset: 'small' (50%), 'medium' (70%), 'large' (85%), 'full' (95%) */
  size?: 'small' | 'medium' | 'large' | 'full';
}

/**
 * FormModal - a modal wrapper specifically for add/edit forms.
 * Handles the common pattern of a form inside a modal with Cancel/Submit buttons.
 *
 * @example
 * <FormModal
 *   visible={showForm}
 *   onClose={handleClose}
 *   onSubmit={handleSubmit}
 *   title={editingVendor ? 'Edit Vendor' : 'Add Vendor'}
 *   isEditing={!!editingVendor}
 * >
 *   <FormField ... />
 * </FormModal>
 */
export function FormModal({
  visible,
  onClose,
  onSubmit,
  title,
  subtitle,
  children,
  submitText,
  cancelText = 'Cancel',
  isEditing = false,
  saving = false,
  size = 'large',
}: FormModalProps) {
  const defaultSubmitText = isEditing ? 'Update' : 'Add';

  return (
    <Modal
      visible={visible}
      onClose={onClose}
      title={title}
      subtitle={subtitle}
      size={size}
      keyboardAware
      footer={
        <>
          <Button
            title={cancelText}
            onPress={onClose}
            variant="secondary"
            disabled={saving}
          />
          <Button
            title={saving ? 'Saving...' : (submitText || defaultSubmitText)}
            onPress={onSubmit}
            disabled={saving}
          />
        </>
      }
    >
      {children}
    </Modal>
  );
}
