import { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  RefreshControl,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import {
  useDevices,
  useDiscovery,
  useTemplates,
  useVendors,
  getServices,
  formatRelativeTime,
  getStatusColors,
  getStatusIcon,
  getStatusLabel,
} from '../core';
import type { DiscoveryLog, DeviceStatus } from '../core';
import { Card, LoadingState, ErrorState, MetricCard } from '../components';
import { useAppTheme } from '../context';

export function DashboardScreen() {
  const { colors } = useAppTheme();
  const navigation = useNavigation();

  const { devices, loading: devicesLoading, error: devicesError, refresh: refreshDevices } = useDevices({ autoRefresh: true, refreshInterval: 10000 });
  const { discovered, refresh: refreshDiscovery } = useDiscovery({ autoRefresh: true, refreshInterval: 10000 });
  const { templates } = useTemplates({ vendorFilter: 'all' });
  const { vendors } = useVendors();

  const [logs, setLogs] = useState<DiscoveryLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Fetch recent activity logs
  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const services = getServices();
        const data = await services.discovery.listLogs(20);
        setLogs(data);
      } catch (err) {
        console.warn('Failed to fetch logs:', err);
      } finally {
        setLogsLoading(false);
      }
    };
    fetchLogs();
    const interval = setInterval(fetchLogs, 15000);
    return () => clearInterval(interval);
  }, []);

  // Calculate device status counts
  const statusCounts = useMemo(() => {
    const counts: Record<DeviceStatus, number> = {
      online: 0,
      offline: 0,
      provisioning: 0,
      unknown: 0,
    };
    devices.forEach((d) => {
      counts[d.status] = (counts[d.status] || 0) + 1;
    });
    return counts;
  }, [devices]);

  // Calculate devices with recent backups (last 24 hours)
  const recentBackups = useMemo(() => {
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    return devices.filter((d) => d.last_backup && new Date(d.last_backup).getTime() > oneDayAgo).length;
  }, [devices]);

  // Status colors mapped from theme
  const statusColors = getStatusColors(colors);

  // Get event type icon and color
  const getEventStyle = (eventType: string): { icon: keyof typeof MaterialIcons.glyphMap; color: string } => {
    switch (eventType) {
      case 'discovered':
        return { icon: 'search', color: colors.accentCyan };
      case 'added':
        return { icon: 'add-circle', color: colors.success };
      case 'lease_renewed':
        return { icon: 'refresh', color: colors.accentBlue };
      case 'lease_expired':
        return { icon: 'timer-off', color: colors.error };
      default:
        return { icon: 'info', color: colors.textMuted };
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refreshDevices(), refreshDiscovery()]);
    setRefreshing(false);
  };

  if (devicesLoading && !refreshing) {
    return <LoadingState message="Loading dashboard..." />;
  }

  if (devicesError) {
    return <ErrorState message={devicesError} />;
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.bgPrimary }]}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.accentBlue} />
      }
    >
      {/* Metrics Row */}
      <View style={styles.metricsRow}>
        <MetricCard
          title="Devices"
          value={devices.length}
          icon="devices"
          color={colors.accentBlue}
          subtitle={`${statusCounts.online} online`}
          onPress={() => navigation.navigate('DevicesTab' as never)}
        />
        <MetricCard
          title="Pending"
          value={discovered.length}
          icon="radar"
          color={colors.accentCyan}
          subtitle="Discovery"
        />
      </View>
      <View style={styles.metricsRow}>
        <MetricCard
          title="Templates"
          value={templates.length}
          icon="description"
          color={colors.accentPurple}
          onPress={() => navigation.navigate('TemplatesTab' as never)}
        />
        <MetricCard
          title="Vendors"
          value={vendors.length}
          icon="business"
          color="#f59e0b"
          onPress={() => navigation.navigate('ConfigTab' as never)}
        />
      </View>

      {/* Device Status Overview */}
      <Card style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Device Status</Text>
          <Pressable onPress={() => navigation.navigate('DevicesTab' as never)}>
            <Text style={[styles.viewAllLink, { color: colors.accentBlue }]}>View All</Text>
          </Pressable>
        </View>

        <View style={styles.statusGrid}>
          {(['online', 'offline', 'provisioning', 'unknown'] as const).map((status) => (
            <View
              key={status}
              style={[styles.statusItem, { backgroundColor: `${statusColors[status]}15` }]}
            >
              <MaterialIcons name={getStatusIcon(status)} size={20} color={statusColors[status]} />
              <Text style={[styles.statusCount, { color: colors.textPrimary }]}>{statusCounts[status]}</Text>
              <Text style={[styles.statusLabel, { color: colors.textMuted }]}>{getStatusLabel(status)}</Text>
            </View>
          ))}
        </View>

        {/* Backup summary */}
        <View style={[styles.backupSummary, { backgroundColor: colors.bgSecondary }]}>
          <MaterialIcons name="backup" size={18} color={colors.accentBlue} />
          <Text style={[styles.backupText, { color: colors.textSecondary }]}>
            {recentBackups} device{recentBackups !== 1 ? 's' : ''} backed up in last 24h
          </Text>
        </View>

        {/* Recent devices */}
        {devices.length > 0 && (
          <View style={styles.recentDevices}>
            <Text style={[styles.recentTitle, { color: colors.textMuted }]}>Recent Devices</Text>
            {devices.slice(0, 5).map((device) => (
              <View key={device.mac} style={[styles.recentItem, { borderBottomColor: colors.border }]}>
                <View style={[styles.statusDot, { backgroundColor: statusColors[device.status] || colors.textMuted }]} />
                <Text style={[styles.deviceName, { color: colors.textPrimary }]} numberOfLines={1}>
                  {device.hostname}
                </Text>
                <Text style={[styles.deviceIp, { color: colors.textMuted }]}>{device.ip}</Text>
                {device.last_seen && (
                  <Text style={[styles.deviceSeen, { color: colors.textMuted }]}>
                    {formatRelativeTime(device.last_seen)}
                  </Text>
                )}
              </View>
            ))}
          </View>
        )}
      </Card>

      {/* Recent Activity */}
      <Card style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Recent Activity</Text>
        </View>

        {logsLoading ? (
          <Text style={[styles.loadingText, { color: colors.textMuted }]}>Loading activity...</Text>
        ) : logs.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialIcons name="inbox" size={32} color={colors.textMuted} />
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>No recent activity</Text>
          </View>
        ) : (
          <View>
            {logs.slice(0, 10).map((log) => {
              const style = getEventStyle(log.event_type);
              return (
                <View key={log.id} style={[styles.activityItem, { borderBottomColor: colors.border }]}>
                  <View style={[styles.activityIcon, { backgroundColor: `${style.color}15` }]}>
                    <MaterialIcons name={style.icon} size={16} color={style.color} />
                  </View>
                  <View style={styles.activityContent}>
                    <Text style={[styles.activityType, { color: colors.textPrimary }]}>
                      {log.event_type.replace('_', ' ')}
                    </Text>
                    <Text style={[styles.activityDetails, { color: colors.textMuted }]} numberOfLines={1}>
                      {log.hostname || log.ip}
                      {log.vendor && <Text> ({log.vendor})</Text>}
                    </Text>
                    {log.message && (
                      <Text style={[styles.activityMessage, { color: colors.textMuted }]} numberOfLines={1}>
                        {log.message}
                      </Text>
                    )}
                  </View>
                  <Text style={[styles.activityTime, { color: colors.textMuted }]}>
                    {formatRelativeTime(log.created_at)}
                  </Text>
                </View>
              );
            })}
          </View>
        )}
      </Card>

      {/* Quick Actions */}
      <Card style={[styles.card, styles.lastCard]}>
        <Text style={[styles.cardTitle, { color: colors.textPrimary, marginBottom: 12 }]}>Quick Actions</Text>
        <View style={styles.quickActions}>
          <Pressable
            style={[styles.quickAction, { backgroundColor: colors.accentBlue }]}
            onPress={() => navigation.navigate('DeviceForm' as never)}
          >
            <MaterialIcons name="add" size={20} color="#fff" />
            <Text style={styles.quickActionText}>Add Device</Text>
          </Pressable>
          <Pressable
            style={[styles.quickAction, { backgroundColor: colors.bgSecondary, borderColor: colors.border, borderWidth: 1 }]}
            onPress={() => navigation.navigate('TemplatesTab' as never)}
          >
            <MaterialIcons name="description" size={20} color={colors.textPrimary} />
            <Text style={[styles.quickActionText, { color: colors.textPrimary }]}>Templates</Text>
          </Pressable>
          <Pressable
            style={[styles.quickAction, { backgroundColor: colors.bgSecondary, borderColor: colors.border, borderWidth: 1 }]}
            onPress={() => navigation.navigate('ConfigTab' as never)}
          >
            <MaterialIcons name="settings" size={20} color={colors.textPrimary} />
            <Text style={[styles.quickActionText, { color: colors.textPrimary }]}>Config</Text>
          </Pressable>
        </View>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  metricsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 12,
  },
  card: {
    marginHorizontal: 16,
    marginTop: 16,
  },
  lastCard: {
    marginBottom: 24,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  viewAllLink: {
    fontSize: 13,
  },
  statusGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  statusItem: {
    flex: 1,
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
  },
  statusCount: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 4,
  },
  statusLabel: {
    fontSize: 11,
    marginTop: 2,
  },
  backupSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
  },
  backupText: {
    fontSize: 13,
  },
  recentDevices: {
    marginTop: 16,
  },
  recentTitle: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  recentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    gap: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  deviceName: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
  },
  deviceIp: {
    fontSize: 12,
  },
  deviceSeen: {
    fontSize: 11,
  },
  loadingText: {
    fontSize: 13,
    textAlign: 'center',
    paddingVertical: 16,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  emptyText: {
    fontSize: 13,
    marginTop: 8,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 10,
    borderBottomWidth: 1,
    gap: 10,
  },
  activityIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activityContent: {
    flex: 1,
  },
  activityType: {
    fontSize: 13,
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  activityDetails: {
    fontSize: 12,
    marginTop: 2,
  },
  activityMessage: {
    fontSize: 11,
    fontStyle: 'italic',
    marginTop: 2,
  },
  activityTime: {
    fontSize: 11,
  },
  quickActions: {
    flexDirection: 'row',
    gap: 8,
  },
  quickAction: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 8,
  },
  quickActionText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#fff',
  },
});
