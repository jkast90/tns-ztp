import { useState, useMemo } from 'react';
import type { DhcpOption, DhcpOptionFormData, DhcpOptionType } from '../core';
import { DEVICE_VENDORS, COMMON_DHCP_OPTIONS, useDhcpOptions } from '../core';
import { Button } from './Button';
import { Card } from './Card';
import { Dialog } from './Dialog';
import { DropdownSelect } from './DropdownSelect';
import type { DropdownOption } from './DropdownSelect';
import { FormField } from './FormField';
import { Message } from './Message';
import { SelectField } from './SelectField';
import { EditIcon, PlusIcon, TrashIcon, Icon } from './Icon';

const FILTER_VENDOR_OPTIONS: DropdownOption[] = [
  { id: '', label: 'All Vendors', icon: 'filter_list' },
  ...DEVICE_VENDORS.filter((v) => v.value !== '').map((v) => ({
    id: v.value,
    label: v.label,
    icon: 'business',
  })),
];

const OPTION_TYPES: { value: DhcpOptionType; label: string }[] = [
  { value: 'string', label: 'String' },
  { value: 'ip', label: 'IP Address' },
  { value: 'hex', label: 'Hex' },
  { value: 'number', label: 'Number' },
];

const VENDOR_OPTIONS = [
  { value: '', label: 'All Vendors (Global)' },
  ...DEVICE_VENDORS.filter((v) => v.value !== ''),
];

