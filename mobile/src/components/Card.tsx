import { View, Text, StyleSheet, ViewProps } from 'react-native';

interface Props extends ViewProps {
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
}

export function Card({ title, subtitle, children, style, ...props }: Props) {
  return (
    <View style={[styles.card, style]} {...props}>
      {title && (
        <View style={styles.header}>
          <Text style={styles.title}>{title}</Text>
          {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
        </View>
      )}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#2a2a4e',
  },
  header: {
    marginBottom: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  subtitle: {
    fontSize: 12,
    color: '#888',
    marginTop: 4,
  },
});
