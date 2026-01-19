import { useState } from 'react';
import { useBackups, useAsyncModal, formatDate, getServices } from '@core';
import type { Device, ConnectResult, ConfigResult, BackupContentResult, Backup, NetBoxStatus } from '@core';
import { Button } from './Button';
import { Card } from './Card';
import { Modal } from './Modal';
import { Table, Cell } from './Table';
import type { TableColumn, TableAction } from './Table';
import { Icon, EditIcon, DownloadIcon, ClockIcon, TrashIcon, SpinnerIcon } from './Icon';

interface Props {
  devices: Device[];
  onEdit: (device: Device) => void;
  onDelete: (mac: string) => Promise<boolean>;
  onBackup: (mac: string) => Promise<boolean>;
  onRefresh?: () => void;
}

type NetBoxSyncResult = { message: string; result: { created: number; updated: number; errors?: string[] } };

export function DeviceList({ devices, onEdit, onDelete, onBackup, onRefresh }: Props) {
  // Connection test modal state
  const connectModal = useAsyncModal<Device, ConnectResult>();

  // Config viewer modal state
  const configModal = useAsyncModal<Device, ConfigResult>();
  const [configTab, setConfigTab] = useState<'tftp' | 'backups'>('tftp');
  const [selectedBackup, setSelectedBackup] = useState<Backup | null>(null);
  const [backupContentLoading, setBackupContentLoading] = useState(false);
  const [backupContent, setBackupContent] = useState<BackupContentResult | null>(null);

  // NetBox modal state
  const netboxModal = useAsyncModal<Device, NetBoxStatus>();
  const [netboxSyncResult, setNetboxSyncResult] = useState<NetBoxSyncResult | null>(null);

  const { backups, loading: backupsLoading, loadBackups, clear: clearBackups } = useBackups();

  const handleConnect = async (device: Device) => {
    connectModal.open(device);
    const result = await connectModal.execute(async () => {
      const services = getServices();
      return services.devices.connect(device.mac);
    });
    // Refresh device list to show updated status
    if (result?.ping.reachable && onRefresh) {
      onRefresh();
    }
    // Handle connection failure - set a fallback result
    if (!result && !connectModal.result) {
      connectModal.setResult({
        ping: { reachable: false, error: 'Connection failed' },
        ssh: { connected: false, error: 'Could not attempt SSH' },
        success: false,
      });
    }
  };

  const handleViewConfig = async (device: Device) => {
    configModal.open(device);
    setConfigTab('tftp');
    setSelectedBackup(null);
    setBackupContent(null);
    // Load both TFTP config and backups in parallel
    const result = await configModal.execute(async () => {
      const services = getServices();
      const [configRes] = await Promise.all([
        services.devices.getConfig(device.mac),
        loadBackups(device.mac),
      ]);
      return configRes;
    });
    // Handle failure - set a fallback result
    if (!result && !configModal.result) {
      configModal.setResult({
        mac: device.mac,
        hostname: device.hostname,
        filename: '',
        content: '',
        exists: false,
      });
    }
  };

  const handleCloseConfig = () => {
    configModal.close();
    setSelectedBackup(null);
    setBackupContent(null);
    clearBackups();
  };

  const handleViewBackupContent = async (backup: Backup) => {
    setSelectedBackup(backup);
    setBackupContent(null);
    setBackupContentLoading(true);
    try {
      const services = getServices();
      const result = await services.devices.getBackupContent(backup.id);
      setBackupContent(result);
    } catch (err) {
      setBackupContent({
        id: backup.id,
        filename: backup.filename,
        content: '',
        exists: false,
      });
    } finally {
      setBackupContentLoading(false);
    }
  };

  const handleShowNetbox = async (device: Device) => {
    netboxModal.open(device);
    setNetboxSyncResult(null);
    const result = await netboxModal.execute(async () => {
      const services = getServices();
      return services.netbox.getStatus();
    });
    // Handle failure - set a fallback result
    if (!result && !netboxModal.result) {
      netboxModal.setResult({
        connected: false,
        configured: false,
        error: 'Failed to check NetBox status',
      });
    }
  };

  const handlePushToNetbox = async () => {
    if (!netboxModal.item) return;
    netboxModal.setLoading(true);
    try {
      const services = getServices();
      const result = await services.netbox.syncPush();
      setNetboxSyncResult(result);
    } catch (err) {
      setNetboxSyncResult({
        message: 'Sync failed',
        result: { created: 0, updated: 0, errors: [err instanceof Error ? err.message : 'Unknown error'] },
      });
    } finally {
      netboxModal.setLoading(false);
    }
  };

  const handleCloseNetbox = () => {
    netboxModal.close();
    setNetboxSyncResult(null);
  };

  const columns: TableColumn<Device>[] = [
    { header: 'Hostname', accessor: 'hostname' },
    { header: 'Model', accessor: (d) => Cell.dash(d.model), hideOnMobile: true },
    { header: 'Serial Number', accessor: (d) => Cell.dash(d.serial_number), hideOnMobile: true },
    { header: 'MAC Address', accessor: (d) => Cell.code(d.mac) },
    { header: 'IP Address', accessor: 'ip' },
    { header: 'Vendor', accessor: (d) => Cell.dash(d.vendor), hideOnMobile: true },
    { header: 'Status', accessor: (d) => Cell.status(d.status, d.status as 'online' | 'offline' | 'provisioning') },
    { header: 'Last Backup', accessor: (d) => formatDate(d.last_backup), hideOnMobile: true },
  ];

  const actions: TableAction<Device>[] = [
    {
      icon: (d) => connectModal.item?.mac === d.mac && connectModal.loading ? <SpinnerIcon size={14} /> : <Icon name="cable" size={14} />,
      label: 'Test connectivity',
      onClick: handleConnect,
      variant: 'secondary',
      tooltip: 'Test connectivity',
      loading: (d) => connectModal.item?.mac === d.mac && connectModal.loading,
    },
    {
      icon: <EditIcon size={14} />,
      label: 'Edit',
      onClick: onEdit,
      variant: 'secondary',
      tooltip: 'Edit device',
    },
    {
      icon: <DownloadIcon size={14} />,
      label: 'Backup',
      onClick: (d) => onBackup(d.mac),
      tooltip: 'Trigger backup',
    },
    {
      icon: (d) => configModal.item?.mac === d.mac && configModal.loading ? <SpinnerIcon size={14} /> : <Icon name="description" size={14} />,
      label: 'View configs',
      onClick: handleViewConfig,
      variant: 'secondary',
      tooltip: 'View configs',
      loading: (d) => configModal.item?.mac === d.mac && configModal.loading,
    },
    {
      icon: (d) => netboxModal.item?.mac === d.mac && netboxModal.loading ? <SpinnerIcon size={14} /> : <Icon name="cloud" size={14} />,
      label: 'NetBox',
      onClick: handleShowNetbox,
      variant: 'secondary',
      tooltip: 'NetBox info',
      loading: (d) => netboxModal.item?.mac === d.mac && netboxModal.loading,
    },
    {
      icon: <TrashIcon size={14} />,
      label: 'Delete',
      onClick: (d) => {
        if (confirm(`Delete device ${d.hostname}?`)) {
          onDelete(d.mac);
        }
      },
      variant: 'danger',
      tooltip: 'Delete device',
    },
  ];

  return (
    <>
      <Card title="Devices">
        <Table
          data={devices}
          columns={columns}
          getRowKey={(d) => d.mac}
          actions={actions}
          emptyMessage="No devices configured yet."
          emptyDescription="Add a device using the button above."
        />
      </Card>

      {connectModal.isOpen && connectModal.item && (
        <Modal title={`Connection Test: ${connectModal.item.hostname}`} onClose={connectModal.close}>
          {connectModal.loading ? (
            <div className="connect-loading">
              <SpinnerIcon size={32} />
              <p>Testing connectivity to {connectModal.item.ip}...</p>
            </div>
          ) : connectModal.result ? (
            <div className="connect-results">
              <div className="connect-result-item">
                <div className="connect-result-header">
                  <Icon
                    name={connectModal.result.ping.reachable ? 'check_circle' : 'cancel'}
                    size={20}
                  />
                  <strong>Ping</strong>
                </div>
                <div className="connect-result-body">
                  {connectModal.result.ping.reachable ? (
                    <span className="status online">
                      Reachable {connectModal.result.ping.latency && `(${connectModal.result.ping.latency})`}
                    </span>
                  ) : (
                    <span className="status offline">
                      {connectModal.result.ping.error || 'Unreachable'}
                    </span>
                  )}
                </div>
              </div>

              <div className="connect-result-item">
                <div className="connect-result-header">
                  <Icon
                    name={connectModal.result.ssh.connected ? 'check_circle' : 'cancel'}
                    size={20}
                  />
                  <strong>SSH</strong>
                </div>
                <div className="connect-result-body">
                  {connectModal.result.ssh.connected ? (
                    <span className="status online">Connected</span>
                  ) : (
                    <span className="status offline">
                      {connectModal.result.ssh.error || 'Failed'}
                    </span>
                  )}
                </div>
              </div>

              {connectModal.result.ssh.uptime && (
                <div className="connect-result-item">
                  <div className="connect-result-header">
                    <Icon name="schedule" size={20} />
                    <strong>Uptime</strong>
                  </div>
                  <div className="connect-result-body">
                    <code style={{ fontSize: '0.85rem' }}>{connectModal.result.ssh.uptime}</code>
                  </div>
                </div>
              )}
            </div>
          ) : null}

          <div className="form-actions">
            <Button variant="secondary" onClick={connectModal.close}>
              Close
            </Button>
          </div>
        </Modal>
      )}

      {configModal.isOpen && configModal.item && (
        <Modal title={`Configs: ${configModal.item.hostname}`} onClose={handleCloseConfig}>
          {configModal.loading ? (
            <div className="connect-loading">
              <SpinnerIcon size={32} />
              <p>Loading configurations...</p>
            </div>
          ) : (
            <>
              <div className="config-tabs">
                <button
                  className={`config-tab ${configTab === 'tftp' ? 'active' : ''}`}
                  onClick={() => { setConfigTab('tftp'); setSelectedBackup(null); setBackupContent(null); }}
                >
                  <Icon name="upload" size={14} />
                  TFTP Config
                </button>
                <button
                  className={`config-tab ${configTab === 'backups' ? 'active' : ''}`}
                  onClick={() => setConfigTab('backups')}
                >
                  <ClockIcon size={14} />
                  Backup History ({backups.length})
                </button>
              </div>

              {configTab === 'tftp' && configModal.result && (
                <div className="config-viewer">
                  {configModal.result.exists ? (
                    <>
                      <div className="config-filename">
                        <Icon name="description" size={16} />
                        <code>{configModal.result.filename}</code>
                      </div>
                      <pre className="config-content">{configModal.result.content}</pre>
                    </>
                  ) : (
                    <div className="config-empty">
                      <Icon name="info" size={24} />
                      <p>No configuration file generated for this device yet.</p>
                    </div>
                  )}
                </div>
              )}

              {configTab === 'backups' && !selectedBackup && (
                <div className="config-viewer">
                  {backupsLoading ? (
                    <p>Loading...</p>
                  ) : backups.length === 0 ? (
                    <div className="config-empty">
                      <Icon name="info" size={24} />
                      <p>No backups found for this device.</p>
                    </div>
                  ) : (
                    <div className="backup-list">
                      {backups.map((backup) => (
                        <div key={backup.id} className="backup-item">
                          <button
                            className="backup-filename-link"
                            onClick={() => handleViewBackupContent(backup)}
                          >
                            <Icon name="description" size={14} />
                            {backup.filename}
                          </button>
                          <span>{formatDate(backup.created_at)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {configTab === 'backups' && selectedBackup && (
                <div className="config-viewer">
                  {backupContentLoading ? (
                    <div className="connect-loading">
                      <SpinnerIcon size={32} />
                      <p>Loading backup content...</p>
                    </div>
                  ) : backupContent ? (
                    <>
                      <div className="config-filename">
                        <button
                          className="backup-back-link"
                          onClick={() => { setSelectedBackup(null); setBackupContent(null); }}
                        >
                          <Icon name="arrow_back" size={14} />
                          Back to list
                        </button>
                        <Icon name="description" size={16} />
                        <code>{backupContent.filename}</code>
                      </div>
                      {backupContent.exists ? (
                        <pre className="config-content">{backupContent.content}</pre>
                      ) : (
                        <div className="config-empty">
                          <Icon name="info" size={24} />
                          <p>Backup file not found on disk.</p>
                        </div>
                      )}
                    </>
                  ) : null}
                </div>
              )}
            </>
          )}

          <div className="form-actions">
            <Button variant="secondary" onClick={handleCloseConfig}>
              Close
            </Button>
          </div>
        </Modal>
      )}

      {netboxModal.isOpen && netboxModal.item && (
        <Modal title={`NetBox: ${netboxModal.item.hostname}`} onClose={handleCloseNetbox}>
          {netboxModal.loading && !netboxModal.result ? (
            <div className="connect-loading">
              <SpinnerIcon size={32} />
              <p>Checking NetBox connection...</p>
            </div>
          ) : netboxModal.result ? (
            <div className="netbox-info">
              <div className="connect-results">
                <div className="connect-result-item">
                  <div className="connect-result-header">
                    <Icon
                      name={netboxModal.result.connected ? 'check_circle' : 'cancel'}
                      size={20}
                    />
                    <strong>NetBox Status</strong>
                  </div>
                  <div className="connect-result-body">
                    {netboxModal.result.connected ? (
                      <span className="status online">Connected to {netboxModal.result.url}</span>
                    ) : netboxModal.result.configured ? (
                      <span className="status offline">{netboxModal.result.error || 'Not connected'}</span>
                    ) : (
                      <span className="status offline">Not configured</span>
                    )}
                  </div>
                </div>

                <div className="connect-result-item">
                  <div className="connect-result-header">
                    <Icon name="dns" size={20} />
                    <strong>Device Info</strong>
                  </div>
                  <div className="connect-result-body">
                    <div className="info-grid">
                      <span className="label">Hostname:</span>
                      <span>{netboxModal.item.hostname}</span>
                      <span className="label">MAC:</span>
                      <code>{netboxModal.item.mac}</code>
                      <span className="label">IP:</span>
                      <span>{netboxModal.item.ip}</span>
                      <span className="label">Vendor:</span>
                      <span>{netboxModal.item.vendor || '—'}</span>
                      <span className="label">Serial:</span>
                      <span>{netboxModal.item.serial_number || '—'}</span>
                    </div>
                  </div>
                </div>

                {netboxSyncResult && (
                  <div className="connect-result-item">
                    <div className="connect-result-header">
                      <Icon
                        name={netboxSyncResult.result.errors?.length ? 'warning' : 'check_circle'}
                        size={20}
                      />
                      <strong>Sync Result</strong>
                    </div>
                    <div className="connect-result-body">
                      <p>{netboxSyncResult.message}</p>
                      <p className="helper-text-sm">
                        Created: {netboxSyncResult.result.created}, Updated: {netboxSyncResult.result.updated}
                      </p>
                      {netboxSyncResult.result.errors?.map((error, i) => (
                        <p key={i} className="text-sm" style={{ color: 'var(--color-error)' }}>{error}</p>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : null}

          <div className="form-actions">
            {netboxModal.result?.connected && (
              <Button onClick={handlePushToNetbox} disabled={netboxModal.loading}>
                {netboxModal.loading ? <SpinnerIcon size={14} /> : <Icon name="cloud_upload" size={14} />}
                Push to NetBox
              </Button>
            )}
            <Button variant="secondary" onClick={handleCloseNetbox}>
              Close
            </Button>
          </div>
        </Modal>
      )}
    </>
  );
}
