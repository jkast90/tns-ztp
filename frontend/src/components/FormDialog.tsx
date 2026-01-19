import type { ReactNode, FormEvent } from 'react';
import { Dialog } from './Dialog';
import { Button } from './Button';

export interface FormDialogProps {
  /** Whether the dialog is open */
  isOpen: boolean;
  /** Called when dialog should close */
  onClose: () => void;
  /** Dialog title */
  title: string;
  /** Form submit handler */
  onSubmit: (e: FormEvent) => void | Promise<void>;
  /** Form content */
  children: ReactNode;
  /** Submit button text (default: "Save") */
  submitText?: string;
  /** Cancel button text (default: "Cancel") */
  cancelText?: string;
  /** Whether form is currently submitting */
  saving?: boolean;
  /** Dialog variant */
  variant?: 'default' | 'wide';
}

/**
 * FormDialog - a dialog wrapper specifically for forms.
 * Handles the common pattern of a form inside a dialog with Cancel/Submit buttons.
 *
 * @example
 * <FormDialog
 *   isOpen={showForm}
 *   onClose={handleClose}
 *   title={editing ? 'Edit Item' : 'Add Item'}
 *   onSubmit={handleSubmit}
 *   submitText={editing ? 'Update' : 'Add'}
 * >
 *   <FormField ... />
 * </FormDialog>
 */
export function FormDialog({
  isOpen,
  onClose,
  title,
  onSubmit,
  children,
  submitText = 'Save',
  cancelText = 'Cancel',
  saving = false,
  variant,
}: FormDialogProps) {
  return (
    <Dialog isOpen={isOpen} onClose={onClose} title={title} variant={variant}>
      <form onSubmit={onSubmit}>
        {children}
        <div className="dialog-actions">
          <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>
            {cancelText}
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? 'Saving...' : submitText}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
