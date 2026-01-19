import { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
  Modal,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Picker } from '@react-native-picker/picker';
import { MaterialIcons } from '@expo/vector-icons';
import type { Template, TemplateFormData } from '../core';
import { useTemplates, useVendors, useDevices, getVendorName, EMPTY_TEMPLATE_FORM, MONOSPACE_FONT } from '../core';
import {
  Card,
  Button,
  EmptyState,
  FormModal,
  FormInput,
  CardActions,
  LoadingState,
  ErrorState,
  ModalHeader,
  InfoRow,
  CodePreview,
} from '../components';
import { useAppTheme } from '../context';
import { confirmDelete, showError, showInfo } from '../utils/alerts';

export function TemplatesScreen() {
  const { colors } = useAppTheme();
  const navigation = useNavigation();
  const {
    templates,
    loading,
    error,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    previewTemplate: generatePreview,
    message,
  } = useTemplates();

  const { vendors } = useVendors();
  const { devices } = useDevices();

  const [showForm, setShowForm] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [formData, setFormData] = useState<TemplateFormData>(EMPTY_TEMPLATE_FORM);
  const [filterVendor, setFilterVendor] = useState('');

  // Preview state
  const [showPreview, setShowPreview] = useState(false);
  const [previewTemplateItem, setPreviewTemplateItem] = useState<Template | null>(null);
  const [previewDeviceMAC, setPreviewDeviceMAC] = useState<string>('');
  const [previewOutput, setPreviewOutput] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  // Show messages - handled by hook's notification system

  // Filter templates by vendor
  const filteredTemplates = useMemo(() => {
    if (!filterVendor) return templates;
    if (filterVendor === 'global') return templates.filter((t) => !t.vendor_id);
    return templates.filter((t) => !t.vendor_id || t.vendor_id === filterVendor);
  }, [templates, filterVendor]);

  // Group templates by vendor
  const groupedTemplates = useMemo(() => {
    const global = filteredTemplates.filter((t) => !t.vendor_id);
    const byVendor: Record<string, Template[]> = {};

    filteredTemplates
      .filter((t) => t.vendor_id)
      .forEach((t) => {
        const vendor = t.vendor_id!;
        if (!byVendor[vendor]) byVendor[vendor] = [];
        byVendor[vendor].push(t);
      });

    return { global, byVendor };
  }, [filteredTemplates]);

  const vendorSelectOptions = useMemo(() => {
    return [
      { value: '', label: 'All Vendors' },
      { value: 'global', label: 'Global Only' },
      ...vendors.map((v) => ({ value: v.id, label: v.name })),
    ];
  }, [vendors]);

  // Device options for preview
  const deviceSelectOptions = useMemo(() => {
    return [
      { value: '', label: 'Select a device...' },
      ...devices.map((d) => ({
        value: d.mac,
        label: `${d.hostname} (${d.ip})`,
      })),
    ];
  }, [devices]);

  // Get selected device for preview
  const previewDevice = useMemo(() => {
    if (!previewDeviceMAC) return null;
    return devices.find((d) => d.mac === previewDeviceMAC) || null;
  }, [devices, previewDeviceMAC]);

  const handleOpenPreview = (template: Template) => {
    setPreviewTemplateItem(template);
    setPreviewDeviceMAC('');
    setPreviewOutput(null);
    setShowPreview(true);
  };

  const handleClosePreview = () => {
    setShowPreview(false);
    setPreviewTemplateItem(null);
    setPreviewDeviceMAC('');
    setPreviewOutput(null);
  };

  const handleGeneratePreview = async () => {
    if (!previewTemplateItem || !previewDevice) return;

    setPreviewLoading(true);
    const previewData = {
      device: {
        mac: previewDevice.mac,
        ip: previewDevice.ip,
        hostname: previewDevice.hostname,
        vendor: previewDevice.vendor,
        serial_number: previewDevice.serial_number,
      },
      subnet: '255.255.255.0',
      gateway: previewDevice.ip.replace(/\.\d+$/, '.1'),
    };

    const output = await generatePreview(previewTemplateItem.id, previewData);
    setPreviewLoading(false);
    if (output) {
      setPreviewOutput(output);
    }
  };

  const handleEdit = (template: Template) => {
    setEditingTemplate(template);
    setFormData({
      id: template.id,
      name: template.name,
      description: template.description || '',
      vendor_id: template.vendor_id || '',
      content: template.content,
    });
    setShowForm(true);
  };

  const handleAdd = () => {
    setEditingTemplate(null);
    setFormData(EMPTY_TEMPLATE_FORM);
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingTemplate(null);
    setFormData(EMPTY_TEMPLATE_FORM);
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      showError('Template name is required');
      return;
    }
    if (!formData.content.trim()) {
      showError('Template content is required');
      return;
    }

    const templateData = {
      id: formData.id || formData.name.toLowerCase().replace(/[^a-z0-9]/g, '-'),
      name: formData.name,
      description: formData.description || undefined,
      vendor_id: formData.vendor_id || undefined,
      content: formData.content,
    };

    const success = editingTemplate
      ? await updateTemplate(editingTemplate.id, templateData)
      : await createTemplate(templateData);

    if (success) {
      handleCloseForm();
    }
  };

  const handleDelete = (template: Template) => {
    if ((template.device_count || 0) > 0) {
      showInfo('This template is assigned to devices.', 'Cannot Delete');
      return;
    }

    confirmDelete({
      itemName: template.name,
      itemType: 'template',
      onConfirm: async () => {
        await deleteTemplate(template.id);
      },
    });
  };

  const renderTemplate = ({ item }: { item: Template }) => (
    <Card style={styles.templateCard}>
      <View style={styles.templateHeader}>
        <View style={styles.templateInfo}>
          <Text style={[styles.templateName, { color: colors.textPrimary }]}>{item.name}</Text>
          {item.vendor_id && (
            <View style={[styles.vendorBadge, { backgroundColor: `${colors.accentBlue}15` }]}>
              <Text style={[styles.vendorBadgeText, { color: colors.accentBlue }]}>
                {getVendorName(item.vendor_id, vendors)}
              </Text>
            </View>
          )}
        </View>
        {(item.device_count || 0) > 0 && (
          <View style={[styles.deviceCount, { backgroundColor: colors.bgSecondary }]}>
            <Text style={[styles.deviceCountText, { color: colors.textMuted }]}>
              {item.device_count} devices
            </Text>
          </View>
        )}
      </View>
      {item.description && (
        <Text style={[styles.description, { color: colors.textMuted }]}>{item.description}</Text>
      )}
      <View style={styles.contentPreview}>
        <Text style={[styles.contentLabel, { color: colors.textMuted }]}>Content Preview:</Text>
        <Text style={[styles.contentText, { color: colors.textSecondary }]} numberOfLines={3}>
          {item.content}
        </Text>
      </View>
      <View style={styles.cardActionsRow}>
        <Pressable
          style={[styles.previewButton, { backgroundColor: `${colors.accentCyan}15` }]}
          onPress={() => handleOpenPreview(item)}
        >
          <MaterialIcons name="visibility" size={16} color={colors.accentCyan} />
          <Text style={[styles.previewButtonText, { color: colors.accentCyan }]}>Preview</Text>
        </Pressable>
        <CardActions
          onEdit={() => handleEdit(item)}
          onDelete={() => handleDelete(item)}
          deleteDisabled={(item.device_count || 0) > 0}
        />
      </View>
    </Card>
  );

  const renderSection = (title: string, data: Template[]) => (
    <View key={title}>
      <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>{title}</Text>
      {data.map((item) => renderTemplate({ item }))}
    </View>
  );

  if (loading) {
    return <LoadingState message="Loading templates..." />;
  }

  if (error) {
    return <ErrorState message={error} />;
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.bgPrimary }]}>
      <View style={styles.actions}>
        <Button title="Add Template" onPress={handleAdd} icon="add" />
        <Button
          title="From Config"
          onPress={() => navigation.navigate('Templatizer' as never)}
          variant="secondary"
          icon="auto-fix-high"
        />
      </View>

      {/* Filter */}
      <View style={styles.filterContainer}>
        <Text style={[styles.filterLabel, { color: colors.textMuted }]}>Filter by Vendor:</Text>
        <View style={[styles.pickerWrapper, { backgroundColor: colors.bgSecondary, borderColor: colors.border }]}>
          <Picker
            selectedValue={filterVendor}
            onValueChange={setFilterVendor}
            style={[styles.picker, { color: colors.textPrimary }]}
            dropdownIconColor={colors.accentBlue}
          >
            {vendorSelectOptions.map((opt) => (
              <Picker.Item key={opt.value} label={opt.label} value={opt.value} />
            ))}
          </Picker>
        </View>
      </View>

      <ScrollView style={styles.templatesList}>
        {groupedTemplates.global.length > 0 &&
          renderSection('Global Templates (All Vendors)', groupedTemplates.global)}

        {Object.entries(groupedTemplates.byVendor).map(([vendorId, vendorTemplates]) =>
          renderSection(`${getVendorName(vendorId, vendors)} Templates`, vendorTemplates)
        )}

        {filteredTemplates.length === 0 && (
          <EmptyState
            message="No templates configured"
            actionLabel="Add Template"
            onAction={handleAdd}
          />
        )}
      </ScrollView>

      {/* Form Modal */}
      <FormModal
        visible={showForm}
        onClose={handleCloseForm}
        onSubmit={handleSubmit}
        title="Template"
        isEditing={!!editingTemplate}
        size="large"
      >
        <FormInput
          label="Template Name *"
          value={formData.name}
          onChangeText={(text) => setFormData((prev) => ({ ...prev, name: text }))}
          placeholder="My Template"
          editable={!editingTemplate}
        />

        <View style={styles.formGroup}>
          <Text style={[styles.label, { color: colors.textMuted }]}>Vendor (optional)</Text>
          <View style={[styles.pickerWrapper, { backgroundColor: colors.bgSecondary, borderColor: colors.border }]}>
            <Picker
              selectedValue={formData.vendor_id}
              onValueChange={(value) => setFormData((prev) => ({ ...prev, vendor_id: value }))}
              style={[styles.formPicker, { color: colors.textPrimary }]}
            >
              <Picker.Item label="All Vendors (Global)" value="" />
              {vendors.map((v) => (
                <Picker.Item key={v.id} label={v.name} value={v.id} />
              ))}
            </Picker>
          </View>
        </View>

        <FormInput
          label="Description"
          value={formData.description}
          onChangeText={(text) => setFormData((prev) => ({ ...prev, description: text }))}
          placeholder="Optional description"
        />

        <View style={styles.formGroup}>
          <Text style={[styles.label, { color: colors.textMuted }]}>Template Content *</Text>
          <TextInput
            style={[styles.contentInput, { backgroundColor: colors.bgSecondary, borderColor: colors.border, color: colors.textPrimary }]}
            value={formData.content}
            onChangeText={(text) => setFormData((prev) => ({ ...prev, content: text }))}
            placeholder="hostname {{hostname}}"
            placeholderTextColor={colors.textMuted}
            multiline
            numberOfLines={10}
            textAlignVertical="top"
          />
        </View>
      </FormModal>

      {/* Preview Modal */}
      <Modal
        visible={showPreview}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={handleClosePreview}
      >
        <View style={[styles.previewModal, { backgroundColor: colors.bgPrimary }]}>
          <ModalHeader
            title="Template Preview"
            subtitle={previewTemplateItem?.name}
            onClose={handleClosePreview}
          />

          <ScrollView style={styles.previewContent}>
            {/* Device selector */}
            <View style={styles.previewSection}>
              <Text style={[styles.previewLabel, { color: colors.textMuted }]}>Select Device</Text>
              <View style={[styles.pickerWrapper, { backgroundColor: colors.bgSecondary, borderColor: colors.border }]}>
                <Picker
                  selectedValue={previewDeviceMAC}
                  onValueChange={setPreviewDeviceMAC}
                  style={[styles.picker, { color: colors.textPrimary }]}
                  dropdownIconColor={colors.accentBlue}
                >
                  {deviceSelectOptions.map((opt) => (
                    <Picker.Item key={opt.value} label={opt.label} value={opt.value} />
                  ))}
                </Picker>
              </View>
              <Button
                title={previewLoading ? 'Generating...' : 'Generate'}
                onPress={handleGeneratePreview}
                disabled={!previewDeviceMAC || previewLoading}
                icon={previewLoading ? undefined : 'visibility'}
              />
            </View>

            {/* Selected device info */}
            {previewDevice && (
              <Card style={styles.previewDeviceCard}>
                <Text style={[styles.previewDeviceTitle, { color: colors.textMuted }]}>Device Info</Text>
                <View style={styles.previewDeviceGrid}>
                  <InfoRow label="Hostname" value={previewDevice.hostname} monospace />
                  <InfoRow label="MAC" value={previewDevice.mac} monospace />
                  <InfoRow label="IP" value={previewDevice.ip} monospace />
                  {previewDevice.vendor && (
                    <InfoRow label="Vendor" value={previewDevice.vendor} monospace />
                  )}
                  {previewDevice.serial_number && (
                    <InfoRow label="Serial" value={previewDevice.serial_number} monospace />
                  )}
                </View>
              </Card>
            )}

            {/* Loading indicator */}
            {previewLoading && (
              <View style={styles.previewLoadingContainer}>
                <ActivityIndicator size="large" color={colors.accentBlue} />
                <Text style={[styles.previewLoadingText, { color: colors.textMuted }]}>
                  Generating preview...
                </Text>
              </View>
            )}

            {/* Preview output */}
            {previewOutput && (
              <Card style={styles.previewOutputCard}>
                <CodePreview
                  content={previewOutput}
                  title="Generated Config"
                  maxHeight={300}
                />
              </Card>
            )}

            {/* Empty state */}
            {!previewOutput && !previewLoading && (
              <View style={styles.previewEmptyState}>
                <MaterialIcons name="visibility" size={48} color={colors.textMuted} />
                <Text style={[styles.previewEmptyText, { color: colors.textMuted }]}>
                  Select a device and click Generate to preview the configuration
                </Text>
              </View>
            )}
          </ScrollView>
        </View>
      </Modal>
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
    fontSize: 13,
  },
  pickerWrapper: {
    borderRadius: 8,
    borderWidth: 1,
    overflow: 'hidden',
    flex: 1,
  },
  picker: {
    height: 40,
  },
  templatesList: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  templateCard: {
    marginHorizontal: 16,
    marginBottom: 12,
  },
  templateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  templateInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  templateName: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  vendorBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  vendorBadgeText: {
    fontSize: 11,
    fontWeight: '500',
  },
  deviceCount: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  deviceCountText: {
    fontSize: 12,
  },
  description: {
    fontSize: 13,
    marginBottom: 8,
  },
  contentPreview: {
    marginBottom: 8,
  },
  contentLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  contentText: {
    fontSize: 12,
    fontFamily: MONOSPACE_FONT,
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    marginBottom: 8,
  },
  contentInput: {
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    borderWidth: 1,
    minHeight: 200,
    fontFamily: MONOSPACE_FONT,
  },
  formPicker: {
    height: 44,
  },
  cardActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  previewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  previewButtonText: {
    fontSize: 12,
    fontWeight: '500',
  },
  previewModal: {
    flex: 1,
  },
  previewContent: {
    flex: 1,
    padding: 16,
  },
  previewSection: {
    gap: 12,
    marginBottom: 16,
  },
  previewLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  previewDeviceCard: {
    marginBottom: 16,
  },
  previewDeviceTitle: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  previewDeviceGrid: {
    gap: 4,
  },
  previewLoadingContainer: {
    alignItems: 'center',
    paddingVertical: 32,
    gap: 12,
  },
  previewLoadingText: {
    fontSize: 13,
  },
  previewOutputCard: {
    marginBottom: 16,
  },
  previewEmptyState: {
    alignItems: 'center',
    paddingVertical: 48,
    gap: 16,
  },
  previewEmptyText: {
    fontSize: 13,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
});
