import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { MONOSPACE_FONT } from '../core';
import { useAppTheme } from '../context';

interface Props {
  /** The code/config content to display */
  content: string;
  /** Max height of the scrollable area */
  maxHeight?: number;
  /** Title shown above the code block */
  title?: string;
  /** Subtitle/description shown below title */
  subtitle?: string;
  /** Font size for the code text */
  fontSize?: number;
}

export function CodePreview({
  content,
  maxHeight = 200,
  title,
  subtitle,
  fontSize = 12,
}: Props) {
  const { colors } = useAppTheme();

  return (
    <View>
      {title && (
        <Text style={[styles.title, { color: colors.textPrimary }]}>{title}</Text>
      )}
      {subtitle && (
        <Text style={[styles.subtitle, { color: colors.textMuted }]}>{subtitle}</Text>
      )}
      <ScrollView
        style={[
          styles.container,
          {
            maxHeight,
            backgroundColor: colors.bgSecondary,
            borderColor: colors.border,
          },
        ]}
        nestedScrollEnabled
      >
        <Text
          style={[
            styles.code,
            {
              color: colors.textPrimary,
              fontSize,
              fontFamily: MONOSPACE_FONT,
            },
          ]}
        >
          {content}
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 15,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 12,
    marginBottom: 12,
  },
  container: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
  },
  code: {
    lineHeight: 18,
  },
});
