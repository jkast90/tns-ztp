import { useState, useMemo } from 'react';
import type { Device, Vendor, VendorFormData } from '../core';
import { DEVICE_VENDORS, useVendors } from '../core';
import { Button } from './Button';
import { Card } from './Card';
import { Dialog } from './Dialog';
import { FormField } from './FormField';
import { Message } from './Message';
import { EditIcon, PlusIcon, TrashIcon } from './Icon';

interface Props {
  devices: Device[];
}

const DEFAULT_VENDORS: Omit<Vendor, 'created_at' | 'updated_at'>[] = DEVICE_VENDORS
  .filter((v) => v.value !== '')
  .map((v) => ({
    id: v.value,
    name: v.label,
    backup_command: getDefaultBackupCommand(v.value),
    ssh_port: 22,
  }));

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

const emptyFormData: VendorFormData = {
  id: '',
  name: '',
  backup_command: 'show running-config',
  ssh_port: 22,
};

export function VendorManagement({ devices }: Props) {
  const {
    vendors,
    loading,
    error,
    createVendor,
    updateVendor,
    deleteVendor,
    message,
    clearMessage,
  } = useVendors();

  const [showForm, setShowForm] = useState(false);
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);
  const [formData, setFormData] = useState<VendorFormData>(emptyFormData);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

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

  const handleDelete = async (id: string) => {
    const vendor = vendors.find((v) => v.id === id);
    if (vendor && confirm(`Delete vendor "${vendor.name}"?`)) {
      await deleteVendor(id);
    }
  };

  const handleReset = async () => {
    if (confirm('Reset all vendors to defaults? This will remove any custom vendors and recreate default vendors.')) {
      // Delete all existing vendors
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
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'number' ? parseInt(value, 10) || 0 : value,
    }));
  };

  if (loading) {
    return <Card><p>Loading vendors...</p></Card>;
  }

  if (error) {
    return <Card><div className="message error">{error}</div></Card>;
  }

  return (
    <>
      {message && <Message type={message.type} text={message.text} onDismiss={clearMessage} />}

      <div className="actions-bar">
        <Button onClick={handleAdd}>
          <PlusIcon size={16} />
          Add Vendor
        </Button>
        <Button variant="secondary" onClick={handleReset}>
          Reset to Defaults
        </Button>
      </div>

      {unassignedCount > 0 && (
        <Card>
          <div className="message error">
            {unassignedCount} device{unassignedCount !== 1 ? 's' : ''} without vendor assigned
          </div>
        </Card>
      )}

      <Card title="Configured Vendors">
        {vendors.length === 0 ? (
          <p>No vendors configured. Click "Add Vendor" or "Reset to Defaults" to get started.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Vendor</th>
                <th>Backup Command</th>
                <th>SSH Port</th>
                <th>Devices</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {vendorsWithStats.map((vendor) => (
                <tr key={vendor.id}>
                  <td><strong>{vendor.name}</strong></td>
                  <td><code>{vendor.backup_command}</code></td>
                  <td>{vendor.ssh_port}</td>
                  <td>
                    <span className={vendor.device_count > 0 ? 'status online' : 'status offline'}>
                      {vendor.device_count}
                    </span>
                  </td>
                  <td>
                    <div className="actions">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleEdit(vendor)}
                        title="Edit vendor"
                      >
                        <EditIcon size={14} />
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => handleDelete(vendor.id)}
                        title="Delete vendor"
                        disabled={vendor.device_count > 0}
                      >
                        <TrashIcon size={14} />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <Dialog
        isOpen={showForm}
        onClose={handleCloseForm}
        title={editingVendor ? 'Edit Vendor' : 'Add Vendor'}
      >
        <form onSubmit={handleSubmit}>
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

          <div className="dialog-actions">
            <Button type="button" variant="secondary" onClick={handleCloseForm}>
              Cancel
            </Button>
            <Button type="submit">
              {editingVendor ? 'Update Vendor' : 'Add Vendor'}
            </Button>
          </div>
        </form>
      </Dialog>
    </>
  );
}
