import { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { useDevices, validateDeviceForm } from '../core';
import type { DeviceFormData } from '../core';
import type { RootStackParamList } from '../navigation/types';
import { FormInput } from '../components/FormInput';
import { IconButton } from '../components/IconButton';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'AddDevice'>;
type AddDeviceRouteProp = RouteProp<RootStackParamList, 'AddDevice'>;

const initialFormData: DeviceFormData = {
  mac: '',
  ip: '',
  hostname: '',
  serial_number: '',
  config_template: 'default.template',
  ssh_user: '',
  ssh_pass: '',
};

export function AddDeviceScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<AddDeviceRouteProp>();
  const { createDevice } = useDevices({ autoRefresh: false });
  const [formData, setFormData] = useState<DeviceFormData>(initialFormData);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const lastAppliedSerial = useRef<string | null>(null);

  // Handle scanned serial from barcode scanner
  useEffect(() => {
    const scannedSerial = route.params?.scannedSerial;
    if (scannedSerial && scannedSerial !== lastAppliedSerial.current) {
      lastAppliedSerial.current = scannedSerial;
      setFormData((prev) => ({
        ...prev,
        serial_number: scannedSerial,
      }));
    }
  }, [route.params]);

  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <IconButton
          icon="qr-code-scanner"
          onPress={() => navigation.navigate('Scanner', { returnTo: 'AddDevice' })}
        />
      ),
    });
  }, [navigation]);

  const handleChange = (name: keyof DeviceFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear error when field is edited
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleSubmit = async () => {
    const validation = validateDeviceForm(formData);
    if (!validation.valid) {
      setErrors(validation.errors);
      return;
    }

    setSaving(true);
    try {
      await createDevice(formData);
      navigation.goBack();
    } catch (error) {
      Alert.alert(
        'Error',
        error instanceof Error ? error.message : 'Failed to add device'
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Device Information</Text>
          <FormInput
            label="MAC Address"
            value={formData.mac}
            onChangeText={(value) => handleChange('mac', value)}
            placeholder="00:11:22:33:44:55"
            autoCapitalize="none"
            error={errors.mac}
          />
          <FormInput
            label="IP Address"
            value={formData.ip}
            onChangeText={(value) => handleChange('ip', value)}
            placeholder="192.168.1.100"
            keyboardType="numeric"
            error={errors.ip}
          />
          <FormInput
            label="Hostname"
            value={formData.hostname}
            onChangeText={(value) => handleChange('hostname', value)}
            placeholder="switch-01"
            autoCapitalize="none"
            error={errors.hostname}
          />
          <View style={styles.serialRow}>
            <View style={styles.serialInput}>
              <FormInput
                label="Serial Number"
                value={formData.serial_number}
                onChangeText={(value) => handleChange('serial_number', value)}
                placeholder="SN123456"
                autoCapitalize="characters"
              />
            </View>
            <TouchableOpacity
              style={styles.scanButton}
              onPress={() => navigation.navigate('Scanner', { returnTo: 'AddDevice' })}
            >
              <Text style={styles.scanButtonText}>Scan</Text>
            </TouchableOpacity>
          </View>
          <FormInput
            label="Config Template"
            value={formData.config_template}
            onChangeText={(value) => handleChange('config_template', value)}
            placeholder="default.template"
            autoCapitalize="none"
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>SSH Credentials (Optional)</Text>
          <Text style={styles.sectionSubtitle}>
            Leave empty to use global defaults
          </Text>
          <FormInput
            label="SSH Username"
            value={formData.ssh_user}
            onChangeText={(value) => handleChange('ssh_user', value)}
            placeholder="admin"
            autoCapitalize="none"
            autoCorrect={false}
          />
          <FormInput
            label="SSH Password"
            value={formData.ssh_pass}
            onChangeText={(value) => handleChange('ssh_pass', value)}
            placeholder="••••••••"
            secureTextEntry
          />
        </View>

        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.submitButton, saving && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={saving}
          >
            <Text style={styles.submitButtonText}>
              {saving ? 'Adding...' : 'Add Device'}
            </Text>
          </TouchableOpacity>
        </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f1a',
  },
  flex: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  section: {
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#2a2a4e',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: '#888',
    marginBottom: 16,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#2a2a4e',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#888',
    fontWeight: '600',
  },
  submitButton: {
    flex: 2,
    backgroundColor: '#4a9eff',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  serialRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  serialInput: {
    flex: 1,
  },
  scanButton: {
    backgroundColor: '#4a9eff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  scanButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
});
