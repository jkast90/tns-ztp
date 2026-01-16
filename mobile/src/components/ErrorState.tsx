import { View, Text, StyleSheet } from 'react-native';
import { Button } from './Button';

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
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
      {details && <Text style={styles.details}>{details}</Text>}
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
    color: '#ff5252',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  message: {
    color: '#888',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 8,
  },
  details: {
    color: '#666',
    fontSize: 12,
    fontFamily: 'monospace',
    marginBottom: 24,
  },
  primaryButton: {
    marginBottom: 12,
  },
});
