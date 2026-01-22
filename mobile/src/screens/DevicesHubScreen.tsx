import { useState, useCallback, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  Pressable,
  Platform,
  TextInput,
} from 'react-native';
import { confirmDelete, confirmAction, showError } from '../utils/alerts';
import { useNavigation, useFocusEffect, CompositeNavigationProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { MaterialIcons } from '@expo/vector-icons';
import type { Device, DiscoveredDevice, DiscoveryLog, TestContainer, SpawnContainerRequest } from '../core';
import {
  useDevices,
  useDiscovery,
  useTestContainers,
  useVendors,
  lookupVendorByMac,
  setVendorCache,
  formatExpiry,
  formatDate,
  formatEventType,
  getEventTypeIcon,
  getServices,
  generateMac,
  getVendorPrefixOptions,
  getVendorClassForVendor,
  VENDOR_CLASS_OPTIONS,
  CONFIG_METHOD_OPTIONS,
} from '../core';
import { getApiUrl } from '../setup';
import type { RootStackParamList, TabParamList } from '../navigation/types';
import {
  Card,
  Button,
  DeviceActionsModal,
  DeviceCard,
  EmptyState,
  ErrorState,
  IconButton,
  LogoIcon,
  FormSelect,
  Modal,
} from '../components';
import { useAppTheme } from '../context';

type NavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<TabParamList, 'DevicesTab'>,
  NativeStackNavigationProp<RootStackParamList>
>;

type TabType = 'devices' | 'discovery' | 'containers';

const TABS: { key: TabType; label: string; icon: string }[] = [
  { key: 'devices', label: 'Devices', icon: 'devices' },
  { key: 'discovery', label: 'Discovery', icon: 'wifi-find' },
  { key: 'containers', label: 'Test', icon: 'dns' },
];

export function DevicesHubScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { colors } = useAppTheme();
  const [activeTab, setActiveTab] = useState<TabType>('devices');
  const [apiUrl, setApiUrl] = useState('');

  // Devices state
  const { devices, loading: devicesLoading, error: devicesError, refresh: refreshDevices, deleteDevice } = useDevices();
  const { vendors } = useVendors();

  // Update vendor cache when vendors load (for MAC lookup)
  useEffect(() => {
    if (vendors.length > 0) {
      setVendorCache(vendors);
    }
  }, [vendors]);

  // Discovery state
  const {
    discovered,
    allLeases,
    loading: discoveryLoading,
    refresh: refreshDiscovery,
    refreshLeases,
    clearKnownDevices,
  } = useDiscovery({ autoRefresh: activeTab === 'discovery', refreshInterval: 10000 });
  const [showAllLeases, setShowAllLeases] = useState(false);
  const [showLogs, setShowLogs] = useState(false);
  const [logs, setLogs] = useState<DiscoveryLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);

  // Device actions modal state
  const [actionsDevice, setActionsDevice] = useState<Device | null>(null);

  // Test containers state
  const {
    containers,
    loading: containersLoading,
    error: containersError,
    refresh: refreshContainers,
    spawn,
    remove,
  } = useTestContainers({ autoRefresh: activeTab === 'containers', refreshInterval: 5000 });

  // Spawn dialog state
  const [showSpawnDialog, setShowSpawnDialog] = useState(false);
  const [spawning, setSpawning] = useState(false);
  const [spawnFormData, setSpawnFormData] = useState<SpawnContainerRequest>({
    hostname: '',
    mac: '',
    vendor_class: '',
    config_method: 'tftp',
  });
  const [selectedVendorPrefix, setSelectedVendorPrefix] = useState('');
  const vendorPrefixOptions = useMemo(() => getVendorPrefixOptions(), []);

  useEffect(() => {
    getApiUrl().then(setApiUrl);
  }, []);

  useFocusEffect(
    useCallback(() => {
      refreshDevices();
      getApiUrl().then(setApiUrl);
    }, [refreshDevices])
  );

  useEffect(() => {
    navigation.setOptions({
      headerTitle: () => (
        <View style={styles.headerTitle}>
          <LogoIcon size={20} />
          <Text style={[styles.headerTitleText, { color: colors.textPrimary }]}>ZTP Server</Text>
        </View>
      ),
      headerRight: () => (
        <IconButton icon="add" onPress={() => navigation.navigate('DeviceForm')} />
      ),
    });
  }, [navigation, colors]);

  // Discovery logs functions
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
    if (showLogs) {
      loadLogs();
    }
  }, [showLogs, loadLogs]);

  const handleRefresh = useCallback(async () => {
    switch (activeTab) {
      case 'devices':
        await refreshDevices();
        break;
      case 'discovery':
        await Promise.all([refreshDiscovery(), refreshLeases()]);
        break;
      case 'containers':
        await refreshContainers();
        break;
    }
  }, [activeTab, refreshDevices, refreshDiscovery, refreshLeases, refreshContainers]);

  // Devices handlers
  const handleDeleteDevice = (device: Device) => {
    confirmDelete({
      itemName: device.hostname,
      itemType: 'device',
      onConfirm: async () => {
        await deleteDevice(device.mac);
      },
    });
  };

  // Discovery handlers
  const handleAddFromDiscovery = (device: DiscoveredDevice) => {
    // Auto-detect vendor from MAC address
    const detectedVendor = lookupVendorByMac(device.mac);
    const vendor = detectedVendor && detectedVendor !== 'Local' ? detectedVendor : '';

    navigation.navigate('DeviceForm', {
      mac: device.mac,
      ip: device.ip,
      hostname: device.hostname,
      vendor,
    });
  };

  const handleClearDiscovery = () => {
    confirmAction({
      title: 'Clear Discovery',
      message: 'Clear all discovered devices?',
      confirmText: 'Clear',
      destructive: true,
      onConfirm: clearKnownDevices,
    });
  };

  // Container handlers
  const handleOpenSpawnDialog = () => {
    const mac = generateMac();
    setSpawnFormData({ hostname: '', mac, vendor_class: '', config_method: 'tftp' });
    setSelectedVendorPrefix('');
    setShowSpawnDialog(true);
  };

  const handleVendorPrefixChange = (prefix: string) => {
    setSelectedVendorPrefix(prefix);
    const mac = generateMac(prefix || undefined);
    const selectedOption = vendorPrefixOptions.find((opt) => opt.value === prefix);
    const vendorClass = selectedOption ? getVendorClassForVendor(selectedOption.vendor) : '';
    setSpawnFormData((prev) => ({ ...prev, mac, vendor_class: vendorClass }));
  };

  const handleGenerateMac = () => {
    const mac = generateMac(selectedVendorPrefix || undefined);
    setSpawnFormData((prev) => ({ ...prev, mac }));
  };

  const handleSpawn = async () => {
    if (!spawnFormData.mac?.trim()) {
      showError('MAC address is required');
      return;
    }
    setSpawning(true);
    try {
      await spawn(spawnFormData);
      setShowSpawnDialog(false);
    } finally {
      setSpawning(false);
    }
  };

  const handleRemoveContainer = (container: TestContainer) => {
    confirmAction({
      title: 'Remove Container',
      message: `Remove "${container.hostname}"?`,
      confirmText: 'Remove',
      destructive: true,
      onConfirm: async () => {
        await remove(container.id);
      },
    });
  };

  // Render functions
  const renderDevice = ({ item }: { item: Device }) => (
    <DeviceCard
      device={item}
      onPress={() => navigation.navigate('DeviceForm', { mac: item.mac, editMode: true })}
      onDelete={() => handleDeleteDevice(item)}
      onActions={() => setActionsDevice(item)}
    />
  );

  const renderDiscoveredDevice = ({ item }: { item: DiscoveredDevice }) => {
    const vendorInfo = lookupVendorByMac(item.mac);
    return (
      <Card style={styles.itemCard}>
        <View style={styles.itemHeader}>
          <View style={styles.itemInfo}>
            <Text style={[styles.macText, { color: colors.textMuted }]}>{item.mac}</Text>
            {item.hostname && <Text style={[styles.hostnameText, { color: colors.textPrimary }]}>{item.hostname}</Text>}
          </View>
          <IconButton
            icon="add"
            onPress={() => handleAddFromDiscovery(item)}
            style={[styles.addButton, { backgroundColor: `${colors.accentBlue}15` }]}
          />
        </View>
        <View style={styles.itemDetails}>
          <View style={styles.detailRow}>
            <MaterialIcons name="wifi" size={14} color={colors.textMuted} />
            <Text style={[styles.detailText, { color: colors.textMuted }]}>{item.ip}</Text>
          </View>
          {vendorInfo && (
            <View style={styles.detailRow}>
              <MaterialIcons name="business" size={14} color={colors.textMuted} />
              <Text style={[styles.detailText, { color: colors.textMuted }]}>{vendorInfo}</Text>
            </View>
          )}
          {item.expires_at && (
            <View style={styles.detailRow}>
              <MaterialIcons name="schedule" size={14} color={colors.textMuted} />
              <Text style={[styles.detailText, { color: colors.textMuted }]}>Lease: {formatExpiry(item.expires_at)}</Text>
            </View>
          )}
        </View>
      </Card>
    );
  };

  const renderContainer = ({ item }: { item: TestContainer }) => (
    <Card style={styles.itemCard}>
      <View style={styles.itemHeader}>
        <View style={styles.itemInfo}>
          <Text style={[styles.hostnameText, { color: colors.textPrimary }]}>{item.hostname}</Text>
          <Text style={[styles.macText, { color: colors.textMuted }]}>{item.mac}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: item.status === 'running' ? colors.successBg : colors.errorBg }]}>
          <Text style={[styles.statusText, { color: item.status === 'running' ? colors.success : colors.error }]}>{item.status}</Text>
        </View>
      </View>
      <View style={styles.itemDetails}>
        <View style={styles.detailRow}>
          <MaterialIcons name="wifi" size={14} color={colors.textMuted} />
          <Text style={[styles.detailText, { color: colors.textMuted }]}>{item.ip || 'Pending IP...'}</Text>
        </View>
      </View>
      <View style={styles.itemActions}>
        <IconButton icon="delete" onPress={() => handleRemoveContainer(item)} />
      </View>
    </Card>
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'devices':
        if (devicesError && devices.length === 0) {
          return (
            <ErrorState
              title="Connection Error"
              message={devicesError}
              details={`API URL: ${apiUrl}`}
              primaryAction={{ label: 'Configure API URL', onPress: () => navigation.navigate('Main', { screen: 'ConfigTab', params: { screen: 'SettingsConfig' } } as never) }}
              secondaryAction={{ label: 'Retry', onPress: refreshDevices }}
            />
          );
        }
        return (
          <FlatList
            data={devices}
            keyExtractor={(item) => item.mac}
            renderItem={renderDevice}
            refreshControl={<RefreshControl refreshing={devicesLoading} onRefresh={handleRefresh} tintColor={colors.accentBlue} />}
            ListEmptyComponent={
              <EmptyState
                icon="devices"
                message={devicesLoading ? 'Loading devices...' : 'No devices configured'}
                actionLabel={devicesLoading ? undefined : 'Add Device'}
                onAction={devicesLoading ? undefined : () => navigation.navigate('DeviceForm')}
              />
            }
            contentContainerStyle={devices.length === 0 ? styles.emptyList : styles.listContent}
          />
        );

      case 'discovery':
        const displayData = showAllLeases ? allLeases : discovered;
        return (
          <>
            <View style={styles.subActions}>
              <Pressable
                style={[
                  styles.toggleButton,
                  { backgroundColor: colors.bgCard, borderColor: colors.border },
                  showAllLeases && { backgroundColor: `${colors.accentBlue}15`, borderColor: `${colors.accentBlue}50` },
                ]}
                onPress={() => setShowAllLeases(!showAllLeases)}
              >
                <MaterialIcons
                  name={showAllLeases ? 'visibility-off' : 'visibility'}
                  size={14}
                  color={showAllLeases ? colors.accentBlue : colors.textMuted}
                />
                <Text style={[styles.toggleButtonText, { color: showAllLeases ? colors.accentBlue : colors.textMuted }]}>
                  {showAllLeases ? 'New Only' : 'All Leases'}
                </Text>
              </Pressable>
              <Pressable
                style={[
                  styles.toggleButton,
                  { backgroundColor: colors.bgCard, borderColor: colors.border },
                  showLogs && { backgroundColor: `${colors.accentBlue}15`, borderColor: `${colors.accentBlue}50` },
                ]}
                onPress={() => setShowLogs(!showLogs)}
              >
                <MaterialIcons
                  name="history"
                  size={14}
                  color={showLogs ? colors.accentBlue : colors.textMuted}
                />
                <Text style={[styles.toggleButtonText, { color: showLogs ? colors.accentBlue : colors.textMuted }]}>
                  {showLogs ? 'Devices' : 'Logs'}
                </Text>
              </Pressable>
              {!showLogs && discovered.length > 0 && (
                <IconButton icon="delete-sweep" onPress={handleClearDiscovery} size={20} />
              )}
              {showLogs && logs.length > 0 && (
                <IconButton icon="delete-sweep" onPress={clearLogs} size={20} />
              )}
              <Text style={[styles.countText, { color: colors.textMuted }]}>
                {showLogs
                  ? `${logs.length} events`
                  : showAllLeases
                    ? `${allLeases.length} leases`
                    : `${discovered.length} new`}
              </Text>
            </View>
            {showLogs ? (
              logsLoading && logs.length === 0 ? (
                <View style={styles.loadingContainer}>
                  <Text style={[styles.loadingText, { color: colors.textMuted }]}>Loading logs...</Text>
                </View>
              ) : logs.length === 0 ? (
                <EmptyState
                  icon="history"
                  message="No discovery events logged"
                  description="Events will appear here when devices are discovered or leases are renewed"
                />
              ) : (
                <FlatList
                  data={logs}
                  keyExtractor={(item) => String(item.id)}
                  renderItem={({ item: log }) => (
                    <Card style={styles.logCard}>
                      <View style={styles.logHeader}>
                        <MaterialIcons
                          name={getEventTypeIcon(log.event_type) as keyof typeof MaterialIcons.glyphMap}
                          size={18}
                          color={colors.accentBlue}
                        />
                        <View style={[styles.logTypeBadge, { backgroundColor: `${colors.accentBlue}15` }]}>
                          <Text style={[styles.logTypeText, { color: colors.accentBlue }]}>
                            {formatEventType(log.event_type)}
                          </Text>
                        </View>
                        <Text style={[styles.logMac, { color: colors.textPrimary }]}>{log.mac}</Text>
                      </View>
                      <View style={styles.logDetails}>
                        <Text style={[styles.logIp, { color: colors.textMuted }]}>{log.ip}</Text>
                        {log.hostname && (
                          <Text style={[styles.logHostname, { color: colors.textSecondary }]}>{log.hostname}</Text>
                        )}
                        {log.message && (
                          <Text style={[styles.logMessage, { color: colors.textMuted }]}>{log.message}</Text>
                        )}
                      </View>
                      <Text style={[styles.logTime, { color: colors.textMuted }]}>{formatDate(log.created_at)}</Text>
                    </Card>
                  )}
                  refreshControl={<RefreshControl refreshing={logsLoading} onRefresh={loadLogs} tintColor={colors.accentBlue} />}
                  contentContainerStyle={styles.listContent}
                />
              )
            ) : (
              <FlatList
                data={displayData}
                keyExtractor={(item) => item.mac}
                renderItem={renderDiscoveredDevice}
                refreshControl={<RefreshControl refreshing={discoveryLoading} onRefresh={handleRefresh} tintColor={colors.accentBlue} />}
                ListEmptyComponent={
                  <EmptyState
                    icon="search"
                    message={showAllLeases ? 'No active DHCP leases' : 'No new devices discovered'}
                    description="Devices will appear here when they request a DHCP lease"
                  />
                }
                contentContainerStyle={displayData.length === 0 ? styles.emptyList : styles.listContent}
              />
            )}
          </>
        );

      case 'containers':
        return (
          <>
            <View style={styles.subActions}>
              <Button title="Spawn" onPress={handleOpenSpawnDialog} icon="add" size="sm" />
              <Text style={[styles.countText, { color: colors.textMuted }]}>{containers.length} running</Text>
            </View>
            {containersError && (
              <Card style={[styles.errorCard, { backgroundColor: colors.errorBg, borderColor: `${colors.error}50` }]}>
                <View style={styles.errorContent}>
                  <MaterialIcons name="error-outline" size={16} color={colors.error} />
                  <Text style={[styles.errorText, { color: colors.error }]}>Docker not available</Text>
                </View>
              </Card>
            )}
            <FlatList
              data={containers}
              keyExtractor={(item) => item.id}
              renderItem={renderContainer}
              refreshControl={<RefreshControl refreshing={containersLoading} onRefresh={handleRefresh} tintColor={colors.accentBlue} />}
              ListEmptyComponent={
                <EmptyState
                  icon="dns"
                  message="No test containers"
                  description="Spawn a test device to simulate network equipment"
                  actionLabel="Spawn Device"
                  onAction={handleOpenSpawnDialog}
                />
              }
              contentContainerStyle={containers.length === 0 ? styles.emptyList : styles.listContent}
            />
          </>
        );
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bgPrimary }]}>
      {/* Tab Bar */}
      <View style={[styles.tabBar, { backgroundColor: colors.bgCard, borderBottomColor: colors.border }]}>
        {TABS.map((tab) => (
          <Pressable
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && { borderBottomColor: colors.accentBlue }]}
            onPress={() => setActiveTab(tab.key)}
          >
            <MaterialIcons
              name={tab.icon as keyof typeof MaterialIcons.glyphMap}
              size={18}
              color={activeTab === tab.key ? colors.accentBlue : colors.textMuted}
            />
            <Text style={[styles.tabLabel, { color: activeTab === tab.key ? colors.accentBlue : colors.textMuted }]}>
              {tab.label}
            </Text>
            {tab.key === 'discovery' && discovered.length > 0 && (
              <View style={[styles.badge, { backgroundColor: colors.accentBlue }]}>
                <Text style={styles.badgeText}>{discovered.length}</Text>
              </View>
            )}
            {tab.key === 'containers' && containers.length > 0 && (
              <View style={[styles.badge, { backgroundColor: colors.accentBlue }]}>
                <Text style={styles.badgeText}>{containers.length}</Text>
              </View>
            )}
          </Pressable>
        ))}
      </View>

      {/* Content */}
      <View style={styles.content}>{renderContent()}</View>

      {/* Device Actions Modal */}
      <DeviceActionsModal
        device={actionsDevice}
        visible={!!actionsDevice}
        onClose={() => setActionsDevice(null)}
        onRefresh={refreshDevices}
      />

      {/* Spawn Dialog */}
      <Modal
        visible={showSpawnDialog}
        onClose={() => setShowSpawnDialog(false)}
        title="Spawn Test Device"
        size="medium"
        keyboardAware
        footer={
          <>
            <Button title="Cancel" onPress={() => setShowSpawnDialog(false)} variant="secondary" />
            <Button title={spawning ? 'Spawning...' : 'Spawn'} onPress={handleSpawn} disabled={spawning} />
          </>
        }
      >
        <View style={styles.formGroup}>
          <Text style={[styles.label, { color: colors.textMuted }]}>Hostname (optional)</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.bgPrimary, borderColor: colors.border, color: colors.textPrimary }]}
            value={spawnFormData.hostname}
            onChangeText={(text) => setSpawnFormData((prev) => ({ ...prev, hostname: text }))}
            placeholder="test-switch-01"
            placeholderTextColor={colors.textMuted}
          />
        </View>

        <FormSelect
          label="Vendor MAC Prefix"
          value={selectedVendorPrefix}
          options={vendorPrefixOptions}
          onChange={handleVendorPrefixChange}
          placeholder="Random MAC"
        />

        <View style={styles.formGroup}>
          <Text style={[styles.label, { color: colors.textMuted }]}>MAC Address</Text>
          <View style={styles.macInputRow}>
            <TextInput
              style={[styles.input, styles.macInput, { backgroundColor: colors.bgPrimary, borderColor: colors.border, color: colors.textPrimary }]}
              value={spawnFormData.mac}
              onChangeText={(text) => setSpawnFormData((prev) => ({ ...prev, mac: text }))}
              placeholder="aa:bb:cc:dd:ee:ff"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="none"
            />
            <Pressable style={[styles.generateButton, { backgroundColor: `${colors.accentBlue}15`, borderColor: `${colors.accentBlue}50` }]} onPress={handleGenerateMac}>
              <MaterialIcons name="refresh" size={20} color={colors.accentBlue} />
            </Pressable>
          </View>
        </View>

        <FormSelect
          label="DHCP Vendor Class"
          value={spawnFormData.vendor_class || ''}
          options={VENDOR_CLASS_OPTIONS}
          onChange={(value) => setSpawnFormData((prev) => ({ ...prev, vendor_class: value }))}
          placeholder="None"
        />

        <View style={styles.formGroup}>
          <Text style={[styles.label, { color: colors.textMuted }]}>Config Method</Text>
          <View style={styles.methodOptions}>
            {CONFIG_METHOD_OPTIONS.map((option) => (
              <Pressable
                key={option.value}
                style={[
                  styles.methodOption,
                  { backgroundColor: colors.bgPrimary, borderColor: colors.border },
                  spawnFormData.config_method === option.value && { backgroundColor: `${colors.accentBlue}15`, borderColor: colors.accentBlue },
                ]}
                onPress={() => setSpawnFormData((prev) => ({ ...prev, config_method: option.value as 'tftp' | 'http' | 'both' }))}
              >
                <Text style={[styles.methodOptionLabel, { color: spawnFormData.config_method === option.value ? colors.accentBlue : colors.textMuted }]}>
                  {option.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitleText: {
    fontSize: 17,
    fontWeight: 'bold',
  },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  badge: {
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    marginLeft: 2,
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
  },
  subActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    paddingBottom: 8,
  },
  toggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
  },
  toggleButtonText: {
    fontSize: 12,
  },
  countText: {
    fontSize: 12,
    marginLeft: 'auto',
  },
  listContent: {
    paddingBottom: 16,
  },
  emptyList: {
    flex: 1,
    justifyContent: 'center',
  },
  itemCard: {
    marginHorizontal: 12,
    marginBottom: 8,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  itemInfo: {
    flex: 1,
  },
  macText: {
    fontSize: 13,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  hostnameText: {
    fontSize: 15,
    fontWeight: 'bold',
  },
  addButton: {
    borderRadius: 8,
    padding: 6,
    marginLeft: 0,
  },
  itemDetails: {
    gap: 4,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailText: {
    fontSize: 12,
  },
  itemActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  errorCard: {
    marginHorizontal: 12,
    marginBottom: 8,
  },
  errorContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  errorText: {
    fontSize: 12,
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 12,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  input: {
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
  },
  macInputRow: {
    flexDirection: 'row',
    gap: 8,
  },
  macInput: {
    flex: 1,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  generateButton: {
    borderRadius: 8,
    padding: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  methodOptions: {
    flexDirection: 'row',
    gap: 8,
  },
  methodOption: {
    flex: 1,
    borderRadius: 8,
    padding: 10,
    alignItems: 'center',
    borderWidth: 1,
  },
  methodOptionLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  // Discovery logs styles
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    fontSize: 14,
    marginTop: 8,
  },
  logCard: {
    marginHorizontal: 12,
    marginBottom: 8,
    padding: 12,
  },
  logHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  logTypeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  logTypeText: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  logMac: {
    fontSize: 13,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    flex: 1,
  },
  logDetails: {
    gap: 4,
    marginBottom: 8,
  },
  logIp: {
    fontSize: 12,
  },
  logHostname: {
    fontSize: 13,
    fontWeight: '500',
  },
  logMessage: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  logTime: {
    fontSize: 11,
  },
});
