import React, { useState, useMemo } from 'react';
import type { Template, TemplateFormData } from '@core';
import {
  useTemplates,
  useDevices,
  getVendorFilterOptions,
  getVendorSelectOptions,
  getVendorName,
  filterByVendor,
  generateId,
  EMPTY_TEMPLATE_FORM,
  SAMPLE_DEVICE_FOR_PREVIEW,
  createChangeHandler,
} from '@core';
import { ActionBar } from './ActionBar';
import { Button } from './Button';
import { Card } from './Card';
import { Dialog } from './Dialog';
import { DropdownSelect } from './DropdownSelect';
import { FormField } from './FormField';
import { Message } from './Message';
import { SelectField } from './SelectField';
import { SimpleTable, Cell } from './Table';
import { Tooltip } from './Tooltip';
import { VendorBadge } from './VendorBadge';
import { LoadingState } from './LoadingState';
import { EditIcon, PlusIcon, TrashIcon, Icon } from './Icon';
import { Templatizer } from './Templatizer';

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
  const [formData, setFormData] = useState<TemplateFormData>(EMPTY_TEMPLATE_FORM);
  const [previewOutput, setPreviewOutput] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewTemplateId, setPreviewTemplateId] = useState<string | null>(null);
  const [previewDeviceMAC, setPreviewDeviceMAC] = useState<string>('');
  const [showTemplatizer, setShowTemplatizer] = useState(false);

  // Get devices for preview selection
  const { devices } = useDevices();

  // Get vendor options from shared utility
  const filterVendorOptions = useMemo(() => getVendorFilterOptions(), []);
  const vendorSelectOptions = useMemo(() => getVendorSelectOptions(), []);

  // Build device options for preview selection
  const deviceOptions = useMemo(() => [
    { value: '', label: 'Sample Device' },
    ...devices.map((d) => ({ value: d.mac, label: `${d.hostname} (${d.ip})` })),
  ], [devices]);

  // Get selected device for preview
  const previewDevice = useMemo(() => {
    if (!previewDeviceMAC) return null;
    return devices.find((d) => d.mac === previewDeviceMAC) || null;
  }, [devices, previewDeviceMAC]);

  // Filter templates by vendor (client-side for immediate UI response)
  const filteredTemplates = useMemo(
    () => filterByVendor(templates, filterVendor, (t) => t.vendor_id),
    [templates, filterVendor]
  );

  // Track which template rows are expanded
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const toggleRowExpand = (id: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const templateData = {
      id: formData.id || generateId('tpl'),
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

  const handlePreview = (template: Template) => {
    setPreviewTemplateId(template.id);
    setPreviewDeviceMAC('');
    setPreviewOutput(null);
    setShowPreview(true);
  };

  const handleGeneratePreview = async () => {
    if (!previewTemplateId) return;
    setPreviewLoading(true);

    const previewData = previewDevice
      ? {
          device: {
            mac: previewDevice.mac,
            ip: previewDevice.ip,
            hostname: previewDevice.hostname,
            vendor: previewDevice.vendor,
            serial_number: previewDevice.serial_number,
          },
          subnet: '255.255.255.0',
          gateway: previewDevice.ip.replace(/\.\d+$/, '.1'),
        }
      : SAMPLE_DEVICE_FOR_PREVIEW;

    const output = await previewTemplate(previewTemplateId, previewData);
    setPreviewLoading(false);
    if (output !== null) {
      setPreviewOutput(output);
    }
  };

  const handleClosePreview = () => {
    setShowPreview(false);
    setPreviewTemplateId(null);
    setPreviewDeviceMAC('');
    setPreviewOutput(null);
  };

  const handleFormPreview = async () => {
    // For in-form preview, we need to create/update first or use a temp approach
    // For now, this is only available for existing templates
    if (editingTemplate) {
      await handlePreview(editingTemplate);
    }
  };

  // Generic change handler for form fields
  const handleChange = createChangeHandler<TemplateFormData>((name, value) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  });

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

  const renderTemplateRow = (template: Template) => {
    const isExpanded = expandedRows.has(template.id);
    return (
      <React.Fragment key={template.id}>
        <tr>
          <td>
            <strong>{template.name}</strong>
            {template.description && (
              <>
                <br />
                <span className="text-xs text-secondary">
                  {template.description}
                </span>
              </>
            )}
          </td>
          <td>
            {template.vendor_id ? (
              <VendorBadge vendor={getVendorName(template.vendor_id)} size="sm" />
            ) : (
              <span className="text-muted text-xs">Global</span>
            )}
          </td>
          <td>
            <code className="text-xs">
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
              <Tooltip content={isExpanded ? 'Collapse' : 'Expand'}>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => toggleRowExpand(template.id)}
                >
                  <Icon name={isExpanded ? 'expand_less' : 'expand_more'} size={14} />
                </Button>
              </Tooltip>
              <Tooltip content="Preview with sample data">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handlePreview(template)}
                >
                  <Icon name="visibility" size={14} />
                </Button>
              </Tooltip>
              <Tooltip content="Edit template">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleEdit(template)}
                >
                  <EditIcon size={14} />
                </Button>
              </Tooltip>
              <Tooltip content={(template.device_count || 0) > 0 ? 'Cannot delete - in use by devices' : 'Delete template'}>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => handleDelete(template.id)}
                  disabled={(template.device_count || 0) > 0}
                >
                  <TrashIcon size={14} />
                </Button>
              </Tooltip>
            </div>
          </td>
        </tr>
        {isExpanded && (
          <tr className="expanded-row">
            <td colSpan={5} className="expanded-cell">
              <pre className="code-preview code-preview-lg">
                {template.content}
              </pre>
            </td>
          </tr>
        )}
      </React.Fragment>
    );
  };

  return (
    <LoadingState loading={loading} error={error} loadingMessage="Loading templates...">
      {message && <Message type={message.type} text={message.text} onDismiss={clearMessage} />}

      <ActionBar>
        <Button onClick={handleAdd}>
          <PlusIcon size={16} />
          Add Template
        </Button>
        <Tooltip content="Convert a raw config into a template by detecting variables">
          <Button variant="secondary" onClick={() => setShowTemplatizer(true)}>
            <Icon name="auto_fix_high" size={16} />
            Templatize Config
          </Button>
        </Tooltip>
        <DropdownSelect
          options={filterVendorOptions}
          value={filterVendor}
          onChange={setFilterVendor}
          placeholder="Filter: All Vendors"
          icon="filter_list"
          className="filter-dropdown"
        />
      </ActionBar>

      <Card>
        <h3>
          <Icon name="info" size={18} />
          Template Variables
        </h3>
        <p className="helper-text mb-12">
          Use Go template syntax. Variables are accessed with {'{{.VariableName}}'}.
        </p>
        <SimpleTable
          headers={['Variable', 'Description', 'Example']}
          rows={variables.map((v) => [
            Cell.code(`{{.${v.name}}}`),
            v.description,
            Cell.code(v.example),
          ])}
        />
      </Card>

      {filteredTemplates.length > 0 && (
        <Card title="Configuration Templates">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Vendor</th>
                <th>Preview</th>
                <th>Devices</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>{filteredTemplates.map(renderTemplateRow)}</tbody>
          </table>
        </Card>
      )}

      {filteredTemplates.length === 0 && (
        <Card>
          <div className="empty-state">
            <p>No templates configured.</p>
            <p>Click "Add Template" to create your first configuration template.</p>
          </div>
        </Card>
      )}

      {/* Template Form Dialog - uses custom footer for Preview button */}
      <Dialog
        isOpen={showForm}
        onClose={handleCloseForm}
        title={editingTemplate ? 'Edit Template' : 'Add Template'}
        variant="wide"
        footer={
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
            <div className="flex-1" />
            <Button type="button" variant="secondary" onClick={handleCloseForm}>
              Cancel
            </Button>
            <Button type="submit" form="template-form">
              {editingTemplate ? 'Update Template' : 'Add Template'}
            </Button>
          </div>
        }
      >
        <form id="template-form" onSubmit={handleSubmit}>
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
              options={vendorSelectOptions}
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
            <div className="mb-8">
              <span className="text-xs text-secondary">
                Insert variable:
              </span>
              {variables.slice(0, 6).map((v) => (
                <Tooltip key={v.name} content={`${v.description} (e.g., ${v.example})`}>
                  <button
                    type="button"
                    onClick={() => insertVariable(v.name)}
                    className="variable-chip"
                  >
                    {v.name}
                  </button>
                </Tooltip>
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
              rows={10}
              className="code-textarea"
            />
          </div>
        </form>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog
        isOpen={showPreview}
        onClose={handleClosePreview}
        title="Template Preview"
        variant="wide"
      >
        <div className="flex-row flex-end mb-16">
          <SelectField
            label="Device"
            name="previewDevice"
            value={previewDeviceMAC}
            onChange={(e) => setPreviewDeviceMAC(e.target.value)}
            options={deviceOptions}
          />
          <Button onClick={handleGeneratePreview} disabled={previewLoading}>
            <Icon name={previewLoading ? 'hourglass_empty' : 'visibility'} size={14} />
            {previewLoading ? 'Generating...' : 'Generate'}
          </Button>
        </div>

        {previewDevice ? (
          <div className="info-box mb-16">
            <div className="preview-device-grid">
              <div><span className="text-secondary">Hostname:</span> <code>{previewDevice.hostname}</code></div>
              <div><span className="text-secondary">MAC:</span> <code>{previewDevice.mac}</code></div>
              <div><span className="text-secondary">IP:</span> <code>{previewDevice.ip}</code></div>
              {previewDevice.vendor && <div><span className="text-secondary">Vendor:</span> <code>{previewDevice.vendor}</code></div>}
              {previewDevice.serial_number && <div><span className="text-secondary">Serial:</span> <code>{previewDevice.serial_number}</code></div>}
            </div>
          </div>
        ) : (
          <div className="info-box info-box-primary mb-16">
            <p className="text-sm text-secondary">
              Using sample data: MAC {SAMPLE_DEVICE_FOR_PREVIEW.device.mac}, IP {SAMPLE_DEVICE_FOR_PREVIEW.device.ip}, Hostname {SAMPLE_DEVICE_FOR_PREVIEW.device.hostname}
            </p>
          </div>
        )}

        {previewOutput ? (
          <pre className="code-preview code-preview-lg">
            {previewOutput}
          </pre>
        ) : (
          <div className="empty-state">
            <Icon name="visibility" size={48} />
            <p>Select a device and click Generate to preview the configuration</p>
          </div>
        )}

        <div className="dialog-actions">
          <Button variant="secondary" onClick={handleClosePreview}>
            Close
          </Button>
        </div>
      </Dialog>

      {/* Templatizer Dialog */}
      <Dialog
        isOpen={showTemplatizer}
        onClose={() => setShowTemplatizer(false)}
        title="Templatize Configuration"
        variant="wide"
      >
        <Templatizer
          onComplete={(templateContent) => {
            // Close templatizer and open add form with the generated content
            setShowTemplatizer(false);
            setEditingTemplate(null);
            setFormData({
              ...EMPTY_TEMPLATE_FORM,
              content: templateContent,
            });
            setShowForm(true);
          }}
          onCancel={() => setShowTemplatizer(false)}
        />
      </Dialog>
    </LoadingState>
  );
}
