import { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Alert,
  TextInput,
  Pressable,
  Platform,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import type { TestContainer, SpawnContainerRequest } from '../core';
import {
  useTestContainers,
  VENDOR_CLASS_OPTIONS,
  CONFIG_METHOD_OPTIONS,
  generateMac,
  getVendorPrefixOptions,
  getVendorClassForVendor,
} from '../core';
import { Card, Button, IconButton, EmptyState, FormSelect, Modal } from '../components';
import { useAppTheme } from '../context';

export function TestContainersScreen() {
  const { colors } = useAppTheme();
  const {
    containers,
    loading,
    error,
    message,
    clearMessage,
    refresh,
    spawn,
    remove,
  } = useTestContainers({ autoRefresh: true, refreshInterval: 5000 });

  const [showSpawnDialog, setShowSpawnDialog] = useState(false);
  const [spawning, setSpawning] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [formData, setFormData] = useState<SpawnContainerRequest>({
    hostname: '',
    mac: '',
    vendor_class: '',
    config_method: 'tftp',
  });
  const [selectedVendorPrefix, setSelectedVendorPrefix] = useState('');

  // Get vendor prefix options from shared utility
  const vendorPrefixOptions = useMemo(() => getVendorPrefixOptions(), []);

  // Show messages
  if (message) {
    Alert.alert(
      message.type === 'error' ? 'Error' : 'Success',
      message.text
    );
    clearMessage();
  }

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  }, [refresh]);

  const handleGenerateMac = () => {
    const mac = generateMac(selectedVendorPrefix || undefined);
    setFormData((prev) => ({ ...prev, mac }));
  };

  const handleVendorPrefixChange = (prefix: string) => {
    setSelectedVendorPrefix(prefix);
    // Auto-generate MAC with new prefix
    const mac = generateMac(prefix || undefined);
    // Find the vendor name for this prefix and auto-fill vendor class
    const selectedOption = vendorPrefixOptions.find((opt) => opt.value === prefix);
    const vendorClass = selectedOption ? getVendorClassForVendor(selectedOption.vendor) : '';
    setFormData((prev) => ({ ...prev, mac, vendor_class: vendorClass }));
  };

  const handleOpenDialog = () => {
    // Generate initial MAC
    const mac = generateMac();
    setFormData({ hostname: '', mac, vendor_class: '', config_method: 'tftp' });
    setSelectedVendorPrefix('');
    setShowSpawnDialog(true);
  };

  // Quick spawn with default settings
  const handleQuickSpawn = async () => {
    setSpawning(true);
    try {
      const mac = generateMac();
      await spawn({ mac, config_method: 'tftp' });
    } finally {
      setSpawning(false);
    }
  };

  const handleSpawn = async () => {
    if (!formData.mac?.trim()) {
      Alert.alert('Error', 'MAC address is required');
      return;
    }

    setSpawning(true);
    try {
      await spawn(formData);
      setShowSpawnDialog(false);
      setFormData({ hostname: '', mac: '', vendor_class: '', config_method: 'tftp' });
      setSelectedVendorPrefix('');
    } finally {
      setSpawning(false);
    }
  };

  const handleRemove = (container: TestContainer) => {
    Alert.alert(
      'Remove Container',
      `Remove test device "${container.hostname}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => remove(container.id),
        },
      ]
    );
  };

  const renderContainer = ({ item }: { item: TestContainer }) => (
    <Card style={styles.containerCard}>
      <View style={styles.containerHeader}>
        <View style={styles.containerInfo}>
          <Text style={[styles.hostname, { color: colors.textPrimary }]}>{item.hostname}</Text>
          <Text style={[styles.mac, { color: colors.textMuted }]}>{item.mac}</Text>
        </View>
        <View
          style={[
            styles.statusBadge,
            item.status === 'running' ? styles.statusRunning : styles.statusStopped,
          ]}
        >
          <Text style={[styles.statusText, { color: colors.textPrimary }]}>{item.status}</Text>
        </View>
      </View>

      <View style={styles.containerDetails}>
        <View style={styles.detailRow}>
          <MaterialIcons name="wifi" size={14} color={colors.textMuted} />
          <Text style={[styles.detailText, { color: colors.textMuted }]}>{item.ip || 'Pending IP...'}</Text>
        </View>
      </View>

      <View style={styles.containerActions}>
        <IconButton icon="delete" onPress={() => handleRemove(item)} />
      </View>
    </Card>
  );

  if (loading && containers.length === 0) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: colors.bgPrimary }]}>
        <ActivityIndicator size="large" color={colors.accentBlue} />
        <Text style={[styles.loadingText, { color: colors.textMuted }]}>Loading test containers...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.bgPrimary }]}>
      {/* Actions Bar */}
      <View style={styles.actions}>
        <Button
          title={spawning ? 'Adding...' : 'Quick Add'}
          onPress={handleQuickSpawn}
          icon="add"
          disabled={spawning}
        />
        <Button title="Custom" onPress={handleOpenDialog} variant="secondary" icon="tune" />
        <Text style={[styles.countText, { color: colors.textMuted }]}>
          {containers.length} running
        </Text>
      </View>

      {/* Docker Error Warning */}
      {error && (
        <Card style={styles.errorCard}>
          <View style={styles.errorContent}>
            <MaterialIcons name="error-outline" size={20} color={colors.error} />
            <Text style={[styles.errorText, { color: colors.error }]}>Docker not available: {error}</Text>
          </View>
        </Card>
      )}

      {/* Container List */}
      <FlatList
        data={containers}
        keyExtractor={(item) => item.id}
        renderItem={renderContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.accentBlue}
            colors={[colors.accentBlue]}
          />
        }
        ListEmptyComponent={
          <EmptyState
            icon="dns"
            message="No test containers running"
            description="Spawn a test device to simulate network equipment requesting DHCP."
            actionLabel="Spawn Device"
            onAction={handleOpenDialog}
          />
        }
        ListFooterComponent={
          <Card style={styles.infoCard}>
            <View style={styles.infoHeader}>
              <MaterialIcons name="info-outline" size={18} color={colors.accentBlue} />
              <Text style={[styles.infoTitle, { color: colors.textPrimary }]}>About Test Containers</Text>
            </View>
            <Text style={[styles.infoText, { color: colors.textMuted }]}>
              Test containers simulate network devices requesting DHCP leases. They appear in
              Discovery if not configured as devices.
            </Text>
          </Card>
        }
        contentContainerStyle={
          containers.length === 0 ? styles.emptyList : styles.listContent
        }
      />

      {/* Spawn Dialog */}
      <Modal
        visible={showSpawnDialog}
        onClose={() => setShowSpawnDialog(false)}
        title="Spawn Test Device"
        size="medium"
        keyboardAware
        footer={
          <>
            <Button
              title="Cancel"
              onPress={() => setShowSpawnDialog(false)}
              variant="secondary"
            />
            <Button
              title={spawning ? 'Spawning...' : 'Spawn'}
              onPress={handleSpawn}
              disabled={spawning}
            />
          </>
        }
      >
        <View style={styles.formGroup}>
          <Text style={[styles.label, { color: colors.textMuted }]}>Hostname (optional)</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.bgCard, borderColor: colors.border, color: colors.textPrimary }]}
            value={formData.hostname}
            onChangeText={(text) =>
              setFormData((prev) => ({ ...prev, hostname: text }))
            }
            placeholder="test-switch-01 (auto-generated)"
            placeholderTextColor={colors.textMuted}
          />
        </View>

        <FormSelect
          label="Vendor MAC Prefix"
          value={selectedVendorPrefix}
          options={vendorPrefixOptions}
          onChange={handleVendorPrefixChange}
          placeholder="Random MAC"
        />

        <View style={styles.formGroup}>
          <Text style={[styles.label, { color: colors.textMuted }]}>MAC Address</Text>
          <View style={styles.macInputRow}>
            <TextInput
              style={[styles.input, styles.macInput, { backgroundColor: colors.bgCard, borderColor: colors.border, color: colors.textPrimary }]}
              value={formData.mac}
              onChangeText={(text) =>
                setFormData((prev) => ({ ...prev, mac: text }))
              }
              placeholder="aa:bb:cc:dd:ee:ff"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="none"
            />
            <Pressable style={[styles.generateButton, { backgroundColor: colors.bgCard, borderColor: colors.accentBlue }]} onPress={handleGenerateMac}>
              <MaterialIcons name="refresh" size={20} color={colors.accentBlue} />
            </Pressable>
          </View>
        </View>

        <FormSelect
          label="DHCP Vendor Class (Option 60)"
          value={formData.vendor_class || ''}
          options={VENDOR_CLASS_OPTIONS}
          onChange={(value) =>
            setFormData((prev) => ({ ...prev, vendor_class: value }))
          }
          placeholder="None"
        />

        <View style={styles.formGroup}>
          <Text style={[styles.label, { color: colors.textMuted }]}>Config Fetch Method</Text>
          <View style={styles.methodOptions}>
            {CONFIG_METHOD_OPTIONS.map((option) => (
              <Pressable
                key={option.value}
                style={[
                  styles.methodOption,
                  { backgroundColor: colors.bgCard, borderColor: colors.border },
                  formData.config_method === option.value && { backgroundColor: colors.bgCard, borderColor: colors.accentBlue },
                ]}
                onPress={() =>
                  setFormData((prev) => ({
                    ...prev,
                    config_method: option.value as 'tftp' | 'http' | 'both',
                  }))
                }
              >
                <Text
                  style={[
                    styles.methodOptionLabel,
                    { color: colors.textPrimary },
                    formData.config_method === option.value && { color: colors.accentBlue },
                  ]}
                >
                  {option.label}
                </Text>
                <Text style={[styles.methodOptionDesc, { color: colors.textMuted }]}>{option.description}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    paddingBottom: 8,
    alignItems: 'center',
  },
  countText: {
    fontSize: 13,
    marginLeft: 'auto',
  },
  errorCard: {
    marginHorizontal: 16,
    marginBottom: 8,
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
    borderColor: 'rgba(255, 107, 107, 0.3)',
  },
  errorContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  errorText: {
    fontSize: 13,
    flex: 1,
  },
  listContent: {
    paddingBottom: 16,
  },
  emptyList: {
    flex: 1,
    justifyContent: 'center',
  },
  containerCard: {
    marginHorizontal: 16,
    marginBottom: 8,
  },
  containerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  containerInfo: {
    flex: 1,
  },
  hostname: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  mac: {
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusRunning: {
    backgroundColor: 'rgba(74, 222, 128, 0.2)',
  },
  statusStopped: {
    backgroundColor: 'rgba(255, 107, 107, 0.2)',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  containerDetails: {
    gap: 6,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    fontSize: 13,
  },
  containerActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 8,
  },
  infoCard: {
    margin: 16,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  infoText: {
    fontSize: 13,
    lineHeight: 18,
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    marginBottom: 8,
  },
  input: {
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
  },
  macInputRow: {
    flexDirection: 'row',
    gap: 8,
  },
  macInput: {
    flex: 1,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  generateButton: {
    borderRadius: 8,
    padding: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  methodOptions: {
    gap: 8,
  },
  methodOption: {
    borderRadius: 8,
    padding: 12,
    borderWidth: 2,
  },
  methodOptionLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 2,
  },
  methodOptionDesc: {
    fontSize: 11,
  },
});
