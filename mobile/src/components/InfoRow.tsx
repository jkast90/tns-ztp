import { View, Text, StyleSheet } from 'react-native';
import { MONOSPACE_FONT } from '../core';
import { useAppTheme } from '../context';

interface Props {
  /** Label text displayed before the colon */
  label: string;
  /** Value text displayed after the label */
  value: string;
  /** Whether to use monospace font for the value */
  monospace?: boolean;
  /** Custom label width (default: 80) */
  labelWidth?: number;
}

export function InfoRow({ label, value, monospace = false, labelWidth = 80 }: Props) {
  const { colors } = useAppTheme();

  return (
    <View style={styles.row}>
      <Text style={[styles.label, { color: colors.textMuted, width: labelWidth }]}>{label}:</Text>
      <Text
        style={[
          styles.value,
          { color: colors.textSecondary },
          monospace && { fontFamily: MONOSPACE_FONT },
        ]}
      >
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  label: {
    fontSize: 12,
  },
  value: {
    flex: 1,
    fontSize: 12,
  },
});
