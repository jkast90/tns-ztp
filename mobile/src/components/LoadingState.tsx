import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';

interface Props {
  message?: string;
  size?: 'small' | 'large';
}

export function LoadingState({ message = 'Loading...', size = 'large' }: Props) {
  return (
    <View style={styles.container}>
      <ActivityIndicator size={size} color="#4a9eff" />
      <Text style={styles.message}>{message}</Text>
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
  message: {
    color: '#888',
    marginTop: 12,
  },
});
