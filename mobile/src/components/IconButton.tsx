import { TouchableOpacity, StyleSheet, Text } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

interface Props {
  icon: string;
  onPress: () => void;
  size?: number;
  color?: string;
  disabled?: boolean;
}

export function IconButton({ icon, onPress, size = 24, color = '#fff', disabled = false }: Props) {
  return (
    <TouchableOpacity
      style={[styles.button, disabled && styles.disabled]}
      onPress={onPress}
      disabled={disabled}
    >
      <MaterialIcons name={icon as keyof typeof MaterialIcons.glyphMap} size={size} color={disabled ? '#555' : color} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    padding: 8,
    marginLeft: 8,
  },
  disabled: {
    opacity: 0.5,
  },
});
