import { View, Text, StyleSheet } from 'react-native';
import type { DeviceStatus } from '../core';

interface Props {
  status: DeviceStatus;
}

const statusColors: Record<DeviceStatus, { bg: string; text: string }> = {
  online: { bg: 'rgba(76, 175, 80, 0.2)', text: '#4caf50' },
  offline: { bg: 'rgba(158, 158, 158, 0.2)', text: '#9e9e9e' },
  provisioning: { bg: 'rgba(255, 193, 7, 0.2)', text: '#ffc107' },
  unknown: { bg: 'rgba(158, 158, 158, 0.2)', text: '#9e9e9e' },
};

export function StatusBadge({ status }: Props) {
  const colors = statusColors[status] || statusColors.unknown;

  return (
    <View style={[styles.badge, { backgroundColor: colors.bg }]}>
      <View style={[styles.dot, { backgroundColor: colors.text }]} />
      <Text style={[styles.text, { color: colors.text }]}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  text: {
    fontSize: 12,
    fontWeight: '600',
  },
});
