import { useState, useMemo, useCallback } from 'react';
import type { DhcpOption, DhcpOptionFormData } from '@core';
import {
  COMMON_DHCP_OPTIONS,
  useDhcpOptions,
  getVendorFilterOptions,
  getVendorSelectOptions,
  getVendorName,
  filterByVendor,
  groupByVendor,
  generateId,
  DHCP_OPTION_TYPES,
  EMPTY_DHCP_OPTION_FORM,
  createChangeHandler,
} from '@core';
import { ActionBar } from './ActionBar';
import { Button } from './Button';
import { Card } from './Card';
import { DropdownSelect } from './DropdownSelect';
import { FormDialog } from './FormDialog';
import { FormField } from './FormField';
import { LoadingState } from './LoadingState';
import { Message } from './Message';
import { SelectField } from './SelectField';
import { Table, SimpleTable, Cell } from './Table';
import type { TableColumn, TableAction } from './Table';
import { PlusIcon, Icon } from './Icon';

export function DhcpOptions() {
  const [filterVendor, setFilterVendor] = useState('');
  const {
    options,
    loading,
    error,
    createOption,
    updateOption,
    deleteOption,
    resetToDefaults,
    message,
    clearMessage,
  } = useDhcpOptions({ vendorFilter: filterVendor || 'all' });

  const [showForm, setShowForm] = useState(false);
  const [editingOption, setEditingOption] = useState<DhcpOption | null>(null);
  const [formData, setFormData] = useState<DhcpOptionFormData>(EMPTY_DHCP_OPTION_FORM);

  // Get vendor options from shared utility
  const filterVendorOptions = useMemo(() => getVendorFilterOptions(), []);
  const vendorSelectOptions = useMemo(() => getVendorSelectOptions(), []);

  // Filter options by vendor (client-side for immediate UI response)
  const filteredOptions = useMemo(
    () => filterByVendor(options, filterVendor, (opt) => opt.vendor_id),
    [options, filterVendor]
  );

  // Group options by vendor
  const groupedOptions = useMemo(
    () => groupByVendor(filteredOptions, (opt) => opt.vendor_id),
    [filteredOptions]
  );

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
    setFormData(EMPTY_DHCP_OPTION_FORM);
    setShowForm(true);
  };

  const handleAddCommon = (common: typeof COMMON_DHCP_OPTIONS[number]) => {
    setEditingOption(null);
    setFormData({
      ...EMPTY_DHCP_OPTION_FORM,
      option_number: common.number,
      name: common.name,
      description: common.description,
    });
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingOption(null);
    setFormData(EMPTY_DHCP_OPTION_FORM);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const optionData = {
      id: formData.id || generateId('opt'),
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
      await resetToDefaults();
    }
  };

  // Generic change handler for form fields
  const handleChange = createChangeHandler<DhcpOptionFormData>((name, value) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  });

  // Columns for DHCP option tables
  const optionColumns: TableColumn<DhcpOption>[] = useMemo(() => [
    {
      header: 'Option',
      accessor: (opt) => (
        <>
          <strong>Option {opt.option_number}</strong>
          <br />
          <span className="text-xs text-secondary">
            {opt.name}
          </span>
        </>
      ),
    },
    { header: 'Value', accessor: (opt) => Cell.code(opt.value || '(empty)') },
    { header: 'Type', accessor: 'type' },
    {
      header: 'Status',
      accessor: (opt) => (
        <span
          className={`status clickable ${opt.enabled ? 'online' : 'offline'}`}
          onClick={(e) => {
            e.stopPropagation();
            handleToggle(opt.id);
          }}
          title={opt.enabled ? 'Click to disable' : 'Click to enable'}
        >
          {opt.enabled ? 'Enabled' : 'Disabled'}
        </span>
      ),
    },
  ], []);

  // Actions for DHCP option tables
  const optionActions: TableAction<DhcpOption>[] = useMemo(() => [
    {
      icon: <Icon name="edit" size={14} />,
      label: 'Edit',
      onClick: handleEdit,
      variant: 'secondary',
      tooltip: 'Edit option',
    },
    {
      icon: <Icon name="delete" size={14} />,
      label: 'Delete',
      onClick: (opt) => handleDelete(opt.id),
      variant: 'danger',
      tooltip: 'Delete option',
    },
  ], []);

  // Render a table for a set of options
  const renderOptionsTable = useCallback((data: DhcpOption[]) => (
    <Table
      data={data}
      columns={optionColumns}
      getRowKey={(opt) => opt.id}
      actions={optionActions}
      rowClassName={(opt) => !opt.enabled ? 'disabled-row' : undefined}
      emptyMessage="No options in this category."
    />
  ), [optionColumns, optionActions]);

  return (
    <LoadingState loading={loading} error={error} loadingMessage="Loading DHCP options...">
      {message && <Message type={message.type} text={message.text} onDismiss={clearMessage} />}

      <ActionBar>
        <Button onClick={handleAdd}>
          <PlusIcon size={16} />
          Add Option
        </Button>
        <Button variant="secondary" onClick={handleReset}>
          Reset to Defaults
        </Button>
        <DropdownSelect
          options={filterVendorOptions}
          value={filterVendor}
          onChange={setFilterVendor}
          placeholder="Filter: All Vendors"
          icon="filter_list"
          className="filter-dropdown"
        />
      </ActionBar>

      <Card title="Quick Add Common Options">
        <div className="actions flex-wrap gap-8">
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
          {renderOptionsTable(groupedOptions.global)}
        </Card>
      )}

      {Object.entries(groupedOptions.byVendor).map(([vendorId, vendorOptions]) => (
        <Card key={vendorId} title={`${getVendorName(vendorId)} Options`}>
          {renderOptionsTable(vendorOptions)}
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
        <p className="helper-text mb-12">
          Use these variables in option values. They will be replaced with actual values when generating DHCP config.
        </p>
        <SimpleTable
          headers={['Variable', 'Description']}
          rows={[
            [Cell.code('${tftp_server_ip}'), 'TFTP server IP from global settings'],
            [Cell.code('${dhcp_gateway}'), 'DHCP gateway IP from global settings'],
            [Cell.code('${hostname}'), 'Device hostname (per-device)'],
            [Cell.code('${mac}'), 'Device MAC address (per-device)'],
          ]}
        />
      </Card>

      <FormDialog
        isOpen={showForm}
        onClose={handleCloseForm}
        title={editingOption ? 'Edit DHCP Option' : 'Add DHCP Option'}
        onSubmit={handleSubmit}
        submitText={editingOption ? 'Update Option' : 'Add Option'}
        variant="wide"
      >
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
            options={DHCP_OPTION_TYPES}
          />
          <SelectField
            label="Vendor"
            name="vendor_id"
            value={formData.vendor_id}
            onChange={handleChange}
            options={vendorSelectOptions}
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
          <label className="checkbox-label">
            <input
              type="checkbox"
              name="enabled"
              checked={formData.enabled}
              onChange={handleChange}
            />
            Enabled
          </label>
        </div>
      </FormDialog>
    </LoadingState>
  );
}
