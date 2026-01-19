import { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Alert,
  Pressable,
  RefreshControl,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';
import type { DiscoveredDevice } from '../core';
import {
  useDiscovery,
  useVendors,
  lookupVendorByMac,
  setVendorCache,
  formatExpiry,
} from '../core';
import { Card, Button, IconButton, EmptyState } from '../components';

export function DiscoveryScreen() {
  const navigation = useNavigation();
  const {
    discovered,
    allLeases,
    loading,
    error,
    refresh,
    refreshLeases,
    clearKnownDevices,
    message,
  } = useDiscovery({ autoRefresh: true, refreshInterval: 10000 });
  const { vendors } = useVendors();

  const [showAllLeases, setShowAllLeases] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Update vendor cache when vendors load (for MAC lookup)
  useEffect(() => {
    if (vendors.length > 0) {
      setVendorCache(vendors);
    }
  }, [vendors]);

  // Show messages
  if (message) {
    Alert.alert(
      message.type === 'error' ? 'Error' : 'Success',
      message.text
    );
  }

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refresh(), refreshLeases()]);
    setRefreshing(false);
  }, [refresh, refreshLeases]);

  const handleAddDevice = (device: DiscoveredDevice) => {
    // Auto-detect vendor from MAC address
    const detectedVendor = lookupVendorByMac(device.mac);
    const vendor = detectedVendor && detectedVendor !== 'Local' ? detectedVendor : '';

    // Navigate to device form with pre-filled data
    navigation.navigate('DeviceForm', {
      mac: device.mac,
      ip: device.ip,
      hostname: device.hostname,
      vendor,
    });
  };

  const handleClear = () => {
    Alert.alert(
      'Clear Discovery',
      'Clear all discovered devices from tracking? They will reappear on next DHCP activity.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: clearKnownDevices,
        },
      ]
    );
  };

  const displayData = showAllLeases ? allLeases : discovered;

  const renderDevice = ({ item }: { item: DiscoveredDevice }) => {
    const vendorInfo = lookupVendorByMac(item.mac);

    return (
      <Card style={styles.deviceCard}>
        <View style={styles.deviceHeader}>
          <View style={styles.deviceInfo}>
            <Text style={styles.mac}>{item.mac}</Text>
            {item.hostname && (
              <Text style={styles.hostname}>{item.hostname}</Text>
            )}
          </View>
          <IconButton
            icon="add"
            onPress={() => handleAddDevice(item)}
            style={styles.addButton}
          />
        </View>

        <View style={styles.deviceDetails}>
          <View style={styles.detailRow}>
            <MaterialIcons name="wifi" size={14} color="#888" />
            <Text style={styles.detailText}>{item.ip}</Text>
          </View>

          {vendorInfo && (
            <View style={styles.detailRow}>
              <MaterialIcons name="business" size={14} color="#888" />
              <Text style={styles.detailText}>{vendorInfo}</Text>
            </View>
          )}

          {item.expires_at && (
            <View style={styles.detailRow}>
              <MaterialIcons name="schedule" size={14} color="#888" />
              <Text style={styles.detailText}>
                Lease: {formatExpiry(item.expires_at)}
              </Text>
            </View>
          )}

          {item.first_seen && (
            <View style={styles.detailRow}>
              <MaterialIcons name="fiber-new" size={14} color="#4a9eff" />
              <Text style={[styles.detailText, styles.newLabel]}>New</Text>
            </View>
          )}
        </View>
      </Card>
    );
  };

  if (loading && discovered.length === 0) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#4a9eff" />
        <Text style={styles.loadingText}>Scanning for devices...</Text>
      </View>
    );
  }

  if (error && discovered.length === 0) {
    return (
      <View style={[styles.container, styles.centered]}>
        <MaterialIcons name="error-outline" size={48} color="#ff6b6b" />
        <Text style={styles.errorText}>{error}</Text>
        <Button title="Retry" onPress={refresh} variant="secondary" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Actions Bar */}
      <View style={styles.actions}>
        <Button
          title="Refresh"
          onPress={handleRefresh}
          icon="refresh"
          variant="secondary"
        />
        <Pressable
          style={[
            styles.toggleButton,
            showAllLeases && styles.toggleButtonActive,
          ]}
          onPress={() => setShowAllLeases(!showAllLeases)}
        >
          <MaterialIcons
            name={showAllLeases ? 'visibility-off' : 'visibility'}
            size={16}
            color={showAllLeases ? '#4a9eff' : '#888'}
          />
          <Text
            style={[
              styles.toggleButtonText,
              showAllLeases && styles.toggleButtonTextActive,
            ]}
          >
            {showAllLeases ? 'New Only' : 'All Leases'}
          </Text>
        </Pressable>
        {discovered.length > 0 && (
          <IconButton icon="delete-sweep" onPress={handleClear} />
        )}
      </View>

      {/* Status Bar */}
      <View style={styles.statusBar}>
        <Text style={styles.statusText}>
          {showAllLeases
            ? `${allLeases.length} active lease${allLeases.length !== 1 ? 's' : ''}`
            : `${discovered.length} new device${discovered.length !== 1 ? 's' : ''}`}
        </Text>
        <Text style={styles.autoRefreshText}>Auto-refreshing every 10s</Text>
      </View>

      {/* Device List */}
      <FlatList
        data={displayData}
        keyExtractor={(item) => item.mac}
        renderItem={renderDevice}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#4a9eff"
            colors={['#4a9eff']}
          />
        }
        ListEmptyComponent={
          <EmptyState
            icon="search"
            message={
              showAllLeases
                ? 'No active DHCP leases'
                : 'No new devices discovered'
            }
            description="Devices will appear here when they request a DHCP lease"
          />
        }
        contentContainerStyle={
          displayData.length === 0 ? styles.emptyList : styles.listContent
        }
      />

      {/* Info Card */}
      <Card style={styles.infoCard}>
        <View style={styles.infoHeader}>
          <MaterialIcons name="info-outline" size={18} color="#4a9eff" />
          <Text style={styles.infoTitle}>About Discovery</Text>
        </View>
        <Text style={styles.infoText}>
          Devices that receive a DHCP lease but aren't configured appear here.
          Tap the + button to add a device configuration.
        </Text>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f1a',
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    color: '#888',
    marginTop: 12,
  },
  errorText: {
    color: '#ff6b6b',
    marginTop: 12,
    marginBottom: 16,
    textAlign: 'center',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    paddingBottom: 8,
    alignItems: 'center',
  },
  toggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  toggleButtonActive: {
    backgroundColor: 'rgba(74, 158, 255, 0.1)',
    borderColor: 'rgba(74, 158, 255, 0.3)',
  },
  toggleButtonText: {
    color: '#888',
    fontSize: 13,
  },
  toggleButtonTextActive: {
    color: '#4a9eff',
  },
  statusBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  statusText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  autoRefreshText: {
    color: '#666',
    fontSize: 12,
  },
  listContent: {
    paddingBottom: 16,
  },
  emptyList: {
    flex: 1,
    justifyContent: 'center',
  },
  deviceCard: {
    marginHorizontal: 16,
    marginBottom: 8,
  },
  deviceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  deviceInfo: {
    flex: 1,
  },
  mac: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  hostname: {
    fontSize: 13,
    color: '#888',
    marginTop: 2,
  },
  addButton: {
    backgroundColor: 'rgba(74, 158, 255, 0.1)',
  },
  deviceDetails: {
    gap: 6,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    fontSize: 13,
    color: '#888',
  },
  newLabel: {
    color: '#4a9eff',
    fontWeight: '500',
  },
  infoCard: {
    margin: 16,
    marginTop: 8,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  infoText: {
    fontSize: 13,
    color: '#888',
    lineHeight: 18,
  },
});
