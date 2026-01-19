import { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
  Pressable,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import {
  getServices,
  MONOSPACE_FONT,
  getVariableTypeIcon,
  getVariableTypeColor,
} from '../core';
import type { DetectedVariable } from '../core';
import { Card, Button, LoadingState, StepIndicator, CodePreview } from '../components';
import { useAppTheme } from '../context';
import { showError } from '../utils/alerts';

type Step = 'paste' | 'review' | 'preview';

interface TemplatizerScreenParams {
  onComplete?: (templateContent: string) => void;
}

export function TemplatizerScreen() {
  const { colors } = useAppTheme();
  const navigation = useNavigation();
  const route = useRoute();
  const params = (route.params as TemplatizerScreenParams) || {};

  const [rawConfig, setRawConfig] = useState('');
  const [detectedVariables, setDetectedVariables] = useState<DetectedVariable[]>([]);
  const [templateContent, setTemplateContent] = useState('');
  const [step, setStep] = useState<Step>('paste');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Custom variable input
  const [customVarName, setCustomVarName] = useState('');
  const [customVarValue, setCustomVarValue] = useState('');
  const [showCustomForm, setShowCustomForm] = useState(false);

  // Analyze config and detect variables
  const handleAnalyze = useCallback(async () => {
    if (!rawConfig.trim()) {
      showError('Please paste a configuration to analyze');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const services = getServices();
      const response = await services.templates.templatize(rawConfig);

      if (response.detected_variables) {
        setDetectedVariables(response.detected_variables);
        setTemplateContent(rawConfig);
        setStep('review');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to analyze configuration');
    } finally {
      setLoading(false);
    }
  }, [rawConfig]);

  // Apply selected variables and generate template
  const handleGenerateTemplate = useCallback(async () => {
    if (detectedVariables.length === 0) {
      setTemplateContent(rawConfig);
      setStep('preview');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const services = getServices();
      const response = await services.templates.templatize(rawConfig, detectedVariables);

      if (response.template_content) {
        setTemplateContent(response.template_content);
        setStep('preview');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate template');
    } finally {
      setLoading(false);
    }
  }, [rawConfig, detectedVariables]);

  // Update variable name
  const handleUpdateVariableName = (index: number, newName: string) => {
    setDetectedVariables((prev) =>
      prev.map((v, i) => (i === index ? { ...v, name: newName } : v))
    );
  };

  // Remove a variable from detection
  const handleRemoveVariable = (index: number) => {
    setDetectedVariables((prev) => prev.filter((_, i) => i !== index));
  };

  // Add custom variable
  const handleAddCustomVariable = () => {
    if (!customVarName.trim() || !customVarValue.trim()) {
      showError('Both variable name and value are required');
      return;
    }

    // Find the value in the config to get indices
    const startIndex = rawConfig.indexOf(customVarValue);
    if (startIndex === -1) {
      showError('Value not found in configuration');
      return;
    }

    const newVar: DetectedVariable = {
      name: customVarName.trim(),
      value: customVarValue,
      type: 'custom',
      start_index: startIndex,
      end_index: startIndex + customVarValue.length,
      description: 'Custom variable',
    };

    setDetectedVariables((prev) => [...prev, newVar]);
    setCustomVarName('');
    setCustomVarValue('');
    setShowCustomForm(false);
  };

  // Complete and return template
  const handleComplete = () => {
    if (params.onComplete) {
      params.onComplete(templateContent);
    }
    navigation.goBack();
  };

  // Step definitions for StepIndicator
  const steps = useMemo(() => [
    { key: 'paste', label: 'Paste' },
    { key: 'review', label: 'Review' },
    { key: 'preview', label: 'Preview' },
  ], []);

  if (loading) {
    return <LoadingState message={step === 'paste' ? 'Analyzing configuration...' : 'Generating template...'} />;
  }

  // Step 1: Paste config
  const renderPasteStep = () => (
    <KeyboardAvoidingView
      style={styles.stepContainer}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <Text style={[styles.stepDescription, { color: colors.textSecondary }]}>
        Paste a device configuration below. The system will automatically detect variables like
        IP addresses, MAC addresses, hostnames, and subnet masks.
      </Text>

      <TextInput
        style={[styles.configInput, {
          backgroundColor: colors.bgSecondary,
          borderColor: colors.border,
          color: colors.textPrimary
        }]}
        value={rawConfig}
        onChangeText={setRawConfig}
        placeholder={`Paste your device configuration here...\n\nExample:\nhostname switch-01\n!\ninterface Vlan1\n ip address 192.168.1.100 255.255.255.0\n no shutdown\n!\nip default-gateway 192.168.1.1\n!\nend`}
        placeholderTextColor={colors.textMuted}
        multiline
        textAlignVertical="top"
      />

      <View style={styles.stepActions}>
        <Button title="Cancel" variant="secondary" onPress={() => navigation.goBack()} />
        <Button
          title="Analyze Config"
          icon="search"
          onPress={handleAnalyze}
          disabled={!rawConfig.trim()}
        />
      </View>
    </KeyboardAvoidingView>
  );

  // Step 2: Review variables
  const renderReviewStep = () => (
    <ScrollView style={styles.stepContainer}>
      {/* Config preview */}
      <Card style={styles.sectionCard}>
        <CodePreview
          content={rawConfig}
          title="Configuration"
          subtitle="Original config (read-only)"
          maxHeight={150}
        />
      </Card>

      {/* Detected variables */}
      <Card style={styles.sectionCard}>
        <View style={styles.variablesHeader}>
          <View>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
              Detected Variables ({detectedVariables.length})
            </Text>
            <Text style={[styles.sectionSubtitle, { color: colors.textMuted }]}>
              Edit names or remove unwanted
            </Text>
          </View>
          <Pressable
            style={[styles.addButton, { backgroundColor: `${colors.accentBlue}15` }]}
            onPress={() => setShowCustomForm(!showCustomForm)}
          >
            <MaterialIcons name={showCustomForm ? 'close' : 'add'} size={18} color={colors.accentBlue} />
          </Pressable>
        </View>

        {/* Custom variable form */}
        {showCustomForm && (
          <View style={[styles.customForm, { backgroundColor: colors.bgSecondary, borderColor: colors.border }]}>
            <TextInput
              style={[styles.customInput, { backgroundColor: colors.bgPrimary, borderColor: colors.border, color: colors.textPrimary }]}
              value={customVarValue}
              onChangeText={setCustomVarValue}
              placeholder="Value to replace (must match config)"
              placeholderTextColor={colors.textMuted}
            />
            <View style={styles.customInputRow}>
              <TextInput
                style={[styles.customInput, { flex: 1, backgroundColor: colors.bgPrimary, borderColor: colors.border, color: colors.textPrimary }]}
                value={customVarName}
                onChangeText={setCustomVarName}
                placeholder="Variable name"
                placeholderTextColor={colors.textMuted}
              />
              <Button title="Add" size="sm" onPress={handleAddCustomVariable} />
            </View>
          </View>
        )}

        {detectedVariables.length === 0 ? (
          <View style={styles.emptyVariables}>
            <MaterialIcons name="info" size={24} color={colors.textMuted} />
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>
              No variables detected. Add custom variables above.
            </Text>
          </View>
        ) : (
          <View style={styles.variablesList}>
            {detectedVariables.map((variable, index) => (
              <View
                key={`${variable.value}-${index}`}
                style={[styles.variableItem, { borderBottomColor: colors.border }]}
              >
                <MaterialIcons
                  name={getVariableTypeIcon(variable.type)}
                  size={16}
                  color={getVariableTypeColor(variable.type, colors)}
                />
                <TextInput
                  style={[styles.variableNameInput, {
                    backgroundColor: colors.bgSecondary,
                    borderColor: colors.border,
                    color: colors.textPrimary
                  }]}
                  value={variable.name}
                  onChangeText={(text) => handleUpdateVariableName(index, text)}
                />
                <Text style={[styles.arrow, { color: colors.textMuted }]}>→</Text>
                <Text
                  style={[styles.variableValue, { backgroundColor: colors.bgSecondary, color: colors.textSecondary }]}
                  numberOfLines={1}
                >
                  {variable.value}
                </Text>
                <Pressable onPress={() => handleRemoveVariable(index)}>
                  <MaterialIcons name="delete" size={18} color={colors.error} />
                </Pressable>
              </View>
            ))}
          </View>
        )}
      </Card>

      <View style={styles.stepActions}>
        <Button title="Back" variant="secondary" icon="arrow-back" onPress={() => setStep('paste')} />
        <Button title="Generate Template" icon="auto-fix-high" onPress={handleGenerateTemplate} />
      </View>
    </ScrollView>
  );

  // Step 3: Preview template
  const renderPreviewStep = () => (
    <ScrollView style={styles.stepContainer}>
      <Text style={[styles.stepDescription, { color: colors.textSecondary }]}>
        Review the generated template below. Variables are shown in{' '}
        <Text style={{ color: colors.accentBlue, fontFamily: MONOSPACE_FONT }}>
          {'{{.VariableName}}'}
        </Text>{' '}
        format.
      </Text>

      <Card style={styles.sectionCard}>
        <CodePreview content={templateContent} maxHeight={250} />
      </Card>

      {/* Variables applied */}
      {detectedVariables.length > 0 && (
        <Card style={styles.sectionCard}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
            Variables Applied ({detectedVariables.length})
          </Text>
          <View style={styles.appliedVariables}>
            {detectedVariables.map((v, i) => (
              <View
                key={i}
                style={[styles.appliedTag, { backgroundColor: `${colors.accentBlue}15` }]}
              >
                <Text style={[styles.appliedTagText, { color: colors.accentBlue }]}>
                  {`{{.${v.name}}}`} = {v.value.substring(0, 15)}{v.value.length > 15 ? '...' : ''}
                </Text>
              </View>
            ))}
          </View>
        </Card>
      )}

      <View style={styles.stepActions}>
        <Button title="Back" variant="secondary" icon="arrow-back" onPress={() => setStep('review')} />
        <Button title="Use Template" icon="check" onPress={handleComplete} />
      </View>
    </ScrollView>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.bgPrimary }]}>
      {/* Progress indicator */}
      <StepIndicator steps={steps} currentStep={step} />

      {/* Error display */}
      {error && (
        <View style={[styles.errorContainer, { backgroundColor: `${colors.error}15`, borderColor: colors.error }]}>
          <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
        </View>
      )}

      {/* Step content */}
      {step === 'paste' && renderPasteStep()}
      {step === 'review' && renderReviewStep()}
      {step === 'preview' && renderPreviewStep()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  errorContainer: {
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  errorText: {
    fontSize: 13,
  },
  stepContainer: {
    flex: 1,
    padding: 16,
  },
  stepDescription: {
    fontSize: 13,
    marginBottom: 16,
    lineHeight: 20,
  },
  configInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 13,
    fontFamily: MONOSPACE_FONT,
    minHeight: 200,
  },
  stepActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 16,
    paddingBottom: 16,
  },
  sectionCard: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 12,
    marginBottom: 12,
  },
  variablesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  addButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  customForm: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 12,
    gap: 8,
  },
  customInput: {
    borderWidth: 1,
    borderRadius: 6,
    padding: 8,
    fontSize: 13,
  },
  customInputRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  emptyVariables: {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 8,
  },
  emptyText: {
    fontSize: 13,
    textAlign: 'center',
  },
  variablesList: {},
  variableItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    gap: 8,
  },
  variableNameInput: {
    width: 80,
    borderWidth: 1,
    borderRadius: 4,
    padding: 6,
    fontSize: 12,
    fontFamily: MONOSPACE_FONT,
  },
  arrow: {
    fontSize: 12,
  },
  variableValue: {
    flex: 1,
    fontSize: 11,
    padding: 6,
    borderRadius: 4,
    fontFamily: MONOSPACE_FONT,
  },
  appliedVariables: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  appliedTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  appliedTagText: {
    fontSize: 11,
    fontFamily: MONOSPACE_FONT,
  },
});
