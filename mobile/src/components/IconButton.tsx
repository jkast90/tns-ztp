import { TouchableOpacity, StyleSheet, Text } from 'react-native';

interface Props {
  icon: string;
  onPress: () => void;
  size?: number;
  color?: string;
}

// Map icon names to emoji/unicode as fallback (Material Icons require additional setup)
const iconMap: Record<string, string> = {
  add: '+',
  settings: '\u2699', // gear
  'qr-code-scanner': '\u25A1', // square for scanner
  delete: '\u2717', // X mark
};

export function IconButton({ icon, onPress, size = 24, color = '#fff' }: Props) {
  return (
    <TouchableOpacity style={styles.button} onPress={onPress}>
      <Text style={[styles.icon, { fontSize: size, color }]}>
        {iconMap[icon] || icon}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    padding: 8,
    marginLeft: 8,
  },
  icon: {
    fontWeight: 'bold',
  },
});
