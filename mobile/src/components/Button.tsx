import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, ViewStyle, TextStyle, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useAppTheme } from '../context';

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
  const { colors } = useAppTheme();
  const isDisabled = disabled || loading;
  const iconSize = size === 'sm' ? 14 : size === 'lg' ? 20 : 16;

  const getButtonStyle = () => {
    switch (variant) {
      case 'primary':
        return { backgroundColor: colors.accentBlue };
      case 'secondary':
        return { backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.border };
      case 'danger':
        return { backgroundColor: colors.errorBg };
      case 'ghost':
        return { backgroundColor: 'transparent' };
    }
  };

  const getTextColor = () => {
    switch (variant) {
      case 'primary':
        return '#fff';
      case 'secondary':
        return colors.textSecondary;
      case 'danger':
        return colors.error;
      case 'ghost':
        return colors.accentBlue;
    }
  };

  const getSizeStyle = () => {
    switch (size) {
      case 'sm':
        return { paddingHorizontal: 12, paddingVertical: 8 };
      case 'lg':
        return { paddingHorizontal: 24, paddingVertical: 14 };
      default:
        return { paddingHorizontal: 16, paddingVertical: 12 };
    }
  };

  const getFontSize = () => {
    switch (size) {
      case 'sm':
        return 13;
      case 'lg':
        return 16;
      default:
        return 14;
    }
  };

  const textColor = getTextColor();

  return (
    <TouchableOpacity
      style={[
        styles.button,
        getButtonStyle(),
        getSizeStyle(),
        isDisabled && styles.button_disabled,
        style,
      ]}
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.7}
    >
      {loading ? (
        <ActivityIndicator size="small" color={variant === 'primary' ? '#fff' : colors.textMuted} />
      ) : (
        <View style={styles.content}>
          {icon && (
            <MaterialIcons
              name={icon as keyof typeof MaterialIcons.glyphMap}
              size={iconSize}
              color={textColor}
            />
          )}
          <Text style={[styles.text, { color: textColor, fontSize: getFontSize() }, textStyle]}>
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
  button_disabled: {
    opacity: 0.6,
  },
  text: {
    fontWeight: '600',
  },
});
