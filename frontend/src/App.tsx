import { useState, useCallback, useEffect } from 'react';
import { useDevices, useWebTheme, useWebSocket, useTemplates, useVendors, lookupVendorByMac, setVendorCache, DeviceDiscoveredPayload, getServices } from '@core';
import { DeviceList } from './components/DeviceList';
import { DeviceForm } from './components/DeviceForm';
import { SettingsDialog } from './components/SettingsDialog';
import {
  Button,
  Dashboard,
  DhcpOptions,
  Discovery,
  DropdownSelect,
  Message,
  TemplateBuilder,
  ThemeSelector,
  Icon,
  PlusIcon,
  RefreshIcon,
  SpinnerIcon,
  VendorManagement,
  ToastProvider,
  useToastActions,
} from './components';
import type { DropdownOption } from './components';
import type { Device, DeviceFormData } from '@core';
import { LayoutProvider } from './context';
import logo from './assets/image.png';

const PAGES: DropdownOption[] = [
  { id: 'dashboard', label: 'Dashboard', icon: 'dashboard', description: 'Overview and activity' },
  { id: 'devices', label: 'Devices', icon: 'devices', description: 'Manage network devices' },
  { id: 'discovery', label: 'Discovery', icon: 'search', description: 'Discover new devices' },
  { id: 'templates', label: 'Templates', icon: 'description', description: 'Build config templates' },
  { id: 'vendors', label: 'Vendors', icon: 'business', description: 'Configure vendor settings' },
  { id: 'dhcp', label: 'DHCP Options', icon: 'lan', description: 'Manage DHCP options' },
];

// Inner component that uses hooks requiring ToastProvider context
function AppContent() {
  const [activePage, setActivePage] = useState(() => {
    return localStorage.getItem('ztp_active_page') || 'dashboard';
  });

  // Persist active page to localStorage
  const handlePageChange = (page: string) => {
    setActivePage(page);
    localStorage.setItem('ztp_active_page', page);
  };
  const [editingDevice, setEditingDevice] = useState<Device | null>(null);
  const [initialDeviceData, setInitialDeviceData] = useState<Partial<DeviceFormData> | null>(null);
  const [showDeviceForm, setShowDeviceForm] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [spawningTestHost, setSpawningTestHost] = useState(false);

  const { theme, setTheme } = useWebTheme();
  const toast = useToastActions();
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
  const { templates } = useTemplates({ vendorFilter: 'all' });
  const { vendors } = useVendors();

  // Initialize vendor cache for MAC lookups when vendors are loaded
  useEffect(() => {
    if (vendors.length > 0) {
      setVendorCache(vendors);
    }
  }, [vendors]);

  // WebSocket handler for device discovery notifications
  const handleDeviceDiscovered = useCallback((payload: DeviceDiscoveredPayload) => {
    const vendorId = lookupVendorByMac(payload.mac);
    let vendorText = '';
    if (vendorId && vendorId !== 'local') {
      const vendorInfo = vendors.find(v => v.id === vendorId);
      vendorText = vendorInfo ? ` (${vendorInfo.name})` : ` (${vendorId})`;
    }
    const action = {
      label: 'View',
      onClick: () => handlePageChange('discovery'),
    };
    toast.info(`New device discovered: ${payload.ip}${vendorText}`, { action });
  }, [toast, vendors]);

  // Connect to WebSocket for real-time notifications
  useWebSocket({
    autoConnect: true,
    onDeviceDiscovered: handleDeviceDiscovered,
  });

  // Clear discovery tracking so all devices will be treated as new
  const handleClearDiscovery = useCallback(async () => {
    try {
      const services = getServices();
      await services.discovery.clearTracking();
      toast.success('Discovery tracking cleared');
    } catch (err) {
      console.error('Clear discovery error:', err);
      const message = err instanceof Error ? err.message : String(err);
      toast.error(`Failed to clear discovery: ${message}`);
    }
  }, [toast]);

  // Spawn a test host container
  const handleSpawnTestHost = useCallback(async () => {
    setSpawningTestHost(true);
    try {
      const services = getServices();
      const container = await services.testContainers.spawn({});
      toast.success(`Test host spawned: ${container.hostname} (${container.ip})`);
    } catch (err) {
      console.error('Spawn test host error:', err);
      const message = err instanceof Error ? err.message : String(err);
      toast.error(`Failed to spawn test host: ${message}`);
    } finally {
      setSpawningTestHost(false);
    }
  }, [toast]);

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
    setInitialDeviceData(null);
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

        {activePage === 'dashboard' && (
          <Dashboard onNavigate={handlePageChange} />
        )}

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
                onRefresh={refresh}
              />
            )}
          </>
        )}

        {activePage === 'discovery' && (
          <Discovery
            onAddDevice={(device) => {
              setEditingDevice(null);
              setInitialDeviceData(device);
              setShowDeviceForm(true);
            }}
          />
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
              onClick={handleSpawnTestHost}
              disabled={spawningTestHost}
              title="Spawn test host"
            >
              {spawningTestHost ? <SpinnerIcon size={20} /> : <Icon name="add_circle" size={20} />}
            </button>
            {activePage !== 'discovery' && (
              <button
                className="theme-toggle"
                onClick={handleClearDiscovery}
                title="Reset discovery tracking"
              >
                <Icon name="restart_alt" size={20} />
              </button>
            )}
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
        initialData={initialDeviceData}
        templates={templates}
        vendors={vendors}
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

// Main App component wraps with providers
function App() {
  return (
    <LayoutProvider>
      <ToastProvider>
        <AppContent />
      </ToastProvider>
    </LayoutProvider>
  );
}

export default App;
