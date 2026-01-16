import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import type { Device } from '../core';
import { StatusBadge } from './StatusBadge';
import { InfoRow } from './InfoRow';
import { Button } from './Button';

interface Props {
  device: Device;
  onPress: () => void;
  onDelete: () => void;
}

export function DeviceCard({ device, onPress, onDelete }: Props) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress}>
      <View style={styles.header}>
        <Text style={styles.hostname}>{device.hostname}</Text>
        <StatusBadge status={device.status} />
      </View>

      <InfoRow label="MAC" value={device.mac} monospace />
      <InfoRow label="IP" value={device.ip} />
      {device.serial_number && (
        <InfoRow label="Serial" value={device.serial_number} monospace />
      )}
      <InfoRow label="Template" value={device.config_template} />

      <View style={styles.actions}>
        <Button
          title="Delete"
          variant="danger"
          size="sm"
          onPress={onDelete}
        />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#2a2a4e',
  },
  header: {
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
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#2a2a4e',
  },
});
