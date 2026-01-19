import { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Platform,
  ScrollView,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import type { DhcpOption, DhcpOptionFormData, DhcpOptionType } from '../core';
import { getVendorSelectOptions, getVendorName, COMMON_DHCP_OPTIONS, useDhcpOptions } from '../core';
import {
  Card,
  Button,
  EmptyState,
  FormModal,
  FormInput,
  CardActions,
  ThemedSwitch,
  LoadingState,
  ErrorState,
} from '../components';
import { confirmDelete, confirmReset, showError } from '../utils/alerts';

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

  // Show messages - handled by hook's notification system

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

  const vendorOptions = getVendorSelectOptions();

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
      showError('Option name is required');
      return;
    }
    if (formData.option_number < 1 || formData.option_number > 255) {
      showError('Option number must be between 1 and 255');
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
    confirmDelete({
      itemName: option.name,
      itemType: 'DHCP option',
      onConfirm: async () => {
        await deleteOption(option.id);
      },
    });
  };

  const handleToggle = async (id: string) => {
    const option = options.find((o) => o.id === id);
    if (option) {
      await updateOption(id, { ...option, enabled: !option.enabled });
    }
  };

  const handleReset = () => {
    confirmReset({
      message: 'Reset all DHCP options to defaults? This cannot be undone.',
      onConfirm: async () => {
        // Delete all existing options
        for (const option of options) {
          await deleteOption(option.id);
        }
        // Create default options
        for (const option of DEFAULT_OPTIONS) {
          await createOption(option);
        }
      },
    });
  };

  const renderOption = ({ item }: { item: DhcpOption }) => (
    <Card style={[styles.optionCard, !item.enabled && styles.optionDisabled]}>
      <View style={styles.optionHeader}>
        <View>
          <Text style={styles.optionNumber}>Option {item.option_number}</Text>
          <Text style={styles.optionName}>{item.name}</Text>
        </View>
        <ThemedSwitch
          value={item.enabled}
          onValueChange={() => handleToggle(item.id)}
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
      <CardActions
        onEdit={() => handleEdit(item)}
        onDelete={() => handleDelete(item)}
      />
    </Card>
  );

  const renderSection = (title: string, data: DhcpOption[]) => (
    <View key={title}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {data.map((item) => renderOption({ item }))}
    </View>
  );

  if (loading) {
    return <LoadingState message="Loading DHCP options..." />;
  }

  if (error) {
    return <ErrorState message={error} />;
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
            {vendorOptions.filter((v) => v.value !== '').map((v) => (
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
      <FormModal
        visible={showForm}
        onClose={handleCloseForm}
        onSubmit={handleSubmit}
        title="DHCP Option"
        isEditing={!!editingOption}
        size="large"
      >
        <View style={styles.formRow}>
          <View style={[styles.formGroup, { flex: 1 }]}>
            <FormInput
              label="Option Number *"
              value={formData.option_number.toString()}
              onChangeText={(text) =>
                setFormData((prev) => ({ ...prev, option_number: parseInt(text, 10) || 0 }))
              }
              placeholder="66"
              keyboardType="number-pad"
            />
          </View>
          <View style={[styles.formGroup, { flex: 2 }]}>
            <FormInput
              label="Name *"
              value={formData.name}
              onChangeText={(text) => setFormData((prev) => ({ ...prev, name: text }))}
              placeholder="TFTP Server"
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
                {vendorOptions.filter((v) => v.value !== '').map((v) => (
                  <Picker.Item key={v.value} label={v.label} value={v.value} />
                ))}
              </Picker>
            </View>
          </View>
        </View>

        <FormInput
          label="Value"
          value={formData.value}
          onChangeText={(text) => setFormData((prev) => ({ ...prev, value: text }))}
          placeholder="192.168.1.100 or ${tftp_server_ip}"
        />

        <FormInput
          label="Description"
          value={formData.description}
          onChangeText={(text) => setFormData((prev) => ({ ...prev, description: text }))}
          placeholder="Optional description"
        />

        <View style={styles.switchRow}>
          <Text style={styles.label}>Enabled</Text>
          <ThemedSwitch
            value={formData.enabled}
            onValueChange={(value) => setFormData((prev) => ({ ...prev, enabled: value }))}
          />
        </View>
      </FormModal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f1a',
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
});
