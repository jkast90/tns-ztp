import type { DeviceFormData } from '../core';
import { DEVICE_VENDORS } from '../core';
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
}

export function DeviceFormFields({
  formData,
  errors,
  onChange,
  mac,
  macEditable = true,
}: DeviceFormFieldsProps) {
  return (
    <>
      <Card title="Device Information">
        <ValidatedInput
          label="MAC Address"
          value={formData.mac}
          onChangeText={(value) => onChange('mac', value)}
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
          options={DEVICE_VENDORS}
          onChange={(value) => onChange('vendor', value)}
          placeholder="Select Vendor..."
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
        <FormInput
          label="Config Template"
          value={formData.config_template}
          onChangeText={(value) => onChange('config_template', value)}
          placeholder="default.template"
          autoCapitalize="none"
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