// Default DHCP options for common ZTP scenarios
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
    id: 'bootfile-juniper',
    option_number: 67,
    name: 'Juniper Bootfile',
    value: 'juniper.conf',
    type: 'string',
    vendor_id: 'juniper',
    description: 'Juniper config filename',
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
  {
    id: 'opengear-ztp',
    option_number: 43,
    name: 'OpenGear ZTP',
    value: '',
    type: 'hex',
    vendor_id: 'opengear',
    description: 'OpenGear vendor-specific enrollment options',
    enabled: false,
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

export function DhcpOptions() {
  const [filterVendor, setFilterVendor] = useState('');
  const {
    options,
    loading,
    error,
    createOption,
    updateOption,
    deleteOption,
    message,
    clearMessage,
  } = useDhcpOptions({ vendorFilter: filterVendor || 'all' });

  const [showForm, setShowForm] = useState(false);
  const [editingOption, setEditingOption] = useState<DhcpOption | null>(null);
  const [formData, setFormData] = useState<DhcpOptionFormData>(emptyFormData);

  // Filter options by vendor (client-side for immediate UI response)
  const filteredOptions = useMemo(() => {
    if (!filterVendor) return options;
    return options.filter(
      (opt) => !opt.vendor_id || opt.vendor_id === filterVendor
    );
  }, [options, filterVendor]);

  // Group options by vendor
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

  const handleAddCommon = (common: typeof COMMON_DHCP_OPTIONS[number]) => {
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

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

  const handleDelete = async (id: string) => {
    const option = options.find((o) => o.id === id);
    if (option && confirm(`Delete DHCP option "${option.name}"?`)) {
      await deleteOption(id);
    }
  };

  const handleToggle = async (id: string) => {
    const option = options.find((o) => o.id === id);
    if (option) {
      await updateOption(id, { ...option, enabled: !option.enabled });
    }
  };

  const handleReset = async () => {
    if (confirm('Reset all DHCP options to defaults? This will remove custom options and recreate defaults.')) {
      // Delete all existing options
      for (const option of options) {
        await deleteOption(option.id);
      }
      // Create default options
      for (const option of DEFAULT_OPTIONS) {
        await createOption(option);
      }
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    setFormData((prev) => ({
      ...prev,
      [name]:
        type === 'checkbox'
          ? checked
          : type === 'number'
          ? parseInt(value, 10) || 0
          : value,
    }));
  };

  const getVendorName = (vendorId: string) => {
    return DEVICE_VENDORS.find((v) => v.value === vendorId)?.label || vendorId;
  };

  const renderOptionRow = (option: DhcpOption) => (
    <tr key={option.id} className={!option.enabled ? 'disabled-row' : ''}>
      <td>
        <strong>Option {option.option_number}</strong>
        <br />
        <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
          {option.name}
        </span>
      </td>
      <td>
        <code>{option.value || '(empty)'}</code>
      </td>
      <td>{option.type}</td>
      <td>
        <span
          className={`status ${option.enabled ? 'online' : 'offline'}`}
          style={{ cursor: 'pointer' }}
          onClick={() => handleToggle(option.id)}
          title={option.enabled ? 'Click to disable' : 'Click to enable'}
        >
          {option.enabled ? 'Enabled' : 'Disabled'}
        </span>
      </td>
      <td>
        <div className="actions">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => handleEdit(option)}
            title="Edit option"
          >
            <EditIcon size={14} />
          </Button>
          <Button
            variant="danger"
            size="sm"
            onClick={() => handleDelete(option.id)}
            title="Delete option"
          >
            <TrashIcon size={14} />
          </Button>
        </div>
      </td>
    </tr>
  );

  if (loading) {
    return <Card><p>Loading DHCP options...</p></Card>;
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
          Add Option
        </Button>
        <Button variant="secondary" onClick={handleReset}>
          Reset to Defaults
        </Button>
        <DropdownSelect
          options={FILTER_VENDOR_OPTIONS}
          value={filterVendor}
          onChange={setFilterVendor}
          placeholder="Filter: All Vendors"
          icon="filter_list"
          className="filter-dropdown"
        />
      </div>

      <Card title="Quick Add Common Options">
        <div className="actions" style={{ flexWrap: 'wrap', gap: '8px' }}>
          {COMMON_DHCP_OPTIONS.map((common, idx) => (
            <Button
              key={`${common.number}-${idx}`}
              variant="secondary"
              size="sm"
              onClick={() => handleAddCommon(common)}
              title={common.description}
            >
              <PlusIcon size={12} />
              Option {common.number}: {common.name}
            </Button>
          ))}
        </div>
      </Card>

      {groupedOptions.global.length > 0 && (
        <Card title="Global Options (All Vendors)">
          <table>
            <thead>
              <tr>
                <th>Option</th>
                <th>Value</th>
                <th>Type</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>{groupedOptions.global.map(renderOptionRow)}</tbody>
          </table>
        </Card>
      )}

      {Object.entries(groupedOptions.byVendor).map(([vendorId, vendorOptions]) => (
        <Card key={vendorId} title={`${getVendorName(vendorId)} Options`}>
          <table>
            <thead>
              <tr>
                <th>Option</th>
                <th>Value</th>
                <th>Type</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>{vendorOptions.map(renderOptionRow)}</tbody>
          </table>
        </Card>
      ))}

      {filteredOptions.length === 0 && (
        <Card>
          <div className="empty-state">
            <p>No DHCP options configured.</p>
            <p>Add options using the buttons above or click "Reset to Defaults".</p>
          </div>
        </Card>
      )}

      <Card>
        <h3>
          <Icon name="info" size={18} />
          Variable Reference
        </h3>
        <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', marginBottom: '12px' }}>
          Use these variables in option values. They will be replaced with actual values when generating DHCP config.
        </p>
        <table>
          <thead>
            <tr>
              <th>Variable</th>
              <th>Description</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><code>{'${tftp_server_ip}'}</code></td>
              <td>TFTP server IP from global settings</td>
            </tr>
            <tr>
              <td><code>{'${dhcp_gateway}'}</code></td>
              <td>DHCP gateway IP from global settings</td>
            </tr>
            <tr>
              <td><code>{'${hostname}'}</code></td>
              <td>Device hostname (per-device)</td>
            </tr>
            <tr>
              <td><code>{'${mac}'}</code></td>
              <td>Device MAC address (per-device)</td>
            </tr>
          </tbody>
        </table>
      </Card>

      <Dialog
        isOpen={showForm}
        onClose={handleCloseForm}
        title={editingOption ? 'Edit DHCP Option' : 'Add DHCP Option'}
        variant="wide"
      >
        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <FormField
              label="Option Number *"
              name="option_number"
              type="number"
              value={formData.option_number.toString()}
              onChange={handleChange}
              placeholder="e.g., 66"
              required
              min={1}
              max={255}
            />
            <FormField
              label="Option Name *"
              name="name"
              type="text"
              value={formData.name}
              onChange={handleChange}
              placeholder="e.g., TFTP Server"
              required
            />
          </div>

          <div className="form-row">
            <SelectField
              label="Value Type"
              name="type"
              value={formData.type}
              onChange={handleChange}
              options={OPTION_TYPES}
            />
            <SelectField
              label="Vendor"
              name="vendor_id"
              value={formData.vendor_id}
              onChange={handleChange}
              options={VENDOR_OPTIONS}
            />
          </div>

          <FormField
            label="Value"
            name="value"
            type="text"
            value={formData.value}
            onChange={handleChange}
            placeholder="e.g., 192.168.1.100 or ${tftp_server_ip}"
          />

          <FormField
            label="Description"
            name="description"
            type="text"
            value={formData.description}
            onChange={handleChange}
            placeholder="Optional description"
          />

          <div className="form-group">
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                name="enabled"
                checked={formData.enabled}
                onChange={handleChange}
                style={{ width: 'auto' }}
              />
              Enabled
            </label>
          </div>

          <div className="dialog-actions">
            <Button type="button" variant="secondary" onClick={handleCloseForm}>
              Cancel
            </Button>
            <Button type="submit">
              {editingOption ? 'Update Option' : 'Add Option'}
            </Button>
          </div>
        </form>
      </Dialog>
    </>
  );
}
