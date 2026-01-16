import { useCallback } from 'react';
import { Alert } from 'react-native';
import { useForm, validateDeviceForm } from '../core';
import type { DeviceFormData, UseFormReturn } from '../core';

export interface UseDeviceFormOptions {
  initialData: DeviceFormData;
  onSubmit: (data: DeviceFormData) => Promise<void>;
  onSuccess?: () => void;
  submitErrorTitle?: string;
  submitErrorFallback?: string;
}

export type UseDeviceFormReturn = UseFormReturn<DeviceFormData>;

export function useDeviceForm({
  initialData,
  onSubmit,
  onSuccess,
  submitErrorTitle = 'Error',
  submitErrorFallback = 'An error occurred',
}: UseDeviceFormOptions): UseDeviceFormReturn {
  const handleError = useCallback(
    (message: string) => {
      Alert.alert(submitErrorTitle, message);
    },
    [submitErrorTitle]
  );

  return useForm<DeviceFormData>({
    initialData,
    onSubmit,
    onSuccess,
    validate: validateDeviceForm,
    onError: handleError,
    errorFallback: submitErrorFallback,
  });
}
