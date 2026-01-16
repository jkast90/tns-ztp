import { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Alert,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useDevices } from '../core';
import { getApiUrl } from '../setup';
import type { Device } from '../core';
import type { RootStackParamList } from '../navigation/types';
import { StatusBadge } from '../components/StatusBadge';
import { IconButton } from '../components/IconButton';
import { LogoIcon } from '../components/Logo';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Devices'>;

export function DevicesScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { devices, loading, error, refresh, deleteDevice } = useDevices();
  const [apiUrl, setApiUrl] = useState('');

  // Load API URL for display
  useEffect(() => {
    getApiUrl().then(setApiUrl);
  }, []);

  // Reload when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      refresh();
      getApiUrl().then(setApiUrl);
    }, [refresh])
  );

  useEffect(() => {
    navigation.setOptions({
      headerTitle: () => (
        <View style={styles.headerTitle}>
          <LogoIcon size={20} />
          <Text style={styles.headerTitleText}>ZTP Devices</Text>
        </View>
      ),
      headerRight: () => (
        <View style={styles.headerButtons}>
          <IconButton
            icon="settings"
            onPress={() => navigation.navigate('Settings')}
          />
          <IconButton
            icon="add"
            onPress={() => navigation.navigate('AddDevice')}
          />
        </View>
      ),
    });
  }, [navigation]);

  const handleDelete = (device: Device) => {
    Alert.alert(
      'Delete Device',
      `Are you sure you want to delete ${device.hostname}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteDevice(device.mac),
        },
      ]
    );
  };

  const renderDevice = ({ item }: { item: Device }) => (
    <TouchableOpacity
      style={styles.deviceCard}
      onPress={() => navigation.navigate('EditDevice', { mac: item.mac })}
    >
      <View style={styles.deviceHeader}>
        <Text style={styles.hostname}>{item.hostname}</Text>
        <StatusBadge status={item.status} />
      </View>
      <View style={styles.deviceInfo}>
        <Text style={styles.infoLabel}>MAC:</Text>
        <Text style={styles.infoValue}>{item.mac}</Text>
      </View>
      <View style={styles.deviceInfo}>
        <Text style={styles.infoLabel}>IP:</Text>
        <Text style={styles.infoValue}>{item.ip}</Text>
      </View>
      <View style={styles.deviceInfo}>
        <Text style={styles.infoLabel}>Template:</Text>
        <Text style={styles.infoValue}>{item.config_template}</Text>
      </View>
      <View style={styles.deviceActions}>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => handleDelete(item)}
        >
          <Text style={styles.deleteButtonText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  // Show error state with option to configure API URL
  if (error && devices.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>Connection Error</Text>
          <Text style={styles.errorText}>{error}</Text>
          <Text style={styles.apiUrlText}>API URL: {apiUrl}</Text>
          <TouchableOpacity
            style={styles.settingsButton}
            onPress={() => navigation.navigate('Settings')}
          >
            <Text style={styles.settingsButtonText}>Configure API URL</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={refresh}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={devices}
        keyExtractor={(item) => item.mac}
        renderItem={renderDevice}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={refresh}
            tintColor="#4a9eff"
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              {loading ? 'Loading devices...' : 'No devices configured'}
            </Text>
            {!loading && (
              <TouchableOpacity
                style={styles.addButton}
                onPress={() => navigation.navigate('AddDevice')}
              >
                <Text style={styles.addButtonText}>Add Your First Device</Text>
              </TouchableOpacity>
            )}
          </View>
        }
        contentContainerStyle={devices.length === 0 ? styles.emptyList : undefined}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f1a',
  },
  headerTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitleText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: 'bold',
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  deviceCard: {
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#2a2a4e',
  },
  deviceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  hostname: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  deviceInfo: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  infoLabel: {
    color: '#888',
    width: 80,
  },
  infoValue: {
    color: '#ccc',
    flex: 1,
    fontFamily: 'monospace',
  },
  deviceActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#2a2a4e',
  },
  deleteButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 82, 82, 0.2)',
  },
  deleteButtonText: {
    color: '#ff5252',
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emptyText: {
    color: '#888',
    fontSize: 16,
    marginBottom: 16,
  },
  emptyList: {
    flex: 1,
    justifyContent: 'center',
  },
  addButton: {
    backgroundColor: '#4a9eff',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  addButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  errorTitle: {
    color: '#ff5252',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  errorText: {
    color: '#888',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 8,
  },
  apiUrlText: {
    color: '#666',
    fontSize: 12,
    fontFamily: 'monospace',
    marginBottom: 24,
  },
  settingsButton: {
    backgroundColor: '#4a9eff',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 8,
    marginBottom: 12,
  },
  settingsButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  retryButton: {
    backgroundColor: '#2a2a4e',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#888',
    fontWeight: '600',
  },
});
