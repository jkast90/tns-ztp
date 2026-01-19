import { View, Text, StyleSheet } from 'react-native';
import type { DeviceStatus } from '../core';
import { useAppTheme } from '../context';

interface Props {
  status: DeviceStatus;
}

export function StatusBadge({ status }: Props) {
  const { colors } = useAppTheme();

  const getStatusColors = () => {
    switch (status) {
      case 'online':
        return { bg: colors.successBg, text: colors.success };
      case 'offline':
        return { bg: `${colors.textMuted}30`, text: colors.textMuted };
      case 'provisioning':
        return { bg: colors.warningBg, text: colors.warning };
      default:
        return { bg: `${colors.textMuted}30`, text: colors.textMuted };
    }
  };

  const statusColors = getStatusColors();

  return (
    <View style={[styles.badge, { backgroundColor: statusColors.bg }]}>
      <View style={[styles.dot, { backgroundColor: statusColors.text }]} />
      <Text style={[styles.text, { color: statusColors.text }]}>
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
