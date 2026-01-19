// Modal form pattern hook - platform agnostic
// Encapsulates the common pattern of a modal with add/edit form

import { useState, useCallback } from 'react';

export interface UseModalFormOptions<TItem, TFormData extends object> {
  /** Empty form data for "add" mode */
  emptyFormData: TFormData;
  /** Convert an item to form data for "edit" mode */
  itemToFormData: (item: TItem) => TFormData;
  /** Create a new item from form data */
  onCreate: (data: TFormData) => Promise<boolean>;
  /** Update an existing item */
  onUpdate: (id: string, data: TFormData) => Promise<boolean>;
  /** Get the ID from an item */
  getItemId: (item: TItem) => string;
}

export interface UseModalFormReturn<TItem, TFormData extends object> {
  /** Whether the modal is visible */
  isOpen: boolean;
  /** The item being edited (null if adding) */
  editingItem: TItem | null;
  /** Current form data */
  formData: TFormData;
  /** Whether we're in edit mode */
  isEditing: boolean;
  /** Open modal in "add" mode */
  openAdd: () => void;
  /** Open modal in "edit" mode with an item */
  openEdit: (item: TItem) => void;
  /** Close the modal and reset state */
  close: () => void;
  /** Update a form field */
  setField: <K extends keyof TFormData>(name: K, value: TFormData[K]) => void;
  /** Update multiple form fields */
  setFields: (updates: Partial<TFormData>) => void;
  /** Submit the form (calls onCreate or onUpdate based on mode) */
  submit: () => Promise<boolean>;
  /** Get title for the modal based on mode */
  getTitle: (addTitle: string, editTitle: string) => string;
  /** Get submit button text based on mode */
  getSubmitText: (addText: string, editText: string) => string;
}

export function useModalForm<TItem, TFormData extends object>({
  emptyFormData,
  itemToFormData,
  onCreate,
  onUpdate,
  getItemId,
}: UseModalFormOptions<TItem, TFormData>): UseModalFormReturn<TItem, TFormData> {
  const [isOpen, setIsOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<TItem | null>(null);
  const [formData, setFormData] = useState<TFormData>(emptyFormData);

  const openAdd = useCallback(() => {
    setEditingItem(null);
    setFormData(emptyFormData);
    setIsOpen(true);
  }, [emptyFormData]);

  const openEdit = useCallback((item: TItem) => {
    setEditingItem(item);
    setFormData(itemToFormData(item));
    setIsOpen(true);
  }, [itemToFormData]);

  const close = useCallback(() => {
    setIsOpen(false);
    setEditingItem(null);
    setFormData(emptyFormData);
  }, [emptyFormData]);

  const setField = useCallback(<K extends keyof TFormData>(name: K, value: TFormData[K]) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  }, []);

  const setFields = useCallback((updates: Partial<TFormData>) => {
    setFormData((prev) => ({ ...prev, ...updates }));
  }, []);

  const submit = useCallback(async (): Promise<boolean> => {
    const success = editingItem
      ? await onUpdate(getItemId(editingItem), formData)
      : await onCreate(formData);

    if (success) {
      close();
    }
    return success;
  }, [editingItem, formData, onCreate, onUpdate, getItemId, close]);

  const getTitle = useCallback((addTitle: string, editTitle: string): string => {
    return editingItem ? editTitle : addTitle;
  }, [editingItem]);

  const getSubmitText = useCallback((addText: string, editText: string): string => {
    return editingItem ? editText : addText;
  }, [editingItem]);

  return {
    isOpen,
    editingItem,
    formData,
    isEditing: editingItem !== null,
    openAdd,
    openEdit,
    close,
    setField,
    setFields,
    submit,
    getTitle,
    getSubmitText,
  };
}
