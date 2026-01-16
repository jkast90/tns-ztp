import { useEffect, useCallback, useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { useDevices } from '../core';
import type { DeviceFormData } from '../core';
import type { RootStackParamList, ScanField } from '../navigation/types';
import {
  ActionButtons,
  DeviceFormFields,
  ErrorState,
  LoadingState,
  ScreenContainer,
} from '../components';
import { useDeviceForm, useScannedValue } from '../hooks';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'DeviceForm'>;
type DeviceFormRouteProp = RouteProp<RootStackParamList, 'DeviceForm'>;

const emptyFormData: DeviceFormData = {
  mac: '',
  ip: '',
  hostname: '',
  vendor: '',
  serial_number: '',
  config_template: 'default.template',
  ssh_user: '',
  ssh_pass: '',
};

export function DeviceFormScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<DeviceFormRouteProp>();
  const mac = route.params?.mac;
  const isEditMode = !!mac;

  const { devices, createDevice, updateDevice, loading } = useDevices({ autoRefresh: false });
  const device = isEditMode ? devices.find((d) => d.mac === mac) : null;

  const initialData = useMemo(() => {
    if (!isEditMode || !device) return emptyFormData;
    return {
      mac: device.mac,
      ip: device.ip,
      hostname: device.hostname,
      vendor: device.vendor || '',
      serial_number: device.serial_number || '',
      config_template: device.config_template,
      ssh_user: device.ssh_user || '',
      ssh_pass: device.ssh_pass || '',
    };
  }, [isEditMode, device]);

  const handleFormSubmit = useCallback(
    async (data: DeviceFormData) => {
      if (isEditMode && mac) {
        await updateDevice(mac, data);
      } else {
        await createDevice(data);
      }
    },
    [isEditMode, mac, updateDevice, createDevice]
  );

  const {
    formData,
    errors,
    saving,
    handleChange,
    updateFormData,
    resetForm,
    handleSubmit,
  } = useDeviceForm({
    initialData,
    onSubmit: handleFormSubmit,
    onSuccess: () => navigation.goBack(),
    submitErrorTitle: 'Error',
    submitErrorFallback: isEditMode ? 'Failed to update device' : 'Failed to add device',
  });

  // Reset form when device data changes (for edit mode)
  useEffect(() => {
    if (isEditMode && device) {
      resetForm({
        mac: device.mac,
        ip: device.ip,
        hostname: device.hostname,
        vendor: device.vendor || '',
        serial_number: device.serial_number || '',
        config_template: device.config_template,
        ssh_user: device.ssh_user || '',
        ssh_pass: device.ssh_pass || '',
      });
    }
  }, [device, isEditMode, resetForm]);

  // Handle scanned values from barcode scanner
  useScannedValue(
    useCallback(
      (value: string, field: ScanField) => {
        updateFormData({ [field]: value });
      },
      [updateFormData]
    )
  );

  useEffect(() => {
    navigation.setOptions({
      title: isEditMode ? 'Edit Device' : 'Add Device',
    });
  }, [navigation, isEditMode]);

  if (isEditMode && loading) {
    return (
      <View style={styles.fullScreen}>
        <LoadingState message="Loading device..." />
      </View>
    );
  }

  if (isEditMode && !device) {
    return (
      <View style={styles.fullScreen}>
        <ErrorState
          title="Not Found"
          message="Device not found"
          primaryAction={{
            label: 'Go Back',
            onPress: () => navigation.goBack(),
          }}
        />
      </View>
    );
  }

  return (
    <ScreenContainer>
      <DeviceFormFields
        formData={formData}
        errors={errors}
        onChange={handleChange}
        mac={mac}
        macEditable={!isEditMode}
      />

      <ActionButtons
        onCancel={() => navigation.goBack()}
        onSubmit={handleSubmit}
        submitLabel={saving ? (isEditMode ? 'Saving...' : 'Adding...') : (isEditMode ? 'Save Changes' : 'Add Device')}
        loading={saving}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  fullScreen: {
    flex: 1,
    backgroundColor: '#0f0f1a',
  },
});
