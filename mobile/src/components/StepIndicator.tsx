import { View, Text, StyleSheet } from 'react-native';
import { useAppTheme } from '../context';

interface Step {
  /** Unique identifier for the step */
  key: string;
  /** Display label for the step */
  label: string;
}

interface Props {
  /** Array of step definitions */
  steps: Step[];
  /** Key of the currently active step */
  currentStep: string;
}

export function StepIndicator({ steps, currentStep }: Props) {
  const { colors } = useAppTheme();

  return (
    <View style={styles.container}>
      {steps.map((step, index) => {
        const isActive = step.key === currentStep;
        return (
          <View key={step.key} style={styles.step}>
            <View
              style={[
                styles.dot,
                {
                  backgroundColor: isActive ? colors.accentBlue : colors.bgSecondary,
                  borderColor: isActive ? colors.accentBlue : colors.border,
                },
              ]}
            >
              <Text style={[styles.number, { color: isActive ? '#fff' : colors.textMuted }]}>
                {index + 1}
              </Text>
            </View>
            <Text style={[styles.label, { color: isActive ? colors.accentBlue : colors.textMuted }]}>
              {step.label}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 24,
  },
  step: {
    alignItems: 'center',
    gap: 4,
  },
  dot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  number: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  label: {
    fontSize: 12,
  },
});
