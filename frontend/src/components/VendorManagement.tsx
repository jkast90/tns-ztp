import { useState, useMemo } from 'react';
import type { Device, Vendor, VendorFormData } from '@core';
import {
  useVendors,
  EMPTY_VENDOR_FORM,
  slugify,
  createChangeHandler,
  formatListValue,
  parseListValue,
} from '@core';
import { ActionBar } from './ActionBar';
import { Button } from './Button';
import { Card } from './Card';
import { FormDialog } from './FormDialog';
import { FormField } from './FormField';
import { LoadingState } from './LoadingState';
import { Message } from './Message';
import { Table, Cell } from './Table';
import type { TableColumn } from './Table';
import { PlusIcon } from './Icon';

interface Props {
  devices: Device[];
}

export function VendorManagement({ devices }: Props) {
  const {
    vendors,
    loading,
    error,
    createVendor,
    updateVendor,
    deleteVendor,
    resetToDefaults,
    message,
    clearMessage,
  } = useVendors();

  const [showForm, setShowForm] = useState(false);
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);
  const [formData, setFormData] = useState<VendorFormData>(EMPTY_VENDOR_FORM);

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

  const unassignedCount = vendorStats['unassigned'] || vendorStats[''] || 0;

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
    setFormData({ ...EMPTY_VENDOR_FORM, mac_prefixes: [] });
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingVendor(null);
    setFormData({ ...EMPTY_VENDOR_FORM, mac_prefixes: [] });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const success = editingVendor
      ? await updateVendor(editingVendor.id, formData)
      : await createVendor({
          ...formData,
          id: formData.id || slugify(formData.name),
        });

    if (success) {
      handleCloseForm();
    }
  };

  const handleDelete = async (vendor: Vendor) => {
    await deleteVendor(vendor.id);
  };

  const handleReset = async () => {
    if (confirm('Reset all vendors to defaults? This will restore default MAC prefixes.')) {
      await resetToDefaults();
    }
  };

  // Generic change handler for simple fields
  const handleChange = createChangeHandler<VendorFormData>((name, value) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  });

  // Special handler for MAC prefixes (array field)
  const handleMacPrefixesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const prefixes = parseListValue(e.target.value).map((p) => p.toUpperCase());
    setFormData((prev) => ({ ...prev, mac_prefixes: prefixes }));
  };

  return (
    <LoadingState loading={loading} error={error} loadingMessage="Loading vendors...">
      {message && <Message type={message.type} text={message.text} onDismiss={clearMessage} />}

      <ActionBar>
        <Button onClick={handleAdd}>
          <PlusIcon size={16} />
          Add Vendor
        </Button>
        <Button variant="secondary" onClick={handleReset}>
          Reset to Defaults
        </Button>
      </ActionBar>

      {unassignedCount > 0 && (
        <Card>
          <div className="message error">
            {unassignedCount} device{unassignedCount !== 1 ? 's' : ''} without vendor assigned
          </div>
        </Card>
      )}

      <Card title="Configured Vendors">
        <Table
          data={vendorsWithStats}
          columns={[
            { header: 'Vendor', accessor: (v) => <strong>{v.name}</strong> },
            { header: 'Backup Command', accessor: (v) => Cell.code(v.backup_command) },
            { header: 'SSH Port', accessor: 'ssh_port' },
            { header: 'MAC Prefixes', accessor: (v) => v.mac_prefixes?.length || 0 },
            { header: 'Devices', accessor: (v) => Cell.count(v.device_count) },
          ] as TableColumn<(typeof vendorsWithStats)[0]>[]}
          getRowKey={(v) => v.id}
          onEdit={handleEdit}
          onDelete={handleDelete}
          deleteConfirmMessage={(v) => `Delete vendor "${v.name}"?`}
          deleteDisabled={(v) => v.device_count > 0}
          emptyMessage="No vendors configured."
          emptyDescription='Click "Add Vendor" or "Reset to Defaults" to get started.'
        />
      </Card>

      <FormDialog
        isOpen={showForm}
        onClose={handleCloseForm}
        title={editingVendor ? 'Edit Vendor' : 'Add Vendor'}
        onSubmit={handleSubmit}
        submitText={editingVendor ? 'Update Vendor' : 'Add Vendor'}
      >
        <div className="form-row">
          <FormField
            label="Vendor Name *"
            name="name"
            type="text"
            value={formData.name}
            onChange={handleChange}
            placeholder="Acme Networks"
            required
            disabled={!!editingVendor}
          />
          <FormField
            label="Vendor ID"
            name="id"
            type="text"
            value={formData.id}
            onChange={handleChange}
            placeholder="acme (auto-generated)"
            disabled={!!editingVendor}
          />
        </div>

        <FormField
          label="Backup Command *"
          name="backup_command"
          type="text"
          value={formData.backup_command}
          onChange={handleChange}
          placeholder="show running-config"
          required
        />

        <FormField
          label="SSH Port"
          name="ssh_port"
          type="number"
          value={formData.ssh_port.toString()}
          onChange={handleChange}
          placeholder="22"
        />

        <div className="form-field">
          <label htmlFor="mac_prefixes">MAC Prefixes (OUI)</label>
          <textarea
            id="mac_prefixes"
            name="mac_prefixes"
            value={formatListValue(formData.mac_prefixes)}
            onChange={handleMacPrefixesChange}
            placeholder="00:1A:2F, 00:1B:0D, 2C:31:24"
            rows={3}
            style={{ fontFamily: 'monospace' }}
          />
          <small className="form-help">
            Comma or newline separated MAC address prefixes (first 3 octets) for auto-detection
          </small>
        </div>

        <FormField
          label="Vendor Class (DHCP Option 60)"
          name="vendor_class"
          type="text"
          value={formData.vendor_class}
          onChange={handleChange}
          placeholder="Cisco Systems, Inc."
        />

        <FormField
          label="Default Template ID"
          name="default_template"
          type="text"
          value={formData.default_template}
          onChange={handleChange}
          placeholder="cisco-ios"
        />
      </FormDialog>
    </LoadingState>
  );
}
