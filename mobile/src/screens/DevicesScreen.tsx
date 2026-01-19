import { useCallback, useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, RefreshControl, Alert } from 'react-native';
import { useNavigation, useFocusEffect, CompositeNavigationProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useDevices } from '../core';
import { getApiUrl } from '../setup';
import type { Device } from '../core';
import type { RootStackParamList, TabParamList } from '../navigation/types';
import {
  DeviceCard,
  EmptyState,
  ErrorState,
  IconButton,
  LogoIcon,
} from '../components';

type NavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<TabParamList, 'DevicesTab'>,
  NativeStackNavigationProp<RootStackParamList>
>;

export function DevicesScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { devices, loading, error, refresh, deleteDevice } = useDevices();
  const [apiUrl, setApiUrl] = useState('');

  useEffect(() => {
    getApiUrl().then(setApiUrl);
  }, []);

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
            onPress={() => navigation.navigate('DeviceForm')}
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
    <DeviceCard
      device={item}
      onPress={() => navigation.navigate('DeviceForm', { mac: item.mac, editMode: true })}
      onDelete={() => handleDelete(item)}
    />
  );

  if (error && devices.length === 0) {
    return (
      <View style={styles.container}>
        <ErrorState
          title="Connection Error"
          message={error}
          details={`API URL: ${apiUrl}`}
          primaryAction={{
            label: 'Configure API URL',
            onPress: () => navigation.navigate('Settings'),
          }}
          secondaryAction={{
            label: 'Retry',
            onPress: refresh,
          }}
        />
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
          <EmptyState
            message={loading ? 'Loading devices...' : 'No devices configured'}
            actionLabel={loading ? undefined : 'Add Your First Device'}
            onAction={loading ? undefined : () => navigation.navigate('DeviceForm')}
          />
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
  emptyList: {
    flex: 1,
    justifyContent: 'center',
  },
});
