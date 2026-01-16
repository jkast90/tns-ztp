import { useEffect, useRef } from 'react';
import { useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { RootStackParamList, ScanField } from '../navigation/types';

interface ScanResult {
  value: string;
  field: ScanField;
}

/**
 * Hook to handle scanned values from the barcode scanner.
 * Prevents duplicate applications of the same scanned value.
 */
export function useScannedValue(
  onValueScanned: (value: string, field: ScanField) => void
) {
  const route = useRoute<RouteProp<RootStackParamList, 'DeviceForm'>>();
  const lastApplied = useRef<ScanResult | null>(null);

  useEffect(() => {
    const params = route.params;
    const scannedValue = params?.scannedValue;
    const scannedField = params?.scannedField;

    if (scannedValue && scannedField) {
      // Prevent duplicate applications
      if (
        lastApplied.current?.value === scannedValue &&
        lastApplied.current?.field === scannedField
      ) {
        return;
      }

      lastApplied.current = { value: scannedValue, field: scannedField };
      onValueScanned(scannedValue, scannedField);
    }
  }, [route.params, onValueScanned]);
}
