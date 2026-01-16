import { useState } from 'react';
import { useBackups, formatDate } from '../core';
import type { Device } from '../core';
import { Button } from './Button';
import { Card } from './Card';
import { Modal } from './Modal';
import { EditIcon, DownloadIcon, ClockIcon, TrashIcon } from './Icon';

interface Props {
  devices: Device[];
  onEdit: (device: Device) => void;
  onDelete: (mac: string) => Promise<boolean>;
  onBackup: (mac: string) => Promise<boolean>;
}

export function DeviceList({ devices, onEdit, onDelete, onBackup }: Props) {
  const [showBackupsFor, setShowBackupsFor] = useState<string | null>(null);
  const { backups, loading: backupsLoading, loadBackups, clear: clearBackups } = useBackups();

  const handleShowBackups = async (mac: string) => {
    await loadBackups(mac);
    setShowBackupsFor(mac);
  };

  const handleCloseBackups = () => {
    setShowBackupsFor(null);
    clearBackups();
  };

  if (devices.length === 0) {
    return (
      <Card>
        <div className="empty-state">
          <p>No devices configured yet.</p>
          <p>Add a device using the button above.</p>
        </div>
      </Card>
    );
  }

  return (
    <>
      <Card title="Devices">
        <table>
          <thead>
            <tr>
              <th>Hostname</th>
              <th>Serial Number</th>
              <th>MAC Address</th>
              <th>IP Address</th>
              <th>Status</th>
              <th>Last Backup</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {devices.map((device) => (
              <tr key={device.mac}>
                <td>{device.hostname}</td>
                <td>{device.serial_number || '—'}</td>
                <td><code>{device.mac}</code></td>
                <td>{device.ip}</td>
                <td>
                  <span className={`status ${device.status}`}>
                    {device.status}
                  </span>
                </td>
                <td>{formatDate(device.last_backup)}</td>
                <td>
                  <div className="actions">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => onEdit(device)}
                      title="Edit device"
                    >
                      <EditIcon size={14} />
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => onBackup(device.mac)}
                      title="Trigger backup"
                    >
                      <DownloadIcon size={14} />
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleShowBackups(device.mac)}
                      title="View backup history"
                    >
                      <ClockIcon size={14} />
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => {
                        if (confirm(`Delete device ${device.hostname}?`)) {
                          onDelete(device.mac);
                        }
                      }}
                      title="Delete device"
                    >
                      <TrashIcon size={14} />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {showBackupsFor && (
        <Modal title="Backup History" onClose={handleCloseBackups}>
          {backupsLoading ? (
            <p>Loading...</p>
          ) : backups.length === 0 ? (
            <p>No backups found</p>
          ) : (
            <div className="backup-list">
              {backups.map((backup) => (
                <div key={backup.id} className="backup-item">
                  <span>{backup.filename}</span>
                  <span>{formatDate(backup.created_at)}</span>
                </div>
              ))}
            </div>
          )}
          <div className="form-actions">
            <Button variant="secondary" onClick={handleCloseBackups}>
              Close
            </Button>
          </div>
        </Modal>
      )}
    </>
  );
}
