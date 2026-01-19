import { View, Text, StyleSheet } from 'react-native';
import { Button } from './Button';
import { useAppTheme } from '../context';

interface Props {
  title?: string;
  message: string;
  details?: string;
  primaryAction?: {
    label: string;
    onPress: () => void;
  };
  secondaryAction?: {
    label: string;
    onPress: () => void;
  };
}

export function ErrorState({
  title = 'Error',
  message,
  details,
  primaryAction,
  secondaryAction,
}: Props) {
  const { colors } = useAppTheme();

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: colors.error }]}>{title}</Text>
      <Text style={[styles.message, { color: colors.textMuted }]}>{message}</Text>
      {details && (
        <Text style={[styles.details, { color: colors.textMuted }]}>{details}</Text>
      )}
      {primaryAction && (
        <Button
          title={primaryAction.label}
          onPress={primaryAction.onPress}
          size="lg"
          style={styles.primaryButton}
        />
      )}
      {secondaryAction && (
        <Button
          title={secondaryAction.label}
          onPress={secondaryAction.onPress}
          variant="secondary"
          size="lg"
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  message: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 8,
  },
  details: {
    fontSize: 12,
    fontFamily: 'monospace',
    marginBottom: 24,
  },
  primaryButton: {
    marginBottom: 12,
  },
});
