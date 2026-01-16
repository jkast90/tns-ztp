// Generic form state management hook - platform agnostic
import { useState, useCallback } from 'react';
import { getErrorMessage } from '../utils/errors';
import type { ValidationResult } from '../utils/validation';

export interface UseFormOptions<T extends object> {
  /** Initial form data */
  initialData: T;
  /** Function to submit the form data */
  onSubmit: (data: T) => Promise<void>;
  /** Callback after successful submission */
  onSuccess?: () => void;
  /** Optional validation function */
  validate?: (data: T) => ValidationResult;
  /** Callback when an error occurs during submission */
  onError?: (message: string) => void;
  /** Fallback error message if error parsing fails */
  errorFallback?: string;
}

export interface UseFormReturn<T extends object> {
  /** Current form data */
  formData: T;
  /** Validation errors keyed by field name */
  errors: Record<string, string>;
  /** Whether the form is currently being submitted */
  saving: boolean;
  /** Update a single field */
  handleChange: <K extends keyof T>(name: K, value: T[K]) => void;
  /** Update multiple fields at once */
  updateFormData: (updates: Partial<T>) => void;
  /** Reset form to initial state or new data */
  resetForm: (newData?: T) => void;
  /** Submit the form (validates first if validate fn provided) */
  handleSubmit: () => Promise<boolean>;
  /** Clear all errors */
  clearErrors: () => void;
  /** Set a specific field error */
  setFieldError: (field: string, message: string) => void;
}

export function useForm<T extends object>({
  initialData,
  onSubmit,
  onSuccess,
  validate,
  onError,
  errorFallback = 'An error occurred',
}: UseFormOptions<T>): UseFormReturn<T> {
  const [formData, setFormData] = useState<T>(initialData);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const handleChange = useCallback(<K extends keyof T>(name: K, value: T[K]) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear error when field is edited
    setErrors((prev) => {
      if (prev[name as string]) {
        const newErrors = { ...prev };
        delete newErrors[name as string];
        return newErrors;
      }
      return prev;
    });
  }, []);

  const updateFormData = useCallback((updates: Partial<T>) => {
    setFormData((prev) => ({ ...prev, ...updates }));
  }, []);

  const resetForm = useCallback(
    (newData?: T) => {
      setFormData(newData ?? initialData);
      setErrors({});
    },
    [initialData]
  );

  const clearErrors = useCallback(() => {
    setErrors({});
  }, []);

  const setFieldError = useCallback((field: string, message: string) => {
    setErrors((prev) => ({ ...prev, [field]: message }));
  }, []);

  const handleSubmit = useCallback(async (): Promise<boolean> => {
    // Run validation if provided
    if (validate) {
      const validation = validate(formData);
      if (!validation.valid) {
        setErrors(validation.errors);
        return false;
      }
    }

    setSaving(true);
    try {
      await onSubmit(formData);
      onSuccess?.();
      return true;
    } catch (error) {
      const message = getErrorMessage(error, errorFallback);
      onError?.(message);
      return false;
    } finally {
      setSaving(false);
    }
  }, [formData, onSubmit, onSuccess, validate, onError, errorFallback]);

  return {
    formData,
    errors,
    saving,
    handleChange,
    updateFormData,
    resetForm,
    handleSubmit,
    clearErrors,
    setFieldError,
  };
}
