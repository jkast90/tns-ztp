import { useState, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Alert,
  TextInput,
  Modal,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import type { Vendor, VendorFormData } from '../core';
import { DEVICE_VENDORS, useDevices, useVendors } from '../core';
import { Card, Button, IconButton, EmptyState } from '../components';

function getDefaultBackupCommand(vendorId: string): string {
  switch (vendorId) {
    case 'cisco':
      return 'show running-config';
    case 'juniper':
      return 'show configuration | display set';
    case 'arista':
      return 'show running-config';
    case 'opengear':
      return 'config export';
    case 'fortinet':
      return 'show full-configuration';
    case 'paloalto':
      return 'show config running';
    case 'mikrotik':
      return '/export';
    default:
      return 'show running-config';
  }
}

const DEFAULT_VENDORS: Omit<Vendor, 'created_at' | 'updated_at'>[] = DEVICE_VENDORS
  .filter((v) => v.value !== '')
  .map((v) => ({
    id: v.value,
    name: v.label,
    backup_command: getDefaultBackupCommand(v.value),
    ssh_port: 22,
  }));

const emptyFormData: VendorFormData = {
  id: '',
  name: '',
  backup_command: 'show running-config',
  ssh_port: 22,
};

export function VendorsScreen() {
  const {
    vendors,
    loading,
    error,
    createVendor,
    updateVendor,
    deleteVendor,
    message,
  } = useVendors();

  const [showForm, setShowForm] = useState(false);
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);
  const [formData, setFormData] = useState<VendorFormData>(emptyFormData);
  const { devices } = useDevices();

  // Show messages
  if (message) {
    Alert.alert(
      message.type === 'error' ? 'Error' : 'Success',
      message.text
    );
  }

  // Calculate device counts per vendor
  const vendorStats = useMemo(() => {
    const stats: Record<string, number> = {};
    devices.forEach((device) => {
      const vendor = device.vendor || 'unassigned';
      stats[vendor] = (stats[vendor] || 0) + 1;
    });
    return stats;
  }, [devices]);

  const vendorsWithStats = useMemo(() => {
    return vendors.map((v) => ({
      ...v,
      device_count: v.device_count || vendorStats[v.id] || 0,
    }));
  }, [vendors, vendorStats]);

  const handleEdit = (vendor: Vendor) => {
    setEditingVendor(vendor);
    setFormData({
      id: vendor.id,
      name: vendor.name,
      backup_command: vendor.backup_command,
      ssh_port: vendor.ssh_port,
    });
    setShowForm(true);
  };

  const handleAdd = () => {
    setEditingVendor(null);
    setFormData(emptyFormData);
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingVendor(null);
    setFormData(emptyFormData);
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      Alert.alert('Error', 'Vendor name is required');
      return;
    }

    const success = editingVendor
      ? await updateVendor(editingVendor.id, formData)
      : await createVendor({
          ...formData,
          id: formData.id || formData.name.toLowerCase().replace(/[^a-z0-9]/g, '-'),
        });

    if (success) {
      handleCloseForm();
    }
  };

  const handleDelete = (vendor: Vendor & { device_count: number }) => {
    if (vendor.device_count > 0) {
      Alert.alert('Cannot Delete', 'This vendor has devices assigned to it.');
      return;
    }

    Alert.alert(
      'Delete Vendor',
      `Are you sure you want to delete "${vendor.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteVendor(vendor.id);
          },
        },
      ]
    );
  };

  const handleReset = () => {
    Alert.alert(
      'Reset Vendors',
      'Reset all vendors to defaults? This will remove any custom vendors.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            // Delete all vendors without devices
            for (const vendor of vendors) {
              if ((vendor.device_count || 0) === 0) {
                await deleteVendor(vendor.id);
              }
            }
            // Create default vendors
            for (const vendor of DEFAULT_VENDORS) {
              const exists = vendors.find((v) => v.id === vendor.id);
              if (!exists) {
                await createVendor(vendor);
              }
            }
          },
        },
      ]
    );
  };

  const renderVendor = ({ item }: { item: Vendor & { device_count: number } }) => (
    <Card style={styles.vendorCard}>
      <View style={styles.vendorHeader}>
        <Text style={styles.vendorName}>{item.name}</Text>
        <View style={styles.deviceCount}>
          <Text style={[styles.deviceCountText, item.device_count > 0 && styles.deviceCountActive]}>
            {item.device_count} devices
          </Text>
        </View>
      </View>
      <View style={styles.vendorDetails}>
        <Text style={styles.detailLabel}>Backup Command:</Text>
        <Text style={styles.detailValue}>{item.backup_command}</Text>
      </View>
      <View style={styles.vendorDetails}>
        <Text style={styles.detailLabel}>SSH Port:</Text>
        <Text style={styles.detailValue}>{item.ssh_port}</Text>
      </View>
      <View style={styles.vendorActions}>
        <IconButton icon="edit" onPress={() => handleEdit(item)} />
        <IconButton
          icon="delete"
          onPress={() => handleDelete(item)}
          disabled={item.device_count > 0}
        />
      </View>
    </Card>
  );

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#4a9eff" />
        <Text style={styles.loadingText}>Loading vendors...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.errorText}>{error}</Text>
        <Button title="Retry" onPress={() => {}} variant="secondary" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.actions}>
        <Button title="Add Vendor" onPress={handleAdd} icon="add" />
        <Button title="Reset" onPress={handleReset} variant="secondary" />
      </View>

      <FlatList
        data={vendorsWithStats}
        keyExtractor={(item) => item.id}
        renderItem={renderVendor}
        ListEmptyComponent={
          <EmptyState
            message="No vendors configured"
            actionLabel="Add Vendor"
            onAction={handleAdd}
          />
        }
        contentContainerStyle={vendors.length === 0 ? styles.emptyList : undefined}
      />

      <Modal
        visible={showForm}
        animationType="slide"
        transparent
        onRequestClose={handleCloseForm}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
        >
          <Pressable style={styles.modalBackdrop} onPress={handleCloseForm} />
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingVendor ? 'Edit Vendor' : 'Add Vendor'}
              </Text>
              <Pressable onPress={handleCloseForm}>
                <Text style={styles.closeButton}>✕</Text>
              </Pressable>
            </View>

            <ScrollView style={styles.formScroll} keyboardShouldPersistTaps="handled">
              <View style={styles.formGroup}>
                <Text style={styles.label}>Vendor Name *</Text>
                <TextInput
                  style={styles.input}
                  value={formData.name}
                  onChangeText={(text) => setFormData((prev) => ({ ...prev, name: text }))}
                  placeholder="Acme Networks"
                  placeholderTextColor="#666"
                  editable={!editingVendor}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Vendor ID</Text>
                <TextInput
                  style={styles.input}
                  value={formData.id}
                  onChangeText={(text) => setFormData((prev) => ({ ...prev, id: text }))}
                  placeholder="acme (auto-generated)"
                  placeholderTextColor="#666"
                  editable={!editingVendor}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Backup Command *</Text>
                <TextInput
                  style={styles.input}
                  value={formData.backup_command}
                  onChangeText={(text) => setFormData((prev) => ({ ...prev, backup_command: text }))}
                  placeholder="show running-config"
                  placeholderTextColor="#666"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>SSH Port</Text>
                <TextInput
                  style={styles.input}
                  value={formData.ssh_port.toString()}
                  onChangeText={(text) =>
                    setFormData((prev) => ({ ...prev, ssh_port: parseInt(text, 10) || 22 }))
                  }
                  placeholder="22"
                  placeholderTextColor="#666"
                  keyboardType="number-pad"
                />
              </View>
            </ScrollView>

            <View style={styles.modalActions}>
              <Button title="Cancel" onPress={handleCloseForm} variant="secondary" />
              <Button title={editingVendor ? 'Update' : 'Add'} onPress={handleSubmit} />
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f1a',
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#888',
    marginTop: 12,
  },
  errorText: {
    color: '#ff6b6b',
    marginBottom: 12,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
  },
  vendorCard: {
    marginHorizontal: 16,
    marginBottom: 12,
  },
  vendorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  vendorName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  deviceCount: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  deviceCountText: {
    fontSize: 12,
    color: '#888',
  },
  deviceCountActive: {
    color: '#4a9eff',
  },
  vendorDetails: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  detailLabel: {
    color: '#888',
    fontSize: 13,
    width: 120,
  },
  detailValue: {
    color: '#fff',
    fontSize: 13,
    flex: 1,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  vendorActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 12,
  },
  emptyList: {
    flex: 1,
    justifyContent: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    flex: 1,
  },
  modalContent: {
    backgroundColor: '#1a1a2e',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  closeButton: {
    fontSize: 20,
    color: '#888',
    padding: 4,
  },
  formScroll: {
    padding: 16,
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    color: '#888',
    fontSize: 13,
    marginBottom: 8,
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
    padding: 12,
    color: '#fff',
    fontSize: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
});
