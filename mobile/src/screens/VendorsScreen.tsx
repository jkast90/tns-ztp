import { useState, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TextInput,
  Platform,
} from 'react-native';
import type { Vendor, VendorFormData } from '../core';
import { getVendorSelectOptions, useDevices, useVendors, EMPTY_VENDOR_FORM } from '../core';
import {
  Card,
  Button,
  EmptyState,
  LoadingState,
  ErrorState,
  CardActions,
  FormModal,
  FormInput,
} from '../components';
import { confirmDelete, confirmReset, showError } from '../utils';
import { useAppTheme } from '../context';

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

const DEFAULT_VENDORS: Omit<Vendor, 'created_at' | 'updated_at'>[] = getVendorSelectOptions()
  .filter((v) => v.value !== '')
  .map((v) => ({
    id: v.value,
    name: v.label,
    backup_command: getDefaultBackupCommand(v.value),
    ssh_port: 22,
    mac_prefixes: [],
  }));

export function VendorsScreen() {
  const { colors } = useAppTheme();
  const {
    vendors,
    loading,
    error,
    createVendor,
    updateVendor,
    deleteVendor,
    refresh,
  } = useVendors();

  const [showForm, setShowForm] = useState(false);
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);
  const [formData, setFormData] = useState<VendorFormData>(EMPTY_VENDOR_FORM);
  const { devices } = useDevices();

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
      mac_prefixes: vendor.mac_prefixes || [],
      vendor_class: vendor.vendor_class || '',
      default_template: vendor.default_template || '',
    });
    setShowForm(true);
  };

  const handleAdd = () => {
    setEditingVendor(null);
    setFormData(EMPTY_VENDOR_FORM);
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingVendor(null);
    setFormData(EMPTY_VENDOR_FORM);
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      showError('Vendor name is required');
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
      showError('This vendor has devices assigned to it.', 'Cannot Delete');
      return;
    }

    confirmDelete({
      itemName: vendor.name,
      itemType: 'vendor',
      onConfirm: async () => {
        await deleteVendor(vendor.id);
      },
    });
  };

  const handleReset = () => {
    confirmReset({
      title: 'Reset Vendors',
      message: 'Reset all vendors to defaults? This will remove any custom vendors.',
      onConfirm: async () => {
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
    });
  };

  const renderVendor = ({ item }: { item: Vendor & { device_count: number } }) => (
    <Card style={styles.vendorCard}>
      <View style={styles.vendorHeader}>
        <Text style={[styles.vendorName, { color: colors.textPrimary }]}>{item.name}</Text>
        <View style={[styles.deviceCount, { backgroundColor: colors.bgSecondary }]}>
          <Text style={[styles.deviceCountText, { color: item.device_count > 0 ? colors.accentBlue : colors.textMuted }]}>
            {item.device_count} devices
          </Text>
        </View>
      </View>
      <View style={styles.vendorDetails}>
        <Text style={[styles.detailLabel, { color: colors.textMuted }]}>Backup Command:</Text>
        <Text style={[styles.detailValue, { color: colors.textPrimary }]}>{item.backup_command}</Text>
      </View>
      <View style={styles.vendorDetails}>
        <Text style={[styles.detailLabel, { color: colors.textMuted }]}>SSH Port:</Text>
        <Text style={[styles.detailValue, { color: colors.textPrimary }]}>{item.ssh_port}</Text>
      </View>
      <CardActions
        onEdit={() => handleEdit(item)}
        onDelete={() => handleDelete(item)}
        deleteDisabled={item.device_count > 0}
      />
    </Card>
  );

  if (loading) {
    return <LoadingState message="Loading vendors..." />;
  }

  if (error) {
    return (
      <ErrorState
        title="Error"
        message={error}
        primaryAction={{ label: 'Retry', onPress: refresh }}
      />
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.bgPrimary }]}>
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

      <FormModal
        visible={showForm}
        onClose={handleCloseForm}
        onSubmit={handleSubmit}
        title={editingVendor ? 'Edit Vendor' : 'Add Vendor'}
        isEditing={!!editingVendor}
        size="medium"
      >
        <FormInput
          label="Vendor Name *"
          value={formData.name}
          onChangeText={(text) => setFormData((prev) => ({ ...prev, name: text }))}
          placeholder="Acme Networks"
          editable={!editingVendor}
        />

        <FormInput
          label="Vendor ID"
          value={formData.id}
          onChangeText={(text) => setFormData((prev) => ({ ...prev, id: text }))}
          placeholder="acme (auto-generated)"
          editable={!editingVendor}
        />

        <FormInput
          label="Backup Command *"
          value={formData.backup_command}
          onChangeText={(text) => setFormData((prev) => ({ ...prev, backup_command: text }))}
          placeholder="show running-config"
        />

        <FormInput
          label="SSH Port"
          value={formData.ssh_port.toString()}
          onChangeText={(text) =>
            setFormData((prev) => ({ ...prev, ssh_port: parseInt(text, 10) || 22 }))
          }
          placeholder="22"
          keyboardType="number-pad"
        />
      </FormModal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  },
  deviceCount: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  deviceCountText: {
    fontSize: 12,
  },
  vendorDetails: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  detailLabel: {
    fontSize: 13,
    width: 120,
  },
  detailValue: {
    fontSize: 13,
    flex: 1,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  emptyList: {
    flex: 1,
    justifyContent: 'center',
  },
});
