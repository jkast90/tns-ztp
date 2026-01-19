import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import type { Device } from '../core';
import { StatusBadge } from './StatusBadge';
import { InfoRow } from './InfoRow';
import { Button } from './Button';
import { useAppTheme } from '../context';

interface Props {
  device: Device;
  onPress: () => void;
  onDelete: () => void;
  onActions?: () => void;
}

export function DeviceCard({ device, onPress, onDelete, onActions }: Props) {
  const { colors } = useAppTheme();

  return (
    <TouchableOpacity
      style={[
        styles.card,
        {
          backgroundColor: colors.bgCard,
          borderColor: colors.border,
        },
      ]}
      onPress={onPress}
    >
      <View style={styles.header}>
        <Text style={[styles.hostname, { color: colors.textPrimary }]}>{device.hostname}</Text>
        <StatusBadge status={device.status} />
      </View>

      <InfoRow label="MAC" value={device.mac} monospace />
      <InfoRow label="IP" value={device.ip} />
      {device.serial_number && (
        <InfoRow label="Serial" value={device.serial_number} monospace />
      )}
      <InfoRow label="Template" value={device.config_template} />

      <View style={[styles.actions, { borderTopColor: colors.border }]}>
        {onActions && (
          <Button
            title="Actions"
            variant="secondary"
            size="sm"
            onPress={onActions}
            icon="more-horiz"
          />
        )}
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
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginTop: 16,
    borderWidth: 1,
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
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
  },
});
