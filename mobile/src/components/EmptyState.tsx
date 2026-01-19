import { View, Text, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Button } from './Button';
import { useAppTheme } from '../context';

interface Props {
  message: string;
  description?: string;
  icon?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ message, description, icon, actionLabel, onAction }: Props) {
  const { colors } = useAppTheme();

  return (
    <View style={styles.container}>
      {icon && (
        <MaterialIcons
          name={icon as keyof typeof MaterialIcons.glyphMap}
          size={48}
          color={colors.textMuted}
          style={styles.icon}
        />
      )}
      <Text style={[styles.message, { color: colors.textMuted }]}>{message}</Text>
      {description && (
        <Text style={[styles.description, { color: colors.textMuted }]}>{description}</Text>
      )}
      {actionLabel && onAction && (
        <Button title={actionLabel} onPress={onAction} size="lg" />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  icon: {
    marginBottom: 16,
  },
  message: {
    fontSize: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  description: {
    fontSize: 13,
    marginBottom: 16,
    textAlign: 'center',
  },
});
