import { TouchableOpacity, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useAppTheme } from '../context';

interface Props {
  onPress: () => void;
  size?: number;
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
}

export function ScanButton({ onPress, size = 20, style, disabled = false }: Props) {
  const { colors } = useAppTheme();

  return (
    <TouchableOpacity
      style={[
        styles.button,
        {
          backgroundColor: `${colors.accentBlue}15`,
          borderColor: `${colors.accentBlue}50`,
        },
        disabled && {
          opacity: 0.5,
          backgroundColor: colors.bgCard,
          borderColor: colors.border,
        },
        style,
      ]}
      onPress={onPress}
      disabled={disabled}
    >
      <MaterialIcons
        name="qr-code-scanner"
        size={size}
        color={disabled ? colors.textMuted : colors.accentBlue}
      />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 44,
    height: 48, // Match FormInput height
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
