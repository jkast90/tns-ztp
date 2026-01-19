import { Switch, SwitchProps } from 'react-native';
import { useAppTheme } from '../context';

interface ThemedSwitchProps extends Omit<SwitchProps, 'trackColor' | 'thumbColor' | 'ios_backgroundColor'> {
  /** Current value */
  value: boolean;
  /** Called when value changes */
  onValueChange: (value: boolean) => void;
}

/**
 * ThemedSwitch - a Switch with consistent theme colors.
 * Eliminates the repeated trackColor/thumbColor pattern.
 *
 * @example
 * <ThemedSwitch
 *   value={item.enabled}
 *   onValueChange={(enabled) => handleToggle(item.id, enabled)}
 * />
 */
export function ThemedSwitch({ value, onValueChange, ...props }: ThemedSwitchProps) {
  const { colors } = useAppTheme();

  return (
    <Switch
      value={value}
      onValueChange={onValueChange}
      trackColor={{
        false: colors.bgSecondary,
        true: `${colors.accentBlue}80`, // 50% opacity
      }}
      thumbColor={value ? colors.accentBlue : colors.textMuted}
      ios_backgroundColor={colors.bgSecondary}
      {...props}
    />
  );
}
