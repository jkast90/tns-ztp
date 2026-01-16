import { View, StyleSheet } from 'react-native';
import { Button } from './Button';

interface Props {
  onCancel: () => void;
  onSubmit: () => void;
  submitLabel?: string;
  cancelLabel?: string;
  loading?: boolean;
  disabled?: boolean;
}

export function ActionButtons({
  onCancel,
  onSubmit,
  submitLabel = 'Save',
  cancelLabel = 'Cancel',
  loading = false,
  disabled = false,
}: Props) {
  return (
    <View style={styles.container}>
      <Button
        title={cancelLabel}
        onPress={onCancel}
        variant="secondary"
        size="lg"
        style={styles.cancelButton}
      />
      <Button
        title={submitLabel}
        onPress={onSubmit}
        size="lg"
        loading={loading}
        disabled={disabled}
        style={styles.submitButton}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  cancelButton: {
    flex: 1,
  },
  submitButton: {
    flex: 2,
  },
});
