import { View, Text, ViewProps } from 'react-native';
import { useAppTheme } from '../context';

interface Props extends ViewProps {
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
}

export function Card({ title, subtitle, children, style, ...props }: Props) {
  const { colors } = useAppTheme();

  return (
    <View
      style={[
        {
          backgroundColor: colors.bgCard,
          borderRadius: 12,
          padding: 16,
          marginBottom: 16,
          borderWidth: 1,
          borderColor: colors.border,
        },
        style,
      ]}
      {...props}
    >
      {title && (
        <View style={{ marginBottom: 16 }}>
          <Text style={{ fontSize: 16, fontWeight: 'bold', color: colors.textPrimary }}>
            {title}
          </Text>
          {subtitle && (
            <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 4 }}>
              {subtitle}
            </Text>
          )}
        </View>
      )}
      {children}
    </View>
  );
}
