import { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  TextInput,
  Modal,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Switch,
  ActivityIndicator,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import type { DhcpOption, DhcpOptionFormData, DhcpOptionType } from '../core';
import { DEVICE_VENDORS, COMMON_DHCP_OPTIONS, useDhcpOptions } from '../core';
import { Card, Button, IconButton, EmptyState } from '../components';

const OPTION_TYPES: { value: DhcpOptionType; label: string }[] = [
  { value: 'string', label: 'String' },
  { value: 'ip', label: 'IP Address' },
  { value: 'hex', label: 'Hex' },
  { value: 'number', label: 'Number' },
];

const DEFAULT_OPTIONS: Omit<DhcpOption, 'created_at' | 'updated_at'>[] = [
  {
    id: 'tftp-server',
    option_number: 66,
    name: 'TFTP Server',
    value: '${tftp_server_ip}',
    type: 'ip',
    description: 'TFTP server for config files',
    enabled: true,
  },
  {
    id: 'bootfile-cisco',
    option_number: 67,
    name: 'Cisco Bootfile',
    value: 'network-confg',
    type: 'string',
    vendor_id: 'cisco',
    description: 'Cisco IOS config filename',
    enabled: true,
  },
  {
    id: 'bootfile-arista',
    option_number: 67,
    name: 'Arista Bootfile',
    value: 'startup-config',
    type: 'string',
    vendor_id: 'arista',
    description: 'Arista EOS config filename',
    enabled: true,
  },
  {
    id: 'tftp-cisco-150',
    option_number: 150,
    name: 'Cisco TFTP (Option 150)',
    value: '${tftp_server_ip}',
    type: 'ip',
    vendor_id: 'cisco',
    description: 'Cisco-specific TFTP server option',
    enabled: true,
  },
];

const emptyFormData: DhcpOptionFormData = {
  id: '',
  option_number: 0,
  name: '',
  value: '',
  type: 'string',
  vendor_id: '',
  description: '',
  enabled: true,
};

export function DhcpOptionsScreen() {
  const [filterVendor, setFilterVendor] = useState('');
  const {
    options,
    loading,
    error,
    createOption,
    updateOption,
    deleteOption,
    message,
  } = useDhcpOptions({ vendorFilter: filterVendor || 'all' });

  const [showForm, setShowForm] = useState(false);
  const [editingOption, setEditingOption] = useState<DhcpOption | null>(null);
  const [formData, setFormData] = useState<DhcpOptionFormData>(emptyFormData);

  // Show messages
  if (message) {
    Alert.alert(
      message.type === 'error' ? 'Error' : 'Success',
      message.text
    );
  }

  // Filter options by vendor (client-side for immediate UI response)
  const filteredOptions = useMemo(() => {
    if (!filterVendor) return options;
    return options.filter((opt) => !opt.vendor_id || opt.vendor_id === filterVendor);
  }, [options, filterVendor]);

  // Group options
  const groupedOptions = useMemo(() => {
    const global = filteredOptions.filter((opt) => !opt.vendor_id);
    const byVendor: Record<string, DhcpOption[]> = {};

    filteredOptions
      .filter((opt) => opt.vendor_id)
      .forEach((opt) => {
        const vendor = opt.vendor_id!;
        if (!byVendor[vendor]) byVendor[vendor] = [];
        byVendor[vendor].push(opt);
      });

    return { global, byVendor };
  }, [filteredOptions]);

  const getVendorName = (vendorId: string) => {
    return DEVICE_VENDORS.find((v) => v.value === vendorId)?.label || vendorId;
  };

  const handleEdit = (option: DhcpOption) => {
    setEditingOption(option);
    setFormData({
      id: option.id,
      option_number: option.option_number,
      name: option.name,
      value: option.value,
      type: option.type,
      vendor_id: option.vendor_id || '',
      description: option.description || '',
      enabled: option.enabled,
    });
    setShowForm(true);
  };

  const handleAdd = () => {
    setEditingOption(null);
    setFormData(emptyFormData);
    setShowForm(true);
  };

  const handleAddCommon = (common: (typeof COMMON_DHCP_OPTIONS)[number]) => {
    setEditingOption(null);
    setFormData({
      ...emptyFormData,
      option_number: common.number,
      name: common.name,
      description: common.description,
    });
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingOption(null);
    setFormData(emptyFormData);
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      Alert.alert('Error', 'Option name is required');
      return;
    }
    if (formData.option_number < 1 || formData.option_number > 255) {
      Alert.alert('Error', 'Option number must be between 1 and 255');
      return;
    }

    const optionData = {
      id: formData.id || `opt-${Date.now()}`,
      option_number: formData.option_number,
      name: formData.name,
      value: formData.value,
      type: formData.type,
      vendor_id: formData.vendor_id || undefined,
      description: formData.description || undefined,
      enabled: formData.enabled,
    };

    const success = editingOption
      ? await updateOption(editingOption.id, optionData)
      : await createOption(optionData);

    if (success) {
      handleCloseForm();
    }
  };

  const handleDelete = (option: DhcpOption) => {
    Alert.alert(
      'Delete DHCP Option',
      `Are you sure you want to delete "${option.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteOption(option.id);
          },
        },
      ]
    );
  };

  const handleToggle = async (id: string) => {
    const option = options.find((o) => o.id === id);
    if (option) {
      await updateOption(id, { ...option, enabled: !option.enabled });
    }
  };

  const handleReset = () => {
    Alert.alert(
      'Reset DHCP Options',
      'Reset all DHCP options to defaults?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            // Delete all existing options
            for (const option of options) {
              await deleteOption(option.id);
            }
            // Create default options
            for (const option of DEFAULT_OPTIONS) {
              await createOption(option);
            }
          },
        },
      ]
    );
  };

  const renderOption = ({ item }: { item: DhcpOption }) => (
    <Card style={[styles.optionCard, !item.enabled && styles.optionDisabled]}>
      <View style={styles.optionHeader}>
        <View>
          <Text style={styles.optionNumber}>Option {item.option_number}</Text>
          <Text style={styles.optionName}>{item.name}</Text>
        </View>
        <Switch
          value={item.enabled}
          onValueChange={() => handleToggle(item.id)}
          trackColor={{ false: '#333', true: 'rgba(74, 158, 255, 0.5)' }}
          thumbColor={item.enabled ? '#4a9eff' : '#888'}
        />
      </View>
      <View style={styles.optionDetails}>
        <Text style={styles.detailLabel}>Value:</Text>
        <Text style={styles.detailValue}>{item.value || '(empty)'}</Text>
      </View>
      <View style={styles.optionDetails}>
        <Text style={styles.detailLabel}>Type:</Text>
        <Text style={styles.detailValue}>{item.type}</Text>
      </View>
      {item.description && (
        <Text style={styles.description}>{item.description}</Text>
      )}
      <View style={styles.optionActions}>
        <IconButton icon="edit" onPress={() => handleEdit(item)} />
        <IconButton icon="delete" onPress={() => handleDelete(item)} />
      </View>
    </Card>
  );

  const renderSection = (title: string, data: DhcpOption[]) => (
    <View key={title}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {data.map((item) => renderOption({ item }))}
    </View>
  );

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#4a9eff" />
        <Text style={styles.loadingText}>Loading DHCP options...</Text>
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
        <Button title="Add Option" onPress={handleAdd} icon="add" />
        <Button title="Reset" onPress={handleReset} variant="secondary" />
      </View>

      {/* Filter */}
      <View style={styles.filterContainer}>
        <Text style={styles.filterLabel}>Filter by Vendor:</Text>
        <View style={styles.pickerWrapper}>
          <Picker
            selectedValue={filterVendor}
            onValueChange={setFilterVendor}
            style={styles.picker}
            dropdownIconColor="#4a9eff"
          >
            <Picker.Item label="All Vendors" value="" />
            {DEVICE_VENDORS.filter((v) => v.value !== '').map((v) => (
              <Picker.Item key={v.value} label={v.label} value={v.value} />
            ))}
          </Picker>
        </View>
      </View>

      {/* Quick Add */}
      <Card style={styles.quickAddCard}>
        <Text style={styles.quickAddTitle}>Quick Add Common Options</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.quickAddButtons}>
            {COMMON_DHCP_OPTIONS.map((common, idx) => (
              <Pressable
                key={`${common.number}-${idx}`}
                style={styles.quickAddButton}
                onPress={() => handleAddCommon(common)}
              >
                <Text style={styles.quickAddButtonText}>
                  {common.number}: {common.name}
                </Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>
      </Card>

      <ScrollView style={styles.optionsList}>
        {groupedOptions.global.length > 0 &&
          renderSection('Global Options (All Vendors)', groupedOptions.global)}

        {Object.entries(groupedOptions.byVendor).map(([vendorId, vendorOptions]) =>
          renderSection(`${getVendorName(vendorId)} Options`, vendorOptions)
        )}

        {filteredOptions.length === 0 && (
          <EmptyState
            message="No DHCP options configured"
            actionLabel="Add Option"
            onAction={handleAdd}
          />
        )}
      </ScrollView>

      {/* Form Modal */}
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
                {editingOption ? 'Edit DHCP Option' : 'Add DHCP Option'}
              </Text>
              <Pressable onPress={handleCloseForm}>
                <Text style={styles.closeButton}>✕</Text>
              </Pressable>
            </View>

            <ScrollView style={styles.formScroll} keyboardShouldPersistTaps="handled">
              <View style={styles.formRow}>
                <View style={[styles.formGroup, { flex: 1 }]}>
                  <Text style={styles.label}>Option Number *</Text>
                  <TextInput
                    style={styles.input}
                    value={formData.option_number.toString()}
                    onChangeText={(text) =>
                      setFormData((prev) => ({ ...prev, option_number: parseInt(text, 10) || 0 }))
                    }
                    placeholder="66"
                    placeholderTextColor="#666"
                    keyboardType="number-pad"
                  />
                </View>
                <View style={[styles.formGroup, { flex: 2 }]}>
                  <Text style={styles.label}>Name *</Text>
                  <TextInput
                    style={styles.input}
                    value={formData.name}
                    onChangeText={(text) => setFormData((prev) => ({ ...prev, name: text }))}
                    placeholder="TFTP Server"
                    placeholderTextColor="#666"
                  />
                </View>
              </View>

              <View style={styles.formRow}>
                <View style={[styles.formGroup, { flex: 1 }]}>
                  <Text style={styles.label}>Type</Text>
                  <View style={styles.pickerWrapper}>
                    <Picker
                      selectedValue={formData.type}
                      onValueChange={(value) => setFormData((prev) => ({ ...prev, type: value }))}
                      style={styles.formPicker}
                    >
                      {OPTION_TYPES.map((t) => (
                        <Picker.Item key={t.value} label={t.label} value={t.value} />
                      ))}
                    </Picker>
                  </View>
                </View>
                <View style={[styles.formGroup, { flex: 1 }]}>
                  <Text style={styles.label}>Vendor</Text>
                  <View style={styles.pickerWrapper}>
                    <Picker
                      selectedValue={formData.vendor_id}
                      onValueChange={(value) => setFormData((prev) => ({ ...prev, vendor_id: value }))}
                      style={styles.formPicker}
                    >
                      <Picker.Item label="All Vendors" value="" />
                      {DEVICE_VENDORS.filter((v) => v.value !== '').map((v) => (
                        <Picker.Item key={v.value} label={v.label} value={v.value} />
                      ))}
                    </Picker>
                  </View>
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Value</Text>
                <TextInput
                  style={styles.input}
                  value={formData.value}
                  onChangeText={(text) => setFormData((prev) => ({ ...prev, value: text }))}
                  placeholder="192.168.1.100 or ${tftp_server_ip}"
                  placeholderTextColor="#666"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Description</Text>
                <TextInput
                  style={styles.input}
                  value={formData.description}
                  onChangeText={(text) => setFormData((prev) => ({ ...prev, description: text }))}
                  placeholder="Optional description"
                  placeholderTextColor="#666"
                />
              </View>

              <View style={styles.switchRow}>
                <Text style={styles.label}>Enabled</Text>
                <Switch
                  value={formData.enabled}
                  onValueChange={(value) => setFormData((prev) => ({ ...prev, enabled: value }))}
                  trackColor={{ false: '#333', true: 'rgba(74, 158, 255, 0.5)' }}
                  thumbColor={formData.enabled ? '#4a9eff' : '#888'}
                />
              </View>
            </ScrollView>

            <View style={styles.modalActions}>
              <Button title="Cancel" onPress={handleCloseForm} variant="secondary" />
              <Button title={editingOption ? 'Update' : 'Add'} onPress={handleSubmit} />
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
    paddingBottom: 8,
  },
  filterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 8,
    gap: 12,
  },
  filterLabel: {
    color: '#888',
    fontSize: 13,
  },
  pickerWrapper: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    overflow: 'hidden',
    flex: 1,
  },
  picker: {
    color: '#fff',
    height: 40,
  },
  quickAddCard: {
    marginHorizontal: 16,
    marginBottom: 12,
  },
  quickAddTitle: {
    color: '#888',
    fontSize: 13,
    marginBottom: 12,
  },
  quickAddButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  quickAddButton: {
    backgroundColor: 'rgba(74, 158, 255, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(74, 158, 255, 0.3)',
  },
  quickAddButtonText: {
    color: '#4a9eff',
    fontSize: 12,
  },
  optionsList: {
    flex: 1,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  optionCard: {
    marginHorizontal: 16,
    marginBottom: 8,
  },
  optionDisabled: {
    opacity: 0.5,
  },
  optionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  optionNumber: {
    color: '#4a9eff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  optionName: {
    color: '#fff',
    fontSize: 13,
  },
  optionDetails: {
    flexDirection: 'row',
    marginBottom: 2,
  },
  detailLabel: {
    color: '#888',
    fontSize: 12,
    width: 50,
  },
  detailValue: {
    color: '#fff',
    fontSize: 12,
    flex: 1,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  description: {
    color: '#666',
    fontSize: 11,
    marginTop: 4,
    fontStyle: 'italic',
  },
  optionActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 8,
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
    maxHeight: '85%',
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
  formRow: {
    flexDirection: 'row',
    gap: 12,
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
  formPicker: {
    color: '#fff',
    height: 44,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
});
