import { useState, useEffect, useCallback } from 'react';
import type { DiscoveredDevice, DeviceFormData, DiscoveryLog } from '@core';
import {
  useDiscovery,
  lookupVendorByMac,
  getDefaultTemplateForVendor,
  getServices,
  formatDate,
  formatExpiry,
  formatEventType,
  getEventTypeIcon,
} from '@core';
import { ActionBar } from './ActionBar';
import { Button } from './Button';
import { Card } from './Card';
import { Message } from './Message';
import { Table, Cell } from './Table';
import type { TableColumn, TableAction } from './Table';
import { VendorBadge } from './VendorBadge';
import { Icon, PlusIcon, RefreshIcon, SpinnerIcon } from './Icon';
import { TestContainers } from './TestContainers';

interface Props {
  onAddDevice: (device: Partial<DeviceFormData>) => void;
}

export function Discovery({ onAddDevice }: Props) {
  const {
    discovered,
    allLeases,
    loading,
    error,
    message,
    clearMessage,
    refresh,
    clearKnownDevices,
  } = useDiscovery({ autoRefresh: true, refreshInterval: 10000 });

  const [showAllLeases, setShowAllLeases] = useState(false);
  const [showLog, setShowLog] = useState(false);
  const [logs, setLogs] = useState<DiscoveryLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);

  const loadLogs = useCallback(async () => {
    setLogsLoading(true);
    try {
      const services = getServices();
      const result = await services.discovery.listLogs(50);
      setLogs(result);
    } catch (err) {
      console.error('Failed to load discovery logs:', err);
    } finally {
      setLogsLoading(false);
    }
  }, []);

  const clearLogs = useCallback(async () => {
    try {
      const services = getServices();
      await services.discovery.clearLogs();
      setLogs([]);
    } catch (err) {
      console.error('Failed to clear discovery logs:', err);
    }
  }, []);

  // Load logs when showing log view
  useEffect(() => {
    if (showLog) {
      loadLogs();
    }
  }, [showLog, loadLogs]);

  const handleAddDevice = (device: DiscoveredDevice) => {
    // Auto-detect vendor from MAC address
    const detectedVendor = lookupVendorByMac(device.mac);
    const vendor = detectedVendor && detectedVendor !== 'Local' ? detectedVendor : '';
    // Auto-select default template for this vendor
    const config_template = vendor ? getDefaultTemplateForVendor(vendor) : '';

    onAddDevice({
      mac: device.mac,
      ip: device.ip,
      hostname: device.hostname || '',
      vendor,
      serial_number: '',
      config_template,
      ssh_user: '',
      ssh_pass: '',
    });
  };

  if (loading && discovered.length === 0) {
    return <Card><p>Scanning for devices...</p></Card>;
  }

  if (error) {
    return <Card><div className="message error">{error}</div></Card>;
  }

  return (
    <>
      {message && <Message type={message.type} text={message.text} onDismiss={clearMessage} />}

      <ActionBar>
        <Button onClick={refresh}>
          <RefreshIcon size={16} />
          Refresh
        </Button>
        <Button
          variant="secondary"
          onClick={() => setShowAllLeases(!showAllLeases)}
        >
          <Icon name={showAllLeases ? 'visibility_off' : 'visibility'} size={16} />
          {showAllLeases ? 'Show New Only' : 'Show All Leases'}
        </Button>
        <Button
          variant="secondary"
          onClick={() => setShowLog(!showLog)}
        >
          <Icon name="history" size={16} />
          {showLog ? 'Hide Log' : 'Show Log'}
        </Button>
        <span className="helper-text-sm ml-auto">
          Auto-refreshing every 10s
        </span>
      </ActionBar>

      <Card
        title={`Discovered Devices (${discovered.length})`}
        headerAction={
          discovered.length > 0 && (
            <Button size="sm" variant="secondary" onClick={clearKnownDevices}>
              <Icon name="restart_alt" size={14} />
              Clear
            </Button>
          )
        }
      >
        <Table
          data={discovered}
          columns={[
            { header: 'MAC Address', accessor: (d) => Cell.code(d.mac) },
            { header: 'Vendor', accessor: (d) => <VendorBadge vendor={lookupVendorByMac(d.mac)} /> },
            { header: 'IP Address', accessor: 'ip' },
            { header: 'Hostname', accessor: (d) => Cell.dash(d.hostname) },
            {
              header: 'Lease Expires',
              accessor: (d) => <span className="status online">{formatExpiry(d.expires_at)}</span>,
            },
          ] as TableColumn<DiscoveredDevice>[]}
          getRowKey={(d) => d.mac}
          actions={[
            {
              icon: <><PlusIcon size={14} /> Add</>,
              label: 'Add as device',
              onClick: handleAddDevice,
              tooltip: 'Add as device',
            },
          ] as TableAction<DiscoveredDevice>[]}
          emptyMessage="No new devices discovered."
          emptyDescription="Devices that have received a DHCP lease but are not yet configured will appear here."
        />
      </Card>

      {showAllLeases && (
        <Card title={`All DHCP Leases (${allLeases.length})`}>
          <Table
            data={allLeases}
            columns={[
              { header: 'MAC Address', accessor: (d) => Cell.code(d.mac) },
              { header: 'Vendor', accessor: (d) => <VendorBadge vendor={lookupVendorByMac(d.mac)} /> },
              { header: 'IP Address', accessor: 'ip' },
              { header: 'Hostname', accessor: (d) => Cell.dash(d.hostname) },
              { header: 'Lease Expires', accessor: (d) => formatExpiry(d.expires_at) },
              {
                header: 'Status',
                accessor: (d) => {
                  const isKnown = !discovered.find(disc => disc.mac === d.mac);
                  return (
                    <span className={`status ${isKnown ? 'online' : 'provisioning'}`}>
                      {isKnown ? 'Configured' : 'New'}
                    </span>
                  );
                },
              },
            ] as TableColumn<DiscoveredDevice>[]}
            getRowKey={(d) => d.mac}
            emptyMessage="No DHCP leases found."
            emptyDescription="Make sure devices are connected and requesting DHCP addresses."
          />
        </Card>
      )}

      {showLog && (
        <Card
          title={`Discovery Log (${logs.length})`}
          headerAction={
            <div className="flex-row">
              <Button size="sm" variant="secondary" onClick={loadLogs} disabled={logsLoading}>
                {logsLoading ? <SpinnerIcon size={14} /> : <RefreshIcon size={14} />}
              </Button>
              {logs.length > 0 && (
                <Button size="sm" variant="secondary" onClick={clearLogs}>
                  <Icon name="delete" size={14} />
                  Clear
                </Button>
              )}
            </div>
          }
        >
          {logsLoading && logs.length === 0 ? (
            <div className="empty-state">
              <SpinnerIcon size={32} />
              <p>Loading discovery log...</p>
            </div>
          ) : logs.length === 0 ? (
            <div className="empty-state">
              <Icon name="history" size={48} />
              <p>No discovery events logged yet.</p>
              <p className="helper-text">
                Events will appear here when devices are discovered or leases are renewed.
              </p>
            </div>
          ) : (
            <div className="discovery-log">
              {logs.map((log) => (
                <div key={log.id} className="discovery-log-entry">
                  <div className="discovery-log-icon">
                    <Icon name={getEventTypeIcon(log.event_type)} size={18} />
                  </div>
                  <div className="discovery-log-content">
                    <div className="discovery-log-header">
                      <span className={`discovery-log-type ${log.event_type}`}>
                        {formatEventType(log.event_type)}
                      </span>
                      <code>{log.mac}</code>
                      <span className="discovery-log-ip">{log.ip}</span>
                    </div>
                    <div className="discovery-log-details">
                      {log.hostname && <span>{log.hostname}</span>}
                      {log.message && <span className="discovery-log-message">{log.message}</span>}
                    </div>
                  </div>
                  <div className="discovery-log-time">
                    {formatDate(log.created_at)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      <Card>
        <h3>
          <Icon name="info" size={18} />
          About Device Discovery
        </h3>
        <p className="helper-text">
          This page shows devices that have received a DHCP lease from the ZTP server but have not yet been configured.
          Click "Add" to create a device configuration entry, which will allow the device to receive its provisioning config.
        </p>
        <ul className="helper-text mt-8">
          <li>Discovered devices are automatically detected from the DHCP lease file</li>
          <li>Once added, devices will appear in the main Devices list</li>
          <li>The lease expiry shows how long until the DHCP lease needs to be renewed</li>
        </ul>
      </Card>

      <TestContainers />
    </>
  );
}
