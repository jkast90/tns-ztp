import { useCallback, useMemo } from 'react';
import type { DeviceFormData, Template, Vendor } from '../core';
import { lookupVendorByMac, getDefaultTemplateForVendor } from '../core';
import { Card } from './Card';
import { FormInput } from './FormInput';
import { FormSelect } from './FormSelect';
import { ValidatedInput } from './ValidatedInput';

interface DeviceFormFieldsProps {
  formData: DeviceFormData;
  errors: Record<string, string>;
  onChange: (name: keyof DeviceFormData, value: string) => void;
  mac?: string;
  macEditable?: boolean;
  templates?: Template[];
  vendors?: Vendor[];
}

export function DeviceFormFields({
  formData,
  errors,
  onChange,
  mac,
  macEditable = true,
  templates = [],
  vendors = [],
}: DeviceFormFieldsProps) {
  // Build vendor options for select dropdown
  const vendorOptions = useMemo(() => {
    const options = [{ value: '', label: 'Select Vendor...' }];
    vendors.forEach((v) => {
      options.push({ value: v.id, label: v.name });
    });
    return options;
  }, [vendors]);

  // Build template options for select dropdown
  const templateOptions = useMemo(() => {
    const options = [{ value: '', label: 'Select Template...' }];
    templates.forEach((t) => {
      const vendorSuffix = t.vendor_id ? ` (${t.vendor_id})` : ' (global)';
      options.push({ value: t.id, label: `${t.name}${vendorSuffix}` });
    });
    return options;
  }, [templates]);

  // Auto-select vendor and template when MAC changes
  const handleMacChange = useCallback((value: string) => {
    onChange('mac', value);
    // Only auto-select if vendor is empty and MAC looks complete (at least 6 hex chars)
    if (!formData.vendor && value.replace(/[^a-fA-F0-9]/g, '').length >= 6) {
      const detectedVendor = lookupVendorByMac(value);
      if (detectedVendor && detectedVendor !== 'Local') {
        onChange('vendor', detectedVendor);
        // Also auto-select default template for this vendor
        const defaultTemplate = getDefaultTemplateForVendor(detectedVendor);
        if (!formData.config_template) {
          onChange('config_template', defaultTemplate);
        }
      }
    }
  }, [formData.vendor, formData.config_template, onChange]);

  // Auto-select template when vendor changes
  const handleVendorChange = useCallback((value: string) => {
    onChange('vendor', value);
    // Auto-select default template for this vendor if template is empty or was auto-selected
    if (value) {
      const defaultTemplate = getDefaultTemplateForVendor(value);
      // Only auto-fill if template is empty
      if (!formData.config_template) {
        onChange('config_template', defaultTemplate);
      }
    }
  }, [formData.config_template, onChange]);

  return (
    <>
      <Card title="Device Information">
        <ValidatedInput
          label="MAC Address"
          value={formData.mac}
          onChangeText={handleMacChange}
          placeholder="00:11:22:33:44:55"
          autoCapitalize="none"
          validation="mac"
          required
          error={errors.mac}
          scannable={macEditable}
          scanField="mac"
          mac={mac}
          editable={macEditable}
        />
        <ValidatedInput
          label="IP Address"
          value={formData.ip}
          onChangeText={(value) => onChange('ip', value)}
          placeholder="192.168.1.100"
          keyboardType="numeric"
          validation="ip"
          required
          error={errors.ip}
        />
        <ValidatedInput
          label="Hostname"
          value={formData.hostname}
          onChangeText={(value) => onChange('hostname', value)}
          placeholder="switch-01"
          autoCapitalize="none"
          validation="hostname"
          required
          error={errors.hostname}
        />
        <FormSelect
          label="Vendor"
          value={formData.vendor}
          options={vendorOptions}
          onChange={handleVendorChange}
          placeholder="Select Vendor..."
        />
        <ValidatedInput
          label="Model"
          value={formData.model}
          onChangeText={(value) => onChange('model', value)}
          placeholder="WS-C3850-24T"
          autoCapitalize="characters"
          scannable
          scanField="model"
          mac={mac}
        />
        <ValidatedInput
          label="Serial Number"
          value={formData.serial_number}
          onChangeText={(value) => onChange('serial_number', value)}
          placeholder="SN123456"
          autoCapitalize="characters"
          scannable
          scanField="serial_number"
          mac={mac}
        />
        <FormSelect
          label="Config Template"
          value={formData.config_template}
          options={templateOptions}
          onChange={(value) => onChange('config_template', value)}
          placeholder="Select Template..."
        />
      </Card>

      <Card title="SSH Credentials (Optional)" subtitle="Leave empty to use global defaults">
        <FormInput
          label="SSH Username"
          value={formData.ssh_user}
          onChangeText={(value) => onChange('ssh_user', value)}
          placeholder="admin"
          autoCapitalize="none"
          autoCorrect={false}
        />
        <FormInput
          label="SSH Password"
          value={formData.ssh_pass}
          onChangeText={(value) => onChange('ssh_pass', value)}
          placeholder="••••••••"
          secureTextEntry
        />
      </Card>
    </>
  );
}
