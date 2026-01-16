import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, ViewStyle, TextStyle, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';
type ButtonSize = 'sm' | 'md' | 'lg';

interface Props {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  icon?: string;
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  style,
  textStyle,
  icon,
}: Props) {
  const isDisabled = disabled || loading;
  const iconSize = size === 'sm' ? 14 : size === 'lg' ? 20 : 16;
  const iconColor = variant === 'primary' ? '#fff' : variant === 'danger' ? '#ff5252' : '#888';

  return (
    <TouchableOpacity
      style={[
        styles.button,
        styles[`button_${variant}`],
        styles[`button_${size}`],
        isDisabled && styles.button_disabled,
        style,
      ]}
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.7}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'primary' ? '#fff' : '#888'}
        />
      ) : (
        <View style={styles.content}>
          {icon && (
            <MaterialIcons
              name={icon as keyof typeof MaterialIcons.glyphMap}
              size={iconSize}
              color={iconColor}
            />
          )}
          <Text
            style={[
              styles.text,
              styles[`text_${variant}`],
              styles[`text_${size}`],
              textStyle,
            ]}
          >
            {title}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    flex: 1,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  button_primary: {
    backgroundColor: '#4a9eff',
  },
  button_secondary: {
    backgroundColor: '#2a2a4e',
  },
  button_danger: {
    backgroundColor: 'rgba(255, 82, 82, 0.2)',
  },
  button_ghost: {
    backgroundColor: 'transparent',
  },
  button_sm: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  button_md: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  button_lg: {
    paddingHorizontal: 24,
    paddingVertical: 14,
  },
  button_disabled: {
    opacity: 0.6,
  },
  text: {
    fontWeight: '600',
  },
  text_primary: {
    color: '#fff',
  },
  text_secondary: {
    color: '#888',
  },
  text_danger: {
    color: '#ff5252',
  },
  text_ghost: {
    color: '#4a9eff',
  },
  text_sm: {
    fontSize: 13,
  },
  text_md: {
    fontSize: 14,
  },
  text_lg: {
    fontSize: 16,
  },
});
