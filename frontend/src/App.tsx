import { useState } from 'react';
import { useDevices, useWebTheme } from './core';
import { DeviceList } from './components/DeviceList';
import { DeviceForm } from './components/DeviceForm';
import { SettingsDialog } from './components/SettingsDialog';
import {
  Button,
  DhcpOptions,
  DropdownSelect,
  Message,
  TemplateBuilder,
  ThemeSelector,
  Icon,
  PlusIcon,
  RefreshIcon,
  VendorManagement,
} from './components';
import type { DropdownOption } from './components';
import type { Device } from './core';
import logo from './assets/image.png';

const PAGES: DropdownOption[] = [
  { id: 'devices', label: 'Devices', icon: 'devices', description: 'Manage network devices' },
  { id: 'templates', label: 'Templates', icon: 'description', description: 'Build config templates' },
  { id: 'vendors', label: 'Vendors', icon: 'business', description: 'Configure vendor settings' },
  { id: 'dhcp', label: 'DHCP Options', icon: 'lan', description: 'Manage DHCP options' },
];

function App() {
  const [activePage, setActivePage] = useState(() => {
    return localStorage.getItem('ztp_active_page') || 'devices';
  });

  // Persist active page to localStorage
  const handlePageChange = (page: string) => {
    setActivePage(page);
    localStorage.setItem('ztp_active_page', page);
  };
  const [editingDevice, setEditingDevice] = useState<Device | null>(null);
  const [showDeviceForm, setShowDeviceForm] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const { theme, setTheme } = useWebTheme();
  const {
    devices,
    loading,
    message,
    refresh,
    createDevice,
    updateDevice,
    deleteDevice,
    triggerBackup,
  } = useDevices();

  const handleSubmitDevice = async (device: Partial<Device>) => {
    if (editingDevice) {
      await updateDevice(editingDevice.mac, device);
    } else {
      await createDevice(device);
    }
  };

  const handleEdit = (device: Device) => {
    setEditingDevice(device);
    setShowDeviceForm(true);
  };

  const handleCloseForm = () => {
    setEditingDevice(null);
    setShowDeviceForm(false);
  };

  return (
    <>
      <header>
        <div className="header-content">
          <img src={logo} alt="Logo" className="header-logo" />
          <h1>ZTP Manager</h1>
          <DropdownSelect
            options={PAGES}
            value={activePage}
            onChange={handlePageChange}
            placeholder="Select page..."
            icon="menu"
            className="header-nav"
          />
        </div>
      </header>

      <div className="container">
        {message && <Message type={message.type} text={message.text} />}

        {activePage === 'devices' && (
          <>
            <div className="actions-bar">
              <Button
                onClick={() => {
                  setEditingDevice(null);
                  setShowDeviceForm(true);
                }}
              >
                <PlusIcon size={16} />
                Add Device
              </Button>
              <Button variant="secondary" onClick={refresh}>
                <RefreshIcon size={16} />
                Refresh
              </Button>
            </div>

            {loading ? (
              <div className="card">Loading devices...</div>
            ) : (
              <DeviceList
                devices={devices}
                onEdit={handleEdit}
                onDelete={deleteDevice}
                onBackup={triggerBackup}
              />
            )}
          </>
        )}

        {activePage === 'templates' && (
          <TemplateBuilder />
        )}

        {activePage === 'vendors' && (
          <VendorManagement devices={devices} />
        )}

        {activePage === 'dhcp' && (
          <DhcpOptions />
        )}
      </div>

      <footer className="footer">
        <div className="footer-content">
          <span className="footer-text">ZTP Manager</span>
          <div className="footer-actions">
            <button
              className="theme-toggle"
              onClick={() => setShowSettings(true)}
              title="Settings"
            >
              <Icon name="settings" size={20} />
            </button>
            <ThemeSelector theme={theme} onThemeChange={setTheme} />
          </div>
        </div>
      </footer>

      <DeviceForm
        isOpen={showDeviceForm}
        device={editingDevice}
        onSubmit={handleSubmitDevice}
        onClose={handleCloseForm}
      />

      <SettingsDialog
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
      />
    </>
  );
}

export default App;
