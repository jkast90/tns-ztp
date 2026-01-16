import { useState, useEffect } from 'react';
import type { Device } from '../core';
import { Button } from './Button';
import { Dialog } from './Dialog';
import { FormField } from './FormField';

interface Props {
  isOpen: boolean;
  device?: Device | null;
  onSubmit: (device: Partial<Device>) => void;
  onClose: () => void;
}

export function DeviceForm({ isOpen, device, onSubmit, onClose }: Props) {
  const [formData, setFormData] = useState({
    mac: '',
    ip: '',
    hostname: '',
    serial_number: '',
    config_template: '',
    ssh_user: '',
    ssh_pass: '',
  });

  const isEditing = !!device;

  useEffect(() => {
    if (device) {
      setFormData({
        mac: device.mac,
        ip: device.ip,
        hostname: device.hostname,
        serial_number: device.serial_number || '',
        config_template: device.config_template || '',
        ssh_user: device.ssh_user || '',
        ssh_pass: device.ssh_pass || '',
      });
    } else {
      setFormData({
        mac: '',
        ip: '',
        hostname: '',
        serial_number: '',
        config_template: '',
        ssh_user: '',
        ssh_pass: '',
      });
    }
  }, [device, isOpen]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Edit Device' : 'Add Device'}
      variant="wide"
    >
      <form onSubmit={handleSubmit}>
        <div className="form-row">
          <FormField
            label="MAC Address *"
            name="mac"
            type="text"
            value={formData.mac}
            onChange={handleChange}
            placeholder="aa:bb:cc:dd:ee:ff"
            required
            disabled={isEditing}
          />
          <FormField
            label="IP Address *"
            name="ip"
            type="text"
            value={formData.ip}
            onChange={handleChange}
            placeholder="192.168.1.100"
            required
          />
          <FormField
            label="Hostname *"
            name="hostname"
            type="text"
            value={formData.hostname}
            onChange={handleChange}
            placeholder="switch-01"
            required
          />
        </div>

        <div className="form-row">
          <FormField
            label="Serial Number"
            name="serial_number"
            type="text"
            value={formData.serial_number}
            onChange={handleChange}
            placeholder="SN123456 (optional)"
          />
          <FormField
            label="Config Template"
            name="config_template"
            type="text"
            value={formData.config_template}
            onChange={handleChange}
            placeholder="switch.template (optional)"
          />
        </div>

        <div className="form-row">
          <FormField
            label="SSH Username (override)"
            name="ssh_user"
            type="text"
            value={formData.ssh_user}
            onChange={handleChange}
            placeholder="Leave empty for default"
          />
          <FormField
            label="SSH Password (override)"
            name="ssh_pass"
            type="password"
            value={formData.ssh_pass}
            onChange={handleChange}
            placeholder="Leave empty for default"
          />
        </div>

        <div className="dialog-actions">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit">
            {isEditing ? 'Update Device' : 'Add Device'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
