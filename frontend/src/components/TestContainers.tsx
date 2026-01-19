import { useState, useMemo } from 'react';
import type { SpawnContainerRequest } from '@core';
import {
  useTestContainers,
  useVendors,
  CONFIG_METHOD_OPTIONS,
  generateMac,
  getVendorPrefixOptions,
  getVendorClassForVendor,
} from '@core';
import { Button } from './Button';
import { Card } from './Card';
import { Dialog } from './Dialog';
import { DialogActions } from './DialogActions';
import { FormField } from './FormField';
import { SelectField } from './SelectField';
import { Message } from './Message';
import { Tooltip } from './Tooltip';
import { Icon, PlusIcon, RefreshIcon, TrashIcon } from './Icon';

export function TestContainers() {
  const {
    containers,
    loading,
    error,
    message,
    clearMessage,
    refresh,
    spawn,
    remove,
  } = useTestContainers({ autoRefresh: true, refreshInterval: 5000 });
  const { vendors } = useVendors();

  const [showSpawnDialog, setShowSpawnDialog] = useState(false);
  const [spawning, setSpawning] = useState(false);
  const [formData, setFormData] = useState<SpawnContainerRequest>({
    hostname: '',
    mac: '',
    vendor_class: '',
    config_method: 'tftp',
  });
  const [selectedVendorPrefix, setSelectedVendorPrefix] = useState('');

  // Get vendor prefix options from API vendors
  const vendorPrefixOptions = useMemo(() => getVendorPrefixOptions(vendors), [vendors]);

  // Build vendor class options from API vendors
  const vendorClassOptions = useMemo(() => [
    { value: '', label: 'None (random)' },
    ...vendors.map(v => ({ value: getVendorClassForVendor(v.id) || v.name, label: v.name })),
  ], [vendors]);

  const handleGenerateMac = () => {
    const mac = generateMac(selectedVendorPrefix || undefined);
    setFormData(prev => ({ ...prev, mac }));
  };

  const handleVendorPrefixChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const prefix = e.target.value;
    setSelectedVendorPrefix(prefix);
    // Auto-generate MAC with new prefix
    const mac = generateMac(prefix || undefined);
    // Find the vendor name for this prefix and auto-fill vendor class
    const selectedOption = vendorPrefixOptions.find(opt => opt.value === prefix);
    const vendorClass = selectedOption ? getVendorClassForVendor(selectedOption.vendor) : '';
    setFormData(prev => ({ ...prev, mac, vendor_class: vendorClass }));
  };

  const handleSpawn = async () => {
    setSpawning(true);
    try {
      await spawn(formData);
      setShowSpawnDialog(false);
      setFormData({ hostname: '', mac: '', vendor_class: '', config_method: 'tftp' });
      setSelectedVendorPrefix('');
    } finally {
      setSpawning(false);
    }
  };

  const handleOpenDialog = () => {
    // Generate initial MAC
    const mac = generateMac();
    setFormData({ hostname: '', mac, vendor_class: '', config_method: 'tftp' });
    setSelectedVendorPrefix('');
    setShowSpawnDialog(true);
  };

  if (loading && containers.length === 0) {
    return <Card><p>Loading test containers...</p></Card>;
  }

  return (
    <>
      {message && <Message type={message.type} text={message.text} onDismiss={clearMessage} />}

      <Card title="Test Containers">
        <div className="actions-bar" style={{ marginBottom: '16px' }}>
          <Button onClick={handleOpenDialog}>
            <PlusIcon size={16} />
            Spawn Test Device
          </Button>
          <Button variant="secondary" onClick={refresh}>
            <RefreshIcon size={16} />
            Refresh
          </Button>
          <span style={{ marginLeft: 'auto', fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
            {containers.length} container{containers.length !== 1 ? 's' : ''} running
          </span>
        </div>

        {error && (
          <div className="message error" style={{ marginBottom: '16px' }}>
            <Icon name="error" size={16} />
            <span>Docker not available: {error}</span>
          </div>
        )}

        {containers.length === 0 ? (
          <div className="empty-state">
            <Icon name="dns" size={48} />
            <p>No test containers running.</p>
            <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
              Spawn a test device to simulate network equipment requesting DHCP.
            </p>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Hostname</th>
                <th>MAC Address</th>
                <th>IP Address</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {containers.map((container) => (
                <tr key={container.id}>
                  <td>{container.hostname}</td>
                  <td><code>{container.mac}</code></td>
                  <td>{container.ip || '—'}</td>
                  <td>
                    <span className={`status ${container.status === 'running' ? 'online' : 'offline'}`}>
                      {container.status}
                    </span>
                  </td>
                  <td>
                    <div className="actions">
                      <Tooltip content="Remove container">
                        <Button
                          size="sm"
                          variant="danger"
                          onClick={() => remove(container.id)}
                        >
                          <TrashIcon size={14} />
                        </Button>
                      </Tooltip>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <Card>
        <h3>
          <Icon name="info" size={18} />
          About Test Containers
        </h3>
        <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
          Test containers simulate network devices requesting DHCP leases. They will appear in the Discovery page
          if not yet configured as a device. Use these to test your ZTP workflow end-to-end.
        </p>
        <ul style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', marginTop: '8px' }}>
          <li>Each container runs a DHCP client and SSH server</li>
          <li>You can specify a vendor MAC prefix to simulate specific equipment</li>
          <li>DHCP vendor class identifier helps identify the device type</li>
          <li>Config fetch method: TFTP (traditional), HTTP (modern), or both</li>
        </ul>
      </Card>

      <Dialog
        isOpen={showSpawnDialog}
        onClose={() => setShowSpawnDialog(false)}
        title="Spawn Test Device"
        variant="wide"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <FormField
            label="Hostname"
            name="hostname"
            type="text"
            value={formData.hostname || ''}
            onChange={(e) => setFormData(prev => ({ ...prev, hostname: e.target.value }))}
            placeholder="test-switch-01 (auto-generated if empty)"
          />

          <div>
            <label style={{ display: 'block', marginBottom: '4px', fontWeight: 500 }}>
              MAC Address Vendor Prefix
            </label>
            <SelectField
              label=""
              name="vendor_prefix"
              value={selectedVendorPrefix}
              onChange={handleVendorPrefixChange}
              options={vendorPrefixOptions}
            />
            <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '4px' }}>
              Select a vendor to use their OUI prefix, or leave random for a locally-administered MAC
            </p>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '4px', fontWeight: 500 }}>
              MAC Address
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                name="mac"
                value={formData.mac || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, mac: e.target.value }))}
                placeholder="aa:bb:cc:dd:ee:ff"
                style={{ flex: 1 }}
              />
              <Button type="button" variant="secondary" onClick={handleGenerateMac}>
                <RefreshIcon size={14} />
                Generate
              </Button>
            </div>
          </div>

          <SelectField
            label="DHCP Vendor Class (Option 60)"
            name="vendor_class"
            value={formData.vendor_class || ''}
            onChange={(e) => setFormData(prev => ({ ...prev, vendor_class: e.target.value }))}
            options={vendorClassOptions}
          />
          <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '-12px' }}>
            The vendor class identifier is sent in DHCP requests to identify the device type
          </p>

          <div>
            <label style={{ display: 'block', marginBottom: '4px', fontWeight: 500 }}>
              Config Fetch Method
            </label>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              {CONFIG_METHOD_OPTIONS.map(option => (
                <label
                  key={option.value}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '8px',
                    padding: '8px 12px',
                    border: `2px solid ${formData.config_method === option.value ? 'var(--color-primary)' : 'var(--color-border)'}`,
                    borderRadius: '6px',
                    cursor: 'pointer',
                    backgroundColor: formData.config_method === option.value ? 'var(--color-bg-secondary)' : 'transparent',
                    flex: '1',
                    minWidth: '140px',
                  }}
                >
                  <input
                    type="radio"
                    name="config_method"
                    value={option.value}
                    checked={formData.config_method === option.value}
                    onChange={(e) => setFormData(prev => ({ ...prev, config_method: e.target.value as 'tftp' | 'http' | 'both' }))}
                    style={{ marginTop: '2px' }}
                  />
                  <div>
                    <div style={{ fontWeight: 500 }}>{option.label}</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>
                      {option.description}
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <details style={{ marginTop: '8px' }}>
            <summary style={{ cursor: 'pointer', fontWeight: 500, marginBottom: '8px' }}>
              Configured Vendor MAC Prefixes (OUI Reference)
            </summary>
            <div style={{
              maxHeight: '200px',
              overflow: 'auto',
              fontSize: '0.75rem',
              backgroundColor: 'var(--color-bg-secondary)',
              padding: '12px',
              borderRadius: '4px',
            }}>
              <table style={{ width: '100%', fontSize: 'inherit' }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left', padding: '4px 8px' }}>Vendor</th>
                    <th style={{ textAlign: 'left', padding: '4px 8px' }}>MAC Prefixes (OUI)</th>
                  </tr>
                </thead>
                <tbody>
                  {vendors.filter(v => v.mac_prefixes && v.mac_prefixes.length > 0).map(v => (
                    <tr key={v.id}>
                      <td style={{ padding: '4px 8px', verticalAlign: 'top' }}>{v.name}</td>
                      <td style={{ padding: '4px 8px' }}>
                        <code style={{ fontSize: '0.7rem' }}>
                          {v.mac_prefixes.slice(0, 5).join(', ')}
                          {v.mac_prefixes.length > 5 && ` (+${v.mac_prefixes.length - 5} more)`}
                        </code>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>

          <DialogActions>
            <Button type="button" variant="secondary" onClick={() => setShowSpawnDialog(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={handleSpawn} disabled={spawning}>
              {spawning ? 'Spawning...' : 'Spawn Container'}
            </Button>
          </DialogActions>
        </div>
      </Dialog>
    </>
  );
}
