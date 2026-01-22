import { useState, useEffect } from 'react';
import { useSettings, useLocalSettings, useLocalAddresses, configureServices } from '@core';
import type { Settings, NetworkInterface } from '@core';
import { Button } from './Button';
import { Dialog } from './Dialog';
import { FormField } from './FormField';
import { LayoutSettings } from './LayoutSettings';
import { Message } from './Message';
import { Icon } from './Icon';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsDialog({ isOpen, onClose }: Props) {
  const { settings, loading, saving, message, load, save } = useSettings();
  const { settings: localSettings, updateSettings: updateLocalSettings } = useLocalSettings();
  const { addresses, loading: addressesLoading, refresh: refreshAddresses } = useLocalAddresses();
  const [formData, setFormData] = useState<Settings | null>(null);
  const [localFormData, setLocalFormData] = useState({ apiUrl: '' });

  useEffect(() => {
    if (isOpen) {
      load();
      refreshAddresses();
      setLocalFormData({ apiUrl: localSettings.apiUrl });
    }
  }, [isOpen, load, refreshAddresses, localSettings.apiUrl]);

  useEffect(() => {
    if (settings) {
      setFormData({ ...settings });
    }
  }, [settings]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!formData) return;
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev!,
      [name]: type === 'number' ? parseInt(value, 10) : value,
    }));
  };

  const handleLocalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setLocalFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData) return;

    // Save local settings first (API URL change takes effect on next request)
    if (localFormData.apiUrl !== localSettings.apiUrl) {
      updateLocalSettings({ apiUrl: localFormData.apiUrl });
      // Update the service configuration to use the new API URL
      configureServices({ baseUrl: localFormData.apiUrl });
    }

    const success = await save(formData);
    if (success) {
      setTimeout(() => onClose(), 1500);
    }
  };

  return (
    <Dialog isOpen={isOpen} onClose={onClose} title="Settings" variant="wide">
      {message && <Message type={message.type} text={message.text} />}

      {loading ? (
        <p>Loading settings...</p>
      ) : !formData ? (
        <p>Failed to load settings</p>
      ) : (
        <form onSubmit={handleSubmit}>
          <div className="settings-section">
            <h3>
              <Icon name="cloud" size={18} />
              Connection
            </h3>
            <div className="form-row">
              <FormField
                label="API URL"
                name="apiUrl"
                type="text"
                value={localFormData.apiUrl}
                onChange={handleLocalChange}
                placeholder="/api or http://server:8080/api"
              />
            </div>
            <p className="settings-hint">
              Base URL for API requests. Use "/api" for same-origin or full URL for remote server.
            </p>
          </div>

          <div className="settings-section">
            <h3>
              <Icon name="terminal" size={18} />
              SSH Defaults
            </h3>
            <div className="form-row">
              <FormField
                label="Default Username"
                name="default_ssh_user"
                type="text"
                value={formData.default_ssh_user}
                onChange={handleChange}
              />
              <FormField
                label="Default Password"
                name="default_ssh_pass"
                type="password"
                value={formData.default_ssh_pass}
                onChange={handleChange}
              />
            </div>
            <div className="form-row">
              <FormField
                label="Backup Command"
                name="backup_command"
                type="text"
                value={formData.backup_command}
                onChange={handleChange}
              />
              <FormField
                label="Backup Delay (seconds)"
                name="backup_delay"
                type="number"
                value={formData.backup_delay}
                onChange={handleChange}
                min={0}
              />
            </div>
          </div>

          <div className="settings-section">
            <h3>
              <Icon name="lan" size={18} />
              DHCP Settings
            </h3>
            <div className="form-row">
              <FormField
                label="Range Start"
                name="dhcp_range_start"
                type="text"
                value={formData.dhcp_range_start}
                onChange={handleChange}
              />
              <FormField
                label="Range End"
                name="dhcp_range_end"
                type="text"
                value={formData.dhcp_range_end}
                onChange={handleChange}
              />
              <FormField
                label="Subnet Mask"
                name="dhcp_subnet"
                type="text"
                value={formData.dhcp_subnet}
                onChange={handleChange}
              />
            </div>
            <div className="form-row">
              <FormField
                label="Gateway"
                name="dhcp_gateway"
                type="text"
                value={formData.dhcp_gateway}
                onChange={handleChange}
              />
              <FormField
                label="TFTP Server IP"
                name="tftp_server_ip"
                type="text"
                value={formData.tftp_server_ip}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="settings-section">
            <h3>
              <Icon name="router" size={18} />
              OpenGear ZTP Enrollment
            </h3>
            <div className="form-row">
              <FormField
                label="Enrollment URL"
                name="opengear_enroll_url"
                type="text"
                value={formData.opengear_enroll_url || ''}
                onChange={handleChange}
                placeholder="e.g., 192.168.1.100 or lighthouse.example.com"
              />
              <FormField
                label="Bundle Name"
                name="opengear_enroll_bundle"
                type="text"
                value={formData.opengear_enroll_bundle || ''}
                onChange={handleChange}
                placeholder="Optional bundle name"
              />
              <FormField
                label="Enrollment Password"
                name="opengear_enroll_password"
                type="password"
                value={formData.opengear_enroll_password || ''}
                onChange={handleChange}
                placeholder="Enrollment password"
              />
            </div>
          </div>

          <div className="settings-section">
            <h3>
              <Icon name="wifi" size={18} />
              Server Network Interfaces
            </h3>
            {addressesLoading ? (
              <p className="settings-hint">Loading network interfaces...</p>
            ) : addresses.length === 0 ? (
              <p className="settings-hint">No network interfaces found</p>
            ) : (
              <div className="local-addresses">
                {addresses
                  .filter((iface: NetworkInterface) => !iface.is_loopback)
                  .map((iface: NetworkInterface) => (
                    <div key={iface.name} className="address-item">
                      <span className="address-name">{iface.name}</span>
                      <span className="address-ips">
                        {iface.addresses
                          .filter((addr: string) => !addr.includes(':')) // Filter out IPv6
                          .map((addr: string) => addr.split('/')[0]) // Remove CIDR
                          .join(', ') || 'No IPv4'}
                      </span>
                    </div>
                  ))}
              </div>
            )}
            <p className="settings-hint">
              Use one of these addresses for the API URL when connecting from another device.
            </p>
          </div>

          <div className="settings-section">
            <h3>
              <Icon name="view_quilt" size={18} />
              Layout
            </h3>
            <LayoutSettings />
          </div>

          <div className="dialog-actions">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" isLoading={saving}>
              {saving ? 'Saving...' : 'Save Settings'}
            </Button>
          </div>
        </form>
      )}
    </Dialog>
  );
}
