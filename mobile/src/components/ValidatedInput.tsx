import { useState, useCallback } from 'react';
import { View, StyleSheet, TextInputProps } from 'react-native';
import { FormInput } from './FormInput';
import { Button } from './Button';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList, ScanField } from '../navigation/types';
import {
  validateMacAddress,
  validateIpAddress,
  validateHostname,
} from '../core';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export type ValidationType = 'mac' | 'ip' | 'hostname' | 'none';

interface ValidatedInputProps extends Omit<TextInputProps, 'onChangeText'> {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  validation?: ValidationType;
  required?: boolean;
  error?: string;
  scannable?: boolean;
  scanField?: ScanField;
  mac?: string;
}

const VALIDATION_ERRORS: Record<ValidationType, string> = {
  mac: 'Invalid MAC address format (use aa:bb:cc:dd:ee:ff)',
  ip: 'Invalid IP address format',
  hostname: 'Invalid hostname (alphanumeric and hyphens only)',
  none: '',
};

const VALIDATORS: Record<ValidationType, (value: string) => boolean> = {
  mac: validateMacAddress,
  ip: validateIpAddress,
  hostname: validateHostname,
  none: () => true,
};

export function ValidatedInput({
  label,
  value,
  onChangeText,
  validation = 'none',
  required = false,
  error: externalError,
  scannable = false,
  scanField,
  mac,
  ...inputProps
}: ValidatedInputProps) {
  const navigation = useNavigation<NavigationProp>();
  const [touched, setTouched] = useState(false);

  const validate = useCallback(
    (val: string): string | undefined => {
      if (!val) {
        return required ? `${label} is required` : undefined;
      }
      if (validation !== 'none' && !VALIDATORS[validation](val)) {
        return VALIDATION_ERRORS[validation];
      }
      return undefined;
    },
    [validation, required, label]
  );

  const handleChangeText = useCallback(
    (newValue: string) => {
      onChangeText(newValue);
    },
    [onChangeText]
  );

  const handleBlur = useCallback(() => {
    setTouched(true);
  }, []);

  const handleScanPress = () => {
    if (scanField) {
      navigation.navigate('Scanner', { returnTo: 'DeviceForm', mac, field: scanField });
    }
  };

  // Show validation error only after the field has been touched
  const validationError = touched ? validate(value) : undefined;
  const displayError = externalError || validationError;

  const input = (
    <FormInput
      label={label}
      value={value}
      onChangeText={handleChangeText}
      onBlur={handleBlur}
      error={displayError}
      {...inputProps}
    />
  );

  if (scannable && scanField) {
    return (
      <View style={styles.container}>
        <View style={styles.input}>{input}</View>
        <Button
          title="Scan"
          onPress={handleScanPress}
          size="md"
          style={styles.button}
        />
      </View>
    );
  }

  return input;
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  input: {
    flex: 1,
  },
  button: {
    marginBottom: 12,
  },
});
