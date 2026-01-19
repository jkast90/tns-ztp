import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import type {
  Device,
  ConnectResult,
  ConfigResult,
  Backup,
  BackupContentResult,
  NetBoxStatus,
} from '../core';
import { useBackups, getServices, formatDate } from '../core';
import { useAppTheme } from '../context';
import { Button } from './Button';
import { IconButton } from './IconButton';

interface Props {
  device: Device | null;
  visible: boolean;
  onClose: () => void;
  onRefresh?: () => void;
}

type TabType = 'actions' | 'config' | 'backups' | 'netbox';

export function DeviceActionsModal({ device, visible, onClose, onRefresh }: Props) {
  const { colors } = useAppTheme();
  const [activeTab, setActiveTab] = useState<TabType>('actions');

  // Connection test state
  const [connectLoading, setConnectLoading] = useState(false);
  const [connectResult, setConnectResult] = useState<ConnectResult | null>(null);

  // Config viewer state
  const [configLoading, setConfigLoading] = useState(false);
  const [configResult, setConfigResult] = useState<ConfigResult | null>(null);

  // Backup state
  const { backups, loading: backupsLoading, loadBackups, clear: clearBackups } = useBackups();
  const [selectedBackup, setSelectedBackup] = useState<Backup | null>(null);
  const [backupContent, setBackupContent] = useState<BackupContentResult | null>(null);
  const [backupContentLoading, setBackupContentLoading] = useState(false);
  const [triggerBackupLoading, setTriggerBackupLoading] = useState(false);

  // NetBox state
  const [netboxLoading, setNetboxLoading] = useState(false);
  const [netboxStatus, setNetboxStatus] = useState<NetBoxStatus | null>(null);
  const [netboxSyncResult, setNetboxSyncResult] = useState<{
    message: string;
    result: { created: number; updated: number; errors?: string[] };
  } | null>(null);

  // Reset state when modal closes or device changes
  useEffect(() => {
    if (!visible) {
      setActiveTab('actions');
      setConnectResult(null);
      setConfigResult(null);
      setSelectedBackup(null);
      setBackupContent(null);
      setNetboxStatus(null);
      setNetboxSyncResult(null);
      clearBackups();
    }
  }, [visible, clearBackups]);

  const handleConnect = useCallback(async () => {
    if (!device) return;
    setConnectLoading(true);
    setConnectResult(null);
    try {
      const services = getServices();
      const result = await services.devices.connect(device.mac);
      setConnectResult(result);
      if (result.ping.reachable && onRefresh) {
        onRefresh();
      }
    } catch (err) {
      setConnectResult({
        ping: { reachable: false, error: err instanceof Error ? err.message : 'Connection failed' },
        ssh: { connected: false, error: 'Could not attempt SSH' },
        success: false,
      });
    } finally {
      setConnectLoading(false);
    }
  }, [device, onRefresh]);

  const handleViewConfig = useCallback(async () => {
    if (!device) return;
    setActiveTab('config');
    setConfigLoading(true);
    setConfigResult(null);
    try {
      const services = getServices();
      const result = await services.devices.getConfig(device.mac);
      setConfigResult(result);
    } catch (err) {
      setConfigResult({
        mac: device.mac,
        hostname: device.hostname,
        filename: '',
        content: '',
        exists: false,
      });
    } finally {
      setConfigLoading(false);
    }
  }, [device]);

  const handleViewBackups = useCallback(async () => {
    if (!device) return;
    setActiveTab('backups');
    setSelectedBackup(null);
    setBackupContent(null);
    await loadBackups(device.mac);
  }, [device, loadBackups]);

  const handleViewBackupContent = useCallback(async (backup: Backup) => {
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
  }, []);

  const handleTriggerBackup = useCallback(async () => {
    if (!device) return;
    setTriggerBackupLoading(true);
    try {
      const services = getServices();
      await services.devices.triggerBackup(device.mac);
      // Refresh backups list if we're on the backups tab
      if (activeTab === 'backups') {
        await loadBackups(device.mac);
      }
      if (onRefresh) {
        onRefresh();
      }
    } finally {
      setTriggerBackupLoading(false);
    }
  }, [device, activeTab, loadBackups, onRefresh]);

  const handleViewNetbox = useCallback(async () => {
    setActiveTab('netbox');
    setNetboxLoading(true);
    setNetboxStatus(null);
    setNetboxSyncResult(null);
    try {
      const services = getServices();
      const status = await services.netbox.getStatus();
      setNetboxStatus(status);
    } catch (err) {
      setNetboxStatus({
        connected: false,
        configured: false,
        error: err instanceof Error ? err.message : 'Failed to check NetBox status',
      });
    } finally {
      setNetboxLoading(false);
    }
  }, []);

  const handlePushToNetbox = useCallback(async () => {
    setNetboxLoading(true);
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
      setNetboxLoading(false);
    }
  }, []);

  if (!device) return null;

  const renderActions = () => (
    <View style={styles.actionsGrid}>
      <Pressable
        style={[styles.actionItem, { backgroundColor: colors.bgPrimary, borderColor: colors.border }]}
        onPress={handleConnect}
        disabled={connectLoading}
      >
        {connectLoading ? (
          <ActivityIndicator size="small" color={colors.accentBlue} />
        ) : (
          <MaterialIcons name="cable" size={28} color={colors.accentBlue} />
        )}
        <Text style={[styles.actionLabel, { color: colors.textPrimary }]}>Test Connection</Text>
      </Pressable>

      <Pressable
        style={[styles.actionItem, { backgroundColor: colors.bgPrimary, borderColor: colors.border }]}
        onPress={handleViewConfig}
        disabled={configLoading}
      >
        {configLoading ? (
          <ActivityIndicator size="small" color={colors.accentBlue} />
        ) : (
          <MaterialIcons name="description" size={28} color={colors.accentBlue} />
        )}
        <Text style={[styles.actionLabel, { color: colors.textPrimary }]}>View Config</Text>
      </Pressable>

      <Pressable
        style={[styles.actionItem, { backgroundColor: colors.bgPrimary, borderColor: colors.border }]}
        onPress={handleViewBackups}
        disabled={backupsLoading}
      >
        {backupsLoading ? (
          <ActivityIndicator size="small" color={colors.accentBlue} />
        ) : (
          <MaterialIcons name="history" size={28} color={colors.accentBlue} />
        )}
        <Text style={[styles.actionLabel, { color: colors.textPrimary }]}>Backup History</Text>
      </Pressable>

      <Pressable
        style={[styles.actionItem, { backgroundColor: colors.bgPrimary, borderColor: colors.border }]}
        onPress={handleTriggerBackup}
        disabled={triggerBackupLoading}
      >
        {triggerBackupLoading ? (
          <ActivityIndicator size="small" color={colors.success} />
        ) : (
          <MaterialIcons name="cloud-download" size={28} color={colors.success} />
        )}
        <Text style={[styles.actionLabel, { color: colors.textPrimary }]}>Trigger Backup</Text>
      </Pressable>

      <Pressable
        style={[styles.actionItem, { backgroundColor: colors.bgPrimary, borderColor: colors.border }]}
        onPress={handleViewNetbox}
        disabled={netboxLoading}
      >
        {netboxLoading ? (
          <ActivityIndicator size="small" color={colors.accentBlue} />
        ) : (
          <MaterialIcons name="cloud" size={28} color={colors.accentBlue} />
        )}
        <Text style={[styles.actionLabel, { color: colors.textPrimary }]}>NetBox</Text>
      </Pressable>
    </View>
  );

  const renderConnectResult = () => {
    if (!connectResult) return null;
    return (
      <View style={[styles.resultCard, { backgroundColor: colors.bgPrimary, borderColor: colors.border }]}>
        <View style={styles.resultRow}>
          <MaterialIcons
            name={connectResult.ping.reachable ? 'check-circle' : 'cancel'}
            size={20}
            color={connectResult.ping.reachable ? colors.success : colors.error}
          />
          <Text style={[styles.resultLabel, { color: colors.textPrimary }]}>Ping</Text>
          <Text style={[styles.resultValue, { color: connectResult.ping.reachable ? colors.success : colors.error }]}>
            {connectResult.ping.reachable
              ? `Reachable${connectResult.ping.latency ? ` (${connectResult.ping.latency})` : ''}`
              : connectResult.ping.error || 'Unreachable'}
          </Text>
        </View>
        <View style={styles.resultRow}>
          <MaterialIcons
            name={connectResult.ssh.connected ? 'check-circle' : 'cancel'}
            size={20}
            color={connectResult.ssh.connected ? colors.success : colors.error}
          />
          <Text style={[styles.resultLabel, { color: colors.textPrimary }]}>SSH</Text>
          <Text style={[styles.resultValue, { color: connectResult.ssh.connected ? colors.success : colors.error }]}>
            {connectResult.ssh.connected ? 'Connected' : connectResult.ssh.error || 'Failed'}
          </Text>
        </View>
        {connectResult.ssh.uptime && (
          <View style={styles.resultRow}>
            <MaterialIcons name="schedule" size={20} color={colors.textMuted} />
            <Text style={[styles.resultLabel, { color: colors.textPrimary }]}>Uptime</Text>
            <Text style={[styles.resultValue, styles.monospace, { color: colors.textSecondary }]}>
              {connectResult.ssh.uptime}
            </Text>
          </View>
        )}
      </View>
    );
  };

  const renderConfig = () => {
    if (configLoading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.accentBlue} />
          <Text style={[styles.loadingText, { color: colors.textMuted }]}>Loading configuration...</Text>
        </View>
      );
    }
    if (!configResult) return null;
    if (!configResult.exists) {
      return (
        <View style={styles.emptyState}>
          <MaterialIcons name="info-outline" size={48} color={colors.textMuted} />
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>
            No configuration file generated for this device yet.
          </Text>
        </View>
      );
    }
    return (
      <View style={styles.configContainer}>
        <View style={[styles.filenameRow, { backgroundColor: colors.bgPrimary, borderColor: colors.border }]}>
          <MaterialIcons name="description" size={16} color={colors.textMuted} />
          <Text style={[styles.filename, { color: colors.textPrimary }]}>{configResult.filename}</Text>
        </View>
        <ScrollView style={[styles.codeContainer, { backgroundColor: colors.bgPrimary }]}>
          <Text style={[styles.codeText, { color: colors.textPrimary }]}>{configResult.content}</Text>
        </ScrollView>
      </View>
    );
  };

  const renderBackups = () => {
    if (backupsLoading && !selectedBackup) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.accentBlue} />
          <Text style={[styles.loadingText, { color: colors.textMuted }]}>Loading backups...</Text>
        </View>
      );
    }

    if (selectedBackup) {
      if (backupContentLoading) {
        return (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.accentBlue} />
            <Text style={[styles.loadingText, { color: colors.textMuted }]}>Loading backup content...</Text>
          </View>
        );
      }
      return (
        <View style={styles.configContainer}>
          <Pressable
            style={[styles.backButton, { borderColor: colors.border }]}
            onPress={() => { setSelectedBackup(null); setBackupContent(null); }}
          >
            <MaterialIcons name="arrow-back" size={16} color={colors.accentBlue} />
            <Text style={[styles.backButtonText, { color: colors.accentBlue }]}>Back to list</Text>
          </Pressable>
          <View style={[styles.filenameRow, { backgroundColor: colors.bgPrimary, borderColor: colors.border }]}>
            <MaterialIcons name="description" size={16} color={colors.textMuted} />
            <Text style={[styles.filename, { color: colors.textPrimary }]}>{selectedBackup.filename}</Text>
          </View>
          {backupContent?.exists ? (
            <ScrollView style={[styles.codeContainer, { backgroundColor: colors.bgPrimary }]}>
              <Text style={[styles.codeText, { color: colors.textPrimary }]}>{backupContent.content}</Text>
            </ScrollView>
          ) : (
            <View style={styles.emptyState}>
              <MaterialIcons name="info-outline" size={48} color={colors.textMuted} />
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                Backup file not found on disk.
              </Text>
            </View>
          )}
        </View>
      );
    }

    if (backups.length === 0) {
      return (
        <View style={styles.emptyState}>
          <MaterialIcons name="info-outline" size={48} color={colors.textMuted} />
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>
            No backups found for this device.
          </Text>
        </View>
      );
    }

    return (
      <ScrollView style={styles.backupList}>
        {backups.map((backup) => (
          <Pressable
            key={backup.id}
            style={[styles.backupItem, { backgroundColor: colors.bgPrimary, borderColor: colors.border }]}
            onPress={() => handleViewBackupContent(backup)}
          >
            <View style={styles.backupInfo}>
              <MaterialIcons name="description" size={16} color={colors.accentBlue} />
              <Text style={[styles.backupFilename, { color: colors.textPrimary }]}>{backup.filename}</Text>
            </View>
            <Text style={[styles.backupDate, { color: colors.textMuted }]}>{formatDate(backup.created_at)}</Text>
          </Pressable>
        ))}
      </ScrollView>
    );
  };

  const renderNetbox = () => {
    if (netboxLoading && !netboxStatus) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.accentBlue} />
          <Text style={[styles.loadingText, { color: colors.textMuted }]}>Checking NetBox connection...</Text>
        </View>
      );
    }

    if (!netboxStatus) return null;

    return (
      <View style={styles.netboxContainer}>
        <View style={[styles.resultCard, { backgroundColor: colors.bgPrimary, borderColor: colors.border }]}>
          <View style={styles.resultRow}>
            <MaterialIcons
              name={netboxStatus.connected ? 'check-circle' : 'cancel'}
              size={20}
              color={netboxStatus.connected ? colors.success : colors.error}
            />
            <Text style={[styles.resultLabel, { color: colors.textPrimary }]}>Status</Text>
            <Text style={[styles.resultValue, { color: netboxStatus.connected ? colors.success : colors.error }]}>
              {netboxStatus.connected
                ? 'Connected'
                : netboxStatus.configured
                ? netboxStatus.error || 'Not connected'
                : 'Not configured'}
            </Text>
          </View>
          {netboxStatus.url && (
            <View style={styles.resultRow}>
              <MaterialIcons name="link" size={20} color={colors.textMuted} />
              <Text style={[styles.resultLabel, { color: colors.textPrimary }]}>URL</Text>
              <Text style={[styles.resultValue, { color: colors.textSecondary }]}>{netboxStatus.url}</Text>
            </View>
          )}
        </View>

        <View style={[styles.deviceInfoCard, { backgroundColor: colors.bgPrimary, borderColor: colors.border }]}>
          <Text style={[styles.deviceInfoTitle, { color: colors.textPrimary }]}>Device Info</Text>
          <View style={styles.deviceInfoRow}>
            <Text style={[styles.deviceInfoLabel, { color: colors.textMuted }]}>Hostname:</Text>
            <Text style={[styles.deviceInfoValue, { color: colors.textPrimary }]}>{device.hostname}</Text>
          </View>
          <View style={styles.deviceInfoRow}>
            <Text style={[styles.deviceInfoLabel, { color: colors.textMuted }]}>MAC:</Text>
            <Text style={[styles.deviceInfoValue, styles.monospace, { color: colors.textPrimary }]}>{device.mac}</Text>
          </View>
          <View style={styles.deviceInfoRow}>
            <Text style={[styles.deviceInfoLabel, { color: colors.textMuted }]}>IP:</Text>
            <Text style={[styles.deviceInfoValue, { color: colors.textPrimary }]}>{device.ip}</Text>
          </View>
          <View style={styles.deviceInfoRow}>
            <Text style={[styles.deviceInfoLabel, { color: colors.textMuted }]}>Vendor:</Text>
            <Text style={[styles.deviceInfoValue, { color: colors.textPrimary }]}>{device.vendor || '—'}</Text>
          </View>
          <View style={styles.deviceInfoRow}>
            <Text style={[styles.deviceInfoLabel, { color: colors.textMuted }]}>Serial:</Text>
            <Text style={[styles.deviceInfoValue, { color: colors.textPrimary }]}>{device.serial_number || '—'}</Text>
          </View>
        </View>

        {netboxSyncResult && (
          <View style={[styles.resultCard, { backgroundColor: colors.bgPrimary, borderColor: colors.border }]}>
            <View style={styles.resultRow}>
              <MaterialIcons
                name={netboxSyncResult.result.errors?.length ? 'warning' : 'check-circle'}
                size={20}
                color={netboxSyncResult.result.errors?.length ? colors.warning : colors.success}
              />
              <Text style={[styles.resultLabel, { color: colors.textPrimary }]}>Sync Result</Text>
            </View>
            <Text style={[styles.syncMessage, { color: colors.textPrimary }]}>{netboxSyncResult.message}</Text>
            <Text style={[styles.syncStats, { color: colors.textMuted }]}>
              Created: {netboxSyncResult.result.created}, Updated: {netboxSyncResult.result.updated}
            </Text>
            {netboxSyncResult.result.errors?.map((error, i) => (
              <Text key={i} style={[styles.syncError, { color: colors.error }]}>{error}</Text>
            ))}
          </View>
        )}

        {netboxStatus.connected && (
          <Button
            title={netboxLoading ? 'Syncing...' : 'Push to NetBox'}
            onPress={handlePushToNetbox}
            disabled={netboxLoading}
            icon="cloud-upload"
          />
        )}
      </View>
    );
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'actions':
        return (
          <>
            {renderActions()}
            {connectResult && renderConnectResult()}
          </>
        );
      case 'config':
        return renderConfig();
      case 'backups':
        return renderBackups();
      case 'netbox':
        return renderNetbox();
      default:
        return null;
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={[styles.modalOverlay, { backgroundColor: colors.overlayDark }]}>
        <Pressable style={styles.modalBackdrop} onPress={onClose} />
        <View style={[styles.modalContent, { backgroundColor: colors.bgCard }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <View>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>{device.hostname}</Text>
              <Text style={[styles.modalSubtitle, { color: colors.textMuted }]}>{device.ip}</Text>
            </View>
            <Pressable onPress={onClose} hitSlop={8}>
              <MaterialIcons name="close" size={24} color={colors.textMuted} />
            </Pressable>
          </View>

          {activeTab !== 'actions' && (
            <View style={[styles.tabBar, { borderBottomColor: colors.border }]}>
              <Pressable
                style={[styles.tabBack, { borderColor: colors.border }]}
                onPress={() => setActiveTab('actions')}
              >
                <MaterialIcons name="arrow-back" size={16} color={colors.accentBlue} />
                <Text style={[styles.tabBackText, { color: colors.accentBlue }]}>Actions</Text>
              </Pressable>
              <Text style={[styles.tabTitle, { color: colors.textPrimary }]}>
                {activeTab === 'config' && 'TFTP Configuration'}
                {activeTab === 'backups' && 'Backup History'}
                {activeTab === 'netbox' && 'NetBox'}
              </Text>
            </View>
          )}

          <ScrollView style={styles.modalBody} contentContainerStyle={styles.modalBodyContent}>
            {renderTabContent()}
          </ScrollView>

          <View style={[styles.modalActions, { borderTopColor: colors.border }]}>
            <Button title="Close" onPress={onClose} variant="secondary" />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    flex: 1,
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    minHeight: '60%',
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 16,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  tabBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    gap: 12,
  },
  tabBack: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
  },
  tabBackText: {
    fontSize: 13,
    fontWeight: '500',
  },
  tabTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  modalBody: {
    flex: 1,
  },
  modalBodyContent: {
    padding: 16,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 16,
    borderTopWidth: 1,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  actionItem: {
    width: '47%',
    paddingVertical: 20,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    gap: 8,
  },
  actionLabel: {
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
  },
  resultCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginBottom: 12,
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
  },
  resultLabel: {
    fontSize: 14,
    fontWeight: '500',
    width: 60,
  },
  resultValue: {
    fontSize: 14,
    flex: 1,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 12,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
  },
  configContainer: {
    flex: 1,
  },
  filenameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 12,
  },
  filename: {
    fontSize: 13,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  codeContainer: {
    borderRadius: 8,
    padding: 12,
    maxHeight: 300,
  },
  codeText: {
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    lineHeight: 18,
  },
  monospace: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 8,
    marginBottom: 12,
  },
  backButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  backupList: {
    flex: 1,
  },
  backupItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 8,
  },
  backupInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  backupFilename: {
    fontSize: 13,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    flex: 1,
  },
  backupDate: {
    fontSize: 12,
  },
  netboxContainer: {
    gap: 12,
  },
  deviceInfoCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
  },
  deviceInfoTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  deviceInfoRow: {
    flexDirection: 'row',
    paddingVertical: 4,
  },
  deviceInfoLabel: {
    fontSize: 13,
    width: 80,
  },
  deviceInfoValue: {
    fontSize: 13,
    flex: 1,
  },
  syncMessage: {
    fontSize: 14,
    marginTop: 8,
  },
  syncStats: {
    fontSize: 12,
    marginTop: 4,
  },
  syncError: {
    fontSize: 12,
    marginTop: 4,
  },
});
