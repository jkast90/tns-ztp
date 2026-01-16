import { useState, useMemo } from 'react';
import type { Template, TemplateFormData } from '../core';
import { DEVICE_VENDORS, useTemplates } from '../core';
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

const VENDOR_OPTIONS = [
  { value: '', label: 'All Vendors (Global)' },
  ...DEVICE_VENDORS.filter((v) => v.value !== ''),
];

const emptyFormData: TemplateFormData = {
  id: '',
  name: '',
  description: '',
  vendor_id: '',
  content: '',
};

// Sample device data for preview
const SAMPLE_DEVICE = {
  device: {
    mac: '00:11:22:33:44:55',
    ip: '192.168.1.100',
    hostname: 'switch-01',
    vendor: 'cisco',
    serial_number: 'ABC123456',
  },
  subnet: '255.255.255.0',
  gateway: '192.168.1.1',
};

export function TemplateBuilder() {
  const [filterVendor, setFilterVendor] = useState('');
  const {
    templates,
    variables,
    loading,
    error,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    previewTemplate,
    message,
    clearMessage,
  } = useTemplates({ vendorFilter: filterVendor || 'all' });

  const [showForm, setShowForm] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [formData, setFormData] = useState<TemplateFormData>(emptyFormData);
  const [previewOutput, setPreviewOutput] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);

  // Filter templates by vendor (client-side for immediate UI response)
  const filteredTemplates = useMemo(() => {
    if (!filterVendor) return templates;
    return templates.filter(
      (t) => !t.vendor_id || t.vendor_id === filterVendor
    );
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
    setFormData(emptyFormData);
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingTemplate(null);
    setFormData(emptyFormData);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const templateData = {
      id: formData.id || `tpl-${Date.now()}`,
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

  const handleDelete = async (id: string) => {
    const template = templates.find((t) => t.id === id);
    if (template && confirm(`Delete template "${template.name}"?`)) {
      await deleteTemplate(id);
    }
  };

  const handlePreview = async (template: Template) => {
    setPreviewLoading(true);
    const output = await previewTemplate(template.id, SAMPLE_DEVICE);
    setPreviewLoading(false);
    if (output !== null) {
      setPreviewOutput(output);
      setShowPreview(true);
    }
  };

  const handleFormPreview = async () => {
    // For in-form preview, we need to create/update first or use a temp approach
    // For now, this is only available for existing templates
    if (editingTemplate) {
      await handlePreview(editingTemplate);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const insertVariable = (varName: string) => {
    const textarea = document.querySelector('textarea[name="content"]') as HTMLTextAreaElement;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const text = formData.content;
      const before = text.substring(0, start);
      const after = text.substring(end);
      const newContent = `${before}{{.${varName}}}${after}`;
      setFormData((prev) => ({ ...prev, content: newContent }));
      // Set cursor position after inserted variable
      setTimeout(() => {
        textarea.focus();
        const newPos = start + varName.length + 5; // {{.}} = 5 chars
        textarea.setSelectionRange(newPos, newPos);
      }, 0);
    }
  };

  const getVendorName = (vendorId: string) => {
    return DEVICE_VENDORS.find((v) => v.value === vendorId)?.label || vendorId;
  };

  const renderTemplateRow = (template: Template) => (
    <tr key={template.id}>
      <td>
        <strong>{template.name}</strong>
        {template.description && (
          <>
            <br />
            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
              {template.description}
            </span>
          </>
        )}
      </td>
      <td>
        <code style={{ fontSize: '0.75rem' }}>
          {template.content.substring(0, 50)}
          {template.content.length > 50 ? '...' : ''}
        </code>
      </td>
      <td>
        <span className={`status ${(template.device_count || 0) > 0 ? 'online' : 'offline'}`}>
          {template.device_count || 0}
        </span>
      </td>
      <td>
        <div className="actions">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => handlePreview(template)}
            title="Preview template"
          >
            <Icon name="visibility" size={14} />
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => handleEdit(template)}
            title="Edit template"
          >
            <EditIcon size={14} />
          </Button>
          <Button
            variant="danger"
            size="sm"
            onClick={() => handleDelete(template.id)}
            title="Delete template"
            disabled={(template.device_count || 0) > 0}
          >
            <TrashIcon size={14} />
          </Button>
        </div>
      </td>
    </tr>
  );

  if (loading) {
    return <Card><p>Loading templates...</p></Card>;
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
          Add Template
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

      <Card>
        <h3>
          <Icon name="info" size={18} />
          Template Variables
        </h3>
        <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', marginBottom: '12px' }}>
          Use Go template syntax. Variables are accessed with {'{{.VariableName}}'}.
        </p>
        <table>
          <thead>
            <tr>
              <th>Variable</th>
              <th>Description</th>
              <th>Example</th>
            </tr>
          </thead>
          <tbody>
            {variables.map((v) => (
              <tr key={v.name}>
                <td><code>{`{{.${v.name}}}`}</code></td>
                <td>{v.description}</td>
                <td><code>{v.example}</code></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {groupedTemplates.global.length > 0 && (
        <Card title="Global Templates (All Vendors)">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Preview</th>
                <th>Devices</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>{groupedTemplates.global.map(renderTemplateRow)}</tbody>
          </table>
        </Card>
      )}

      {Object.entries(groupedTemplates.byVendor).map(([vendorId, vendorTemplates]) => (
        <Card key={vendorId} title={`${getVendorName(vendorId)} Templates`}>
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Preview</th>
                <th>Devices</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>{vendorTemplates.map(renderTemplateRow)}</tbody>
          </table>
        </Card>
      ))}

      {filteredTemplates.length === 0 && (
        <Card>
          <div className="empty-state">
            <p>No templates configured.</p>
            <p>Click "Add Template" to create your first configuration template.</p>
          </div>
        </Card>
      )}

      {/* Template Form Dialog */}
      <Dialog
        isOpen={showForm}
        onClose={handleCloseForm}
        title={editingTemplate ? 'Edit Template' : 'Add Template'}
        variant="wide"
      >
        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <FormField
              label="Template Name *"
              name="name"
              type="text"
              value={formData.name}
              onChange={handleChange}
              placeholder="e.g., Cisco IOS Base Config"
              required
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
            label="Description"
            name="description"
            type="text"
            value={formData.description}
            onChange={handleChange}
            placeholder="Brief description of this template"
          />

          <div className="form-group">
            <label>Template Content *</label>
            <div style={{ marginBottom: '8px' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                Insert variable:
              </span>
              {variables.slice(0, 6).map((v) => (
                <button
                  key={v.name}
                  type="button"
                  onClick={() => insertVariable(v.name)}
                  style={{
                    marginLeft: '4px',
                    padding: '2px 6px',
                    fontSize: '0.7rem',
                    background: 'var(--color-bg-secondary)',
                    border: '1px solid var(--color-border)',
                    borderRadius: '4px',
                    cursor: 'pointer',
                  }}
                >
                  {v.name}
                </button>
              ))}
            </div>
            <textarea
              name="content"
              value={formData.content}
              onChange={handleChange}
              placeholder={`! Example Cisco config template
hostname {{.Hostname}}
!
interface Vlan1
 ip address {{.IP}} {{.Subnet}}
 no shutdown
!
ip default-gateway {{.Gateway}}
!
end`}
              required
              rows={15}
              style={{
                width: '100%',
                fontFamily: 'monospace',
                fontSize: '0.875rem',
                padding: '12px',
                border: '1px solid var(--color-border)',
                borderRadius: '8px',
                background: 'var(--color-bg-secondary)',
                resize: 'vertical',
              }}
            />
          </div>

          <div className="dialog-actions">
            {editingTemplate && (
              <Button
                type="button"
                variant="secondary"
                onClick={handleFormPreview}
                disabled={previewLoading}
              >
                <Icon name="visibility" size={14} />
                Preview
              </Button>
            )}
            <div style={{ flex: 1 }} />
            <Button type="button" variant="secondary" onClick={handleCloseForm}>
              Cancel
            </Button>
            <Button type="submit">
              {editingTemplate ? 'Update Template' : 'Add Template'}
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog
        isOpen={showPreview}
        onClose={() => setShowPreview(false)}
        title="Template Preview"
        variant="wide"
      >
        <div style={{ marginBottom: '16px' }}>
          <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
            Preview using sample device data:
          </p>
          <code style={{ fontSize: '0.75rem' }}>
            MAC: {SAMPLE_DEVICE.device.mac}, IP: {SAMPLE_DEVICE.device.ip},
            Hostname: {SAMPLE_DEVICE.device.hostname}
          </code>
        </div>
        <pre
          style={{
            padding: '16px',
            background: 'var(--color-bg-secondary)',
            border: '1px solid var(--color-border)',
            borderRadius: '8px',
            overflow: 'auto',
            maxHeight: '400px',
            fontSize: '0.875rem',
            fontFamily: 'monospace',
          }}
        >
          {previewOutput}
        </pre>
        <div className="dialog-actions">
          <Button variant="secondary" onClick={() => setShowPreview(false)}>
            Close
          </Button>
        </div>
      </Dialog>
    </>
  );
}
