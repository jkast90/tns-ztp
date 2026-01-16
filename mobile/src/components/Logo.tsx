import { View, Text, StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';

interface LogoIconProps {
  size?: number;
  color?: string;
}

// Lightning bolt icon for ZTP Manager
export function LogoIcon({ size = 24, color = '#4a9eff' }: LogoIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M13 2L4 14h7v8l9-12h-7V2z"
        fill={color}
      />
    </Svg>
  );
}

interface LogoFullProps {
  height?: number;
}

// Full logo with lightning bolt icon and "ZTP Manager" text
export function LogoFull({ height = 24 }: LogoFullProps) {
  const iconSize = height;
  const fontSize = height * 0.7;

  return (
    <View style={styles.container}>
      <LogoIcon size={iconSize} />
      <Text style={[styles.text, { fontSize }]}>ZTP Manager</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  text: {
    color: '#fff',
    fontWeight: 'bold',
  },
});
