import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useSettings } from '../core';
import type { Settings } from '../core';
import { FormInput } from '../components/FormInput';
import { getApiUrl, setApiUrl } from '../setup';

export function SettingsScreen() {
  const navigation = useNavigation();
  const { settings, loading, saving, error, load, save } = useSettings();
  const [formData, setFormData] = useState<Settings | null>(null);
  const [currentApiUrl, setCurrentApiUrl] = useState('');
  const [localApiUrl, setLocalApiUrl] = useState('');
  const [savingApiUrl, setSavingApiUrl] = useState(false);

  // Load API URL on mount
  useEffect(() => {
    getApiUrl().then((url) => {
      setCurrentApiUrl(url);
      setLocalApiUrl(url);
    });
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (settings) {
      setFormData({ ...settings });
    }
  }, [settings]);


  const handleChange = (name: keyof Settings, value: string | number) => {
    if (!formData) return;
    setFormData((prev) => (prev ? { ...prev, [name]: value } : prev));
  };

  const handleApiUrlChange = (value: string) => {
    setLocalApiUrl(value);
  };

  const handleSaveApiUrl = async () => {
    if (localApiUrl === currentApiUrl) return;

    setSavingApiUrl(true);
    try {
      await setApiUrl(localApiUrl);
      setCurrentApiUrl(localApiUrl);
      // Reload settings with new URL
      setTimeout(() => load(), 100);
    } catch (err) {
      Alert.alert('Error', 'Failed to save API URL');
    } finally {
      setSavingApiUrl(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData) return;

    try {
      const success = await save(formData);
      if (success) {
        Alert.alert('Success', 'Settings saved successfully', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      }
    } catch (err) {
      Alert.alert(
        'Error',
        err instanceof Error ? err.message : 'Failed to save settings'
      );
    }
  };

  const apiUrlChanged = localApiUrl !== currentApiUrl;

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {/* API Connection - always show this */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>API Connection</Text>
          <FormInput
            label="API URL"
            value={localApiUrl}
            onChangeText={handleApiUrlChange}
            placeholder="http://192.168.1.100:8080"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
          />
          {apiUrlChanged && (
            <TouchableOpacity
              style={[styles.saveApiButton, savingApiUrl && styles.buttonDisabled]}
              onPress={handleSaveApiUrl}
              disabled={savingApiUrl}
            >
              <Text style={styles.saveApiButtonText}>
                {savingApiUrl ? 'Connecting...' : 'Connect'}
              </Text>
            </TouchableOpacity>
          )}
          {!apiUrlChanged && !error && !loading && (
            <Text style={styles.connectedText}>Connected</Text>
          )}
          {error && (
            <Text style={styles.errorText}>
              Connection failed: {error}
            </Text>
          )}
        </View>

        {/* Server settings - only show if connected */}
        {loading ? (
          <View style={styles.loadingSection}>
            <ActivityIndicator size="small" color="#4a9eff" />
            <Text style={styles.loadingText}>Loading server settings...</Text>
          </View>
        ) : error ? (
          <View style={styles.errorSection}>
            <Text style={styles.errorSectionText}>
              Cannot load server settings. Please check the API URL above and ensure the server is running.
            </Text>
            <TouchableOpacity style={styles.retryButton} onPress={load}>
              <Text style={styles.retryButtonText}>Retry Connection</Text>
            </TouchableOpacity>
          </View>
        ) : formData ? (
          <>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>SSH Defaults</Text>
              <FormInput
                label="Default Username"
                value={formData.default_ssh_user}
                onChangeText={(value) => handleChange('default_ssh_user', value)}
                placeholder="admin"
                autoCapitalize="none"
                autoCorrect={false}
              />
              <FormInput
                label="Default Password"
                value={formData.default_ssh_pass}
                onChangeText={(value) => handleChange('default_ssh_pass', value)}
                placeholder="••••••••"
                secureTextEntry
              />
              <FormInput
                label="Backup Command"
                value={formData.backup_command}
                onChangeText={(value) => handleChange('backup_command', value)}
                placeholder="show running-config"
                autoCapitalize="none"
              />
              <FormInput
                label="Backup Delay (seconds)"
                value={String(formData.backup_delay)}
                onChangeText={(value) => handleChange('backup_delay', parseInt(value, 10) || 0)}
                keyboardType="numeric"
              />
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>DHCP Settings</Text>
              <FormInput
                label="Range Start"
                value={formData.dhcp_range_start}
                onChangeText={(value) => handleChange('dhcp_range_start', value)}
                placeholder="192.168.1.100"
                keyboardType="numeric"
              />
              <FormInput
                label="Range End"
                value={formData.dhcp_range_end}
                onChangeText={(value) => handleChange('dhcp_range_end', value)}
                placeholder="192.168.1.200"
                keyboardType="numeric"
              />
              <FormInput
                label="Subnet Mask"
                value={formData.dhcp_subnet}
                onChangeText={(value) => handleChange('dhcp_subnet', value)}
                placeholder="255.255.255.0"
                keyboardType="numeric"
              />
              <FormInput
                label="Gateway"
                value={formData.dhcp_gateway}
                onChangeText={(value) => handleChange('dhcp_gateway', value)}
                placeholder="192.168.1.1"
                keyboardType="numeric"
              />
              <FormInput
                label="TFTP Server IP"
                value={formData.tftp_server_ip}
                onChangeText={(value) => handleChange('tftp_server_ip', value)}
                placeholder="192.168.1.1"
                keyboardType="numeric"
              />
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>OpenGear ZTP Enrollment</Text>
              <FormInput
                label="Enrollment URL"
                value={formData.opengear_enroll_url || ''}
                onChangeText={(value) => handleChange('opengear_enroll_url', value)}
                placeholder="192.168.1.100 or lighthouse.example.com"
                autoCapitalize="none"
              />
              <FormInput
                label="Bundle Name"
                value={formData.opengear_enroll_bundle || ''}
                onChangeText={(value) => handleChange('opengear_enroll_bundle', value)}
                placeholder="Optional bundle name"
                autoCapitalize="none"
              />
              <FormInput
                label="Enrollment Password"
                value={formData.opengear_enroll_password || ''}
                onChangeText={(value) => handleChange('opengear_enroll_password', value)}
                placeholder="Enrollment password"
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
                style={[styles.submitButton, saving && styles.buttonDisabled]}
                onPress={handleSubmit}
                disabled={saving}
              >
                <Text style={styles.submitButtonText}>
                  {saving ? 'Saving...' : 'Save Settings'}
                </Text>
              </TouchableOpacity>
            </View>
          </>
        ) : null}
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
    marginBottom: 16,
  },
  connectedText: {
    color: '#4ade80',
    fontSize: 12,
    marginTop: 8,
  },
  errorText: {
    color: '#ff5252',
    fontSize: 12,
    marginTop: 8,
  },
  saveApiButton: {
    backgroundColor: '#4a9eff',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 12,
  },
  saveApiButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  loadingSection: {
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    padding: 32,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#2a2a4e',
    alignItems: 'center',
  },
  loadingText: {
    color: '#888',
    marginTop: 12,
  },
  errorSection: {
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    padding: 24,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#2a2a4e',
    alignItems: 'center',
  },
  errorSectionText: {
    color: '#888',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#2a2a4e',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#888',
    fontWeight: '600',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
    marginBottom: 32,
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
  buttonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
});
