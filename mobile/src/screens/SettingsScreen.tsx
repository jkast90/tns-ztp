import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSettings } from '../core';
import type { Settings } from '../core';
import {
  ActionButtons,
  Button,
  Card,
  FormInput,
  ScreenContainer,
} from '../components';
import { getApiUrl, setApiUrl } from '../setup';

export function SettingsScreen() {
  const navigation = useNavigation();
  const { settings, loading, saving, error, load, save } = useSettings();
  const [formData, setFormData] = useState<Settings | null>(null);
  const [currentApiUrl, setCurrentApiUrl] = useState('');
  const [localApiUrl, setLocalApiUrl] = useState('');
  const [savingApiUrl, setSavingApiUrl] = useState(false);

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
    <ScreenContainer>
      <Card title="API Connection">
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
          <Button
            title={savingApiUrl ? 'Connecting...' : 'Connect'}
            onPress={handleSaveApiUrl}
            loading={savingApiUrl}
            style={styles.connectButton}
          />
        )}
        {!apiUrlChanged && !error && !loading && (
          <Text style={styles.connectedText}>Connected</Text>
        )}
        {error && (
          <Text style={styles.errorText}>Connection failed: {error}</Text>
        )}
      </Card>

      {loading ? (
        <Card>
          <View style={styles.loadingSection}>
            <ActivityIndicator size="small" color="#4a9eff" />
            <Text style={styles.loadingText}>Loading server settings...</Text>
          </View>
        </Card>
      ) : error ? (
        <Card>
          <View style={styles.errorSection}>
            <Text style={styles.errorSectionText}>
              Cannot load server settings. Please check the API URL above and ensure the server is running.
            </Text>
            <Button
              title="Retry Connection"
              variant="secondary"
              onPress={load}
            />
          </View>
        </Card>
      ) : formData ? (
        <>
          <Card title="SSH Defaults">
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
          </Card>

          <Card title="DHCP Settings">
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
          </Card>

          <Card title="OpenGear ZTP Enrollment">
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
          </Card>

          <ActionButtons
            onCancel={() => navigation.goBack()}
            onSubmit={handleSubmit}
            submitLabel={saving ? 'Saving...' : 'Save Settings'}
            loading={saving}
          />
        </>
      ) : null}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  connectButton: {
    marginTop: 12,
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
  loadingSection: {
    alignItems: 'center',
    padding: 16,
  },
  loadingText: {
    color: '#888',
    marginTop: 12,
  },
  errorSection: {
    alignItems: 'center',
    padding: 8,
  },
  errorSectionText: {
    color: '#888',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 16,
  },
});
