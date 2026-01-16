import { View, Text, StyleSheet } from 'react-native';

interface Props {
  label: string;
  value: string;
  monospace?: boolean;
}

export function InfoRow({ label, value, monospace = false }: Props) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}:</Text>
      <Text style={[styles.value, monospace && styles.monospace]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  label: {
    color: '#888',
    width: 80,
  },
  value: {
    color: '#ccc',
    flex: 1,
  },
  monospace: {
    fontFamily: 'monospace',
  },
});
