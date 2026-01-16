import { useState } from 'react';
import { useDevices, useWebTheme } from './core';
import { DeviceList } from './components/DeviceList';
import { DeviceForm } from './components/DeviceForm';
import { SettingsDialog } from './components/SettingsDialog';
import { Button, Message, ThemeSelector, Icon, PlusIcon, RefreshIcon } from './components';
import type { Device } from './core';
import logo from './assets/image.png';

function App() {
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

  const handleCreateDevice = async (device: Partial<Device>) => {
    const success = await createDevice(device);
    if (success) {
      setShowDeviceForm(false);
    }
  };

  const handleUpdateDevice = async (device: Partial<Device>) => {
    if (!editingDevice) return;
    const success = await updateDevice(editingDevice.mac, device);
    if (success) {
      setEditingDevice(null);
      setShowDeviceForm(false);
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
        </div>
      </header>

      <div className="container">
        {message && <Message type={message.type} text={message.text} />}

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
        onSubmit={editingDevice ? handleUpdateDevice : handleCreateDevice}
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
