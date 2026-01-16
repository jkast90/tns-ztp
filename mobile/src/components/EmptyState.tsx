import { View, Text, StyleSheet } from 'react-native';
import { Button } from './Button';

interface Props {
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ message, actionLabel, onAction }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.message}>{message}</Text>
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
  message: {
    color: '#888',
    fontSize: 16,
    marginBottom: 16,
    textAlign: 'center',
  },
});
