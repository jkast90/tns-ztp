import { useEffect } from 'react';
import type { Device } from '../core';
import { useForm, validateDeviceForm, DEVICE_VENDORS } from '../core';
import { Button } from './Button';
import { Dialog } from './Dialog';
import { FormField } from './FormField';
import { SelectField } from './SelectField';

interface Props {
  isOpen: boolean;
  device?: Device | null;
  onSubmit: (device: Partial<Device>) => Promise<void>;
  onClose: () => void;
}

type DeviceFormData = {
  mac: string;
  ip: string;
  hostname: string;
  vendor: string;
  serial_number: string;
  config_template: string;
  ssh_user: string;
  ssh_pass: string;
};

const emptyFormData: DeviceFormData = {
  mac: '',
  ip: '',
  hostname: '',
  vendor: '',
  serial_number: '',
  config_template: '',
  ssh_user: '',
  ssh_pass: '',
};

export function DeviceForm({ isOpen, device, onSubmit, onClose }: Props) {
  const isEditing = !!device;

  const {
    formData,
    errors,
    saving,
    handleChange,
    resetForm,
    handleSubmit,
  } = useForm<DeviceFormData>({
    initialData: emptyFormData,
    onSubmit: async (data) => {
      await onSubmit(data);
      onClose();
    },
    validate: validateDeviceForm,
  });

  // Reset form when dialog opens/closes or device changes
  useEffect(() => {
    if (isOpen) {
      if (device) {
        resetForm({
          mac: device.mac,
          ip: device.ip,
          hostname: device.hostname,
          vendor: device.vendor || '',
          serial_number: device.serial_number || '',
          config_template: device.config_template || '',
          ssh_user: device.ssh_user || '',
          ssh_pass: device.ssh_pass || '',
        });
      } else {
        resetForm(emptyFormData);
      }
    }
  }, [device, isOpen, resetForm]);

  const onFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSubmit();
  };

  // Adapter for web input onChange events
  const onInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    handleChange(name as keyof DeviceFormData, value);
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Edit Device' : 'Add Device'}
      variant="wide"
    >
      <form onSubmit={onFormSubmit}>
        <div className="form-row">
          <FormField
            label="MAC Address *"
            name="mac"
            type="text"
            value={formData.mac}
            onChange={onInputChange}
            placeholder="aa:bb:cc:dd:ee:ff"
            required
            disabled={isEditing}
            error={errors.mac}
          />
          <FormField
            label="IP Address *"
            name="ip"
            type="text"
            value={formData.ip}
            onChange={onInputChange}
            placeholder="192.168.1.100"
            required
            error={errors.ip}
          />
          <FormField
            label="Hostname *"
            name="hostname"
            type="text"
            value={formData.hostname}
            onChange={onInputChange}
            placeholder="switch-01"
            required
            error={errors.hostname}
          />
        </div>

        <div className="form-row">
          <SelectField
            label="Vendor"
            name="vendor"
            value={formData.vendor}
            onChange={onInputChange}
            options={DEVICE_VENDORS}
          />
          <FormField
            label="Serial Number"
            name="serial_number"
            type="text"
            value={formData.serial_number}
            onChange={onInputChange}
            placeholder="SN123456 (optional)"
          />
          <FormField
            label="Config Template"
            name="config_template"
            type="text"
            value={formData.config_template}
            onChange={onInputChange}
            placeholder="switch.template (optional)"
          />
        </div>

        <div className="form-row">
          <FormField
            label="SSH Username (override)"
            name="ssh_user"
            type="text"
            value={formData.ssh_user}
            onChange={onInputChange}
            placeholder="Leave empty for default"
          />
          <FormField
            label="SSH Password (override)"
            name="ssh_pass"
            type="password"
            value={formData.ssh_pass}
            onChange={onInputChange}
            placeholder="Leave empty for default"
          />
        </div>

        <div className="dialog-actions">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? 'Saving...' : isEditing ? 'Update Device' : 'Add Device'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
