import { View, Text, Pressable, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useAppTheme } from '../context';

interface Props {
  /** Card title */
  title: string;
  /** Main metric value */
  value: number | string;
  /** Icon name from MaterialIcons */
  icon: keyof typeof MaterialIcons.glyphMap;
  /** Icon background color */
  color: string;
  /** Optional subtitle below value */
  subtitle?: string;
  /** Optional press handler */
  onPress?: () => void;
}

export function MetricCard({ title, value, icon, color, subtitle, onPress }: Props) {
  const { colors } = useAppTheme();

  return (
    <Pressable
      style={[styles.container, { backgroundColor: colors.bgCard, borderColor: colors.border }]}
      onPress={onPress}
      disabled={!onPress}
    >
      <View style={[styles.iconContainer, { backgroundColor: color }]}>
        <MaterialIcons name={icon} size={24} color="#fff" />
      </View>
      <Text style={[styles.value, { color: colors.textPrimary }]}>{value}</Text>
      <Text style={[styles.title, { color: colors.textMuted }]}>{title}</Text>
      {subtitle && (
        <Text style={[styles.subtitle, { color: colors.accentBlue }]}>{subtitle}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  value: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  title: {
    fontSize: 12,
    marginTop: 2,
  },
  subtitle: {
    fontSize: 11,
    marginTop: 2,
  },
});
