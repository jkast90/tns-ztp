import React, { useState, useCallback } from 'react';
import { Button } from './Button';
import { Icon, TrashIcon } from './Icon';
import { Tooltip } from './Tooltip';
import { getServices, type DetectedVariable, type TemplatizeResponse } from '@core';

interface TemplatizerProps {
  onComplete: (templateContent: string) => void;
  onCancel: () => void;
}

/**
 * Templatizer component - converts a raw config into a template
 * by detecting and replacing variables like IPs, MACs, hostnames, etc.
 */
export function Templatizer({ onComplete, onCancel }: TemplatizerProps) {
  const [rawConfig, setRawConfig] = useState('');
  const [detectedVariables, setDetectedVariables] = useState<DetectedVariable[]>([]);
  const [templateContent, setTemplateContent] = useState('');
  const [step, setStep] = useState<'paste' | 'review' | 'preview'>('paste');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Custom variable from text selection
  const [selectionStart, setSelectionStart] = useState<number | null>(null);
  const [selectionEnd, setSelectionEnd] = useState<number | null>(null);
  const [customVarName, setCustomVarName] = useState('');

  // Analyze config and detect variables
  const handleAnalyze = useCallback(async () => {
    if (!rawConfig.trim()) {
      setError('Please paste a configuration to analyze');
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
      // No variables to apply, just use the raw config
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

  // Handle text selection in the config preview
  const handleTextSelection = () => {
    const selection = window.getSelection();
    if (selection && selection.toString().trim()) {
      const textarea = document.getElementById('config-preview') as HTMLTextAreaElement;
      if (textarea) {
        setSelectionStart(textarea.selectionStart);
        setSelectionEnd(textarea.selectionEnd);
      }
    }
  };

  // Add custom variable from selection
  const handleAddCustomVariable = () => {
    if (selectionStart !== null && selectionEnd !== null && customVarName.trim()) {
      const selectedValue = rawConfig.substring(selectionStart, selectionEnd);

      const newVar: DetectedVariable = {
        name: customVarName.trim(),
        value: selectedValue,
        type: 'custom',
        start_index: selectionStart,
        end_index: selectionEnd,
        description: 'Custom variable',
      };

      setDetectedVariables((prev) => [...prev, newVar]);
      setCustomVarName('');
      setSelectionStart(null);
      setSelectionEnd(null);
    }
  };

  // Get variable type icon
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'ip':
      case 'gateway':
      case 'server':
        return 'lan';
      case 'mac':
        return 'memory';
      case 'hostname':
        return 'dns';
      case 'subnet':
        return 'router';
      default:
        return 'code';
    }
  };

  // Get variable type color
  const getTypeColor = (type: string) => {
    switch (type) {
      case 'ip':
        return 'var(--color-primary)';
      case 'gateway':
        return 'var(--color-success)';
      case 'server':
        return 'var(--color-warning)';
      case 'mac':
        return 'var(--color-info)';
      case 'hostname':
        return 'var(--color-primary)';
      case 'subnet':
        return 'var(--color-text-muted)';
      default:
        return 'var(--color-text-secondary)';
    }
  };

  // Render step 1: Paste config
  const renderPasteStep = () => (
    <>
      <div style={{ marginBottom: '16px' }}>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem', margin: 0 }}>
          Paste a device configuration below. The system will automatically detect variables like
          IP addresses, MAC addresses, hostnames, and subnet masks.
        </p>
      </div>

      <textarea
        value={rawConfig}
        onChange={(e) => setRawConfig(e.target.value)}
        placeholder={`Paste your device configuration here...

Example:
hostname switch-01
!
interface Vlan1
 ip address 192.168.1.100 255.255.255.0
 no shutdown
!
ip default-gateway 192.168.1.1
!
end`}
        style={{
          width: '100%',
          minHeight: '300px',
          fontFamily: 'monospace',
          fontSize: '0.875rem',
          padding: '12px',
          border: '1px solid var(--color-border)',
          borderRadius: '8px',
          background: 'var(--color-bg-secondary)',
          color: 'var(--color-text)',
          resize: 'vertical',
        }}
      />

      <div className="dialog-actions" style={{ marginTop: '16px' }}>
        <Button variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={handleAnalyze} disabled={loading || !rawConfig.trim()}>
          <Icon name={loading ? 'hourglass_empty' : 'search'} size={14} />
          {loading ? 'Analyzing...' : 'Analyze Config'}
        </Button>
      </div>
    </>
  );

  // Render step 2: Review detected variables
  const renderReviewStep = () => (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        {/* Left side: Config preview with selection */}
        <div>
          <h4 style={{ margin: '0 0 8px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Icon name="description" size={18} />
            Configuration
          </h4>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem', margin: '0 0 8px 0' }}>
            Select text and add as custom variable
          </p>
          <textarea
            id="config-preview"
            value={rawConfig}
            readOnly
            onMouseUp={handleTextSelection}
            style={{
              width: '100%',
              height: '250px',
              fontFamily: 'monospace',
              fontSize: '0.8rem',
              padding: '12px',
              border: '1px solid var(--color-border)',
              borderRadius: '8px',
              background: 'var(--color-bg-secondary)',
              color: 'var(--color-text)',
              resize: 'none',
            }}
          />

          {/* Custom variable input */}
          {selectionStart !== null && selectionEnd !== null && (
            <div
              style={{
                marginTop: '8px',
                padding: '8px',
                background: 'var(--color-primary-bg)',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <code style={{ fontSize: '0.75rem', flex: '0 0 auto' }}>
                "{rawConfig.substring(selectionStart, selectionEnd).substring(0, 20)}
                {rawConfig.substring(selectionStart, selectionEnd).length > 20 ? '...' : ''}"
              </code>
              <input
                type="text"
                value={customVarName}
                onChange={(e) => setCustomVarName(e.target.value)}
                placeholder="Variable name..."
                style={{
                  flex: 1,
                  padding: '4px 8px',
                  border: '1px solid var(--color-border)',
                  borderRadius: '4px',
                  fontSize: '0.8rem',
                  background: 'var(--color-bg)',
                  color: 'var(--color-text)',
                }}
              />
              <Button size="sm" onClick={handleAddCustomVariable} disabled={!customVarName.trim()}>
                Add
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  setSelectionStart(null);
                  setSelectionEnd(null);
                  setCustomVarName('');
                }}
              >
                <Icon name="close" size={12} />
              </Button>
            </div>
          )}
        </div>

        {/* Right side: Detected variables */}
        <div>
          <h4 style={{ margin: '0 0 8px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Icon name="code" size={18} />
            Detected Variables ({detectedVariables.length})
          </h4>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem', margin: '0 0 8px 0' }}>
            Edit names or remove unwanted variables
          </p>

          <div
            style={{
              maxHeight: '300px',
              overflowY: 'auto',
              border: '1px solid var(--color-border)',
              borderRadius: '8px',
            }}
          >
            {detectedVariables.length === 0 ? (
              <div
                style={{
                  padding: '24px',
                  textAlign: 'center',
                  color: 'var(--color-text-muted)',
                }}
              >
                <Icon name="info" size={24} />
                <p>No variables detected. Select text to add custom variables.</p>
              </div>
            ) : (
              detectedVariables.map((variable, index) => (
                <div
                  key={`${variable.value}-${index}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 12px',
                    borderBottom:
                      index < detectedVariables.length - 1
                        ? '1px solid var(--color-border)'
                        : 'none',
                    background: 'var(--color-bg)',
                  }}
                >
                  <Icon name={getTypeIcon(variable.type)} size={16} style={{ color: getTypeColor(variable.type) }} />

                  <input
                    type="text"
                    value={variable.name}
                    onChange={(e) => handleUpdateVariableName(index, e.target.value)}
                    style={{
                      flex: '0 0 100px',
                      padding: '4px 8px',
                      border: '1px solid var(--color-border)',
                      borderRadius: '4px',
                      fontSize: '0.8rem',
                      fontFamily: 'monospace',
                      background: 'var(--color-bg-secondary)',
                      color: 'var(--color-text)',
                    }}
                  />

                  <span style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem' }}>→</span>

                  <code
                    style={{
                      flex: 1,
                      fontSize: '0.75rem',
                      padding: '4px 8px',
                      background: 'var(--color-bg-secondary)',
                      borderRadius: '4px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {variable.value}
                  </code>

                  <Tooltip content="Remove variable">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => handleRemoveVariable(index)}
                    >
                      <TrashIcon size={12} />
                    </Button>
                  </Tooltip>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="dialog-actions" style={{ marginTop: '16px' }}>
        <Button variant="secondary" onClick={() => setStep('paste')}>
          <Icon name="arrow_back" size={14} />
          Back
        </Button>
        <div style={{ flex: 1 }} />
        <Button variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={handleGenerateTemplate} disabled={loading}>
          <Icon name={loading ? 'hourglass_empty' : 'auto_fix_high'} size={14} />
          {loading ? 'Generating...' : 'Generate Template'}
        </Button>
      </div>
    </>
  );

  // Render step 3: Preview template
  const renderPreviewStep = () => (
    <>
      <div style={{ marginBottom: '16px' }}>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem', margin: 0 }}>
          Review the generated template below. Variables are shown in{' '}
          <code style={{ color: 'var(--color-primary)' }}>{'{{.VariableName}}'}</code> format.
        </p>
      </div>

      <pre
        style={{
          padding: '16px',
          background: 'var(--color-bg-secondary)',
          border: '1px solid var(--color-border)',
          borderRadius: '8px',
          overflow: 'auto',
          maxHeight: '350px',
          fontSize: '0.8rem',
          fontFamily: 'monospace',
          margin: 0,
        }}
      >
        {templateContent}
      </pre>

      {/* Show which variables were applied */}
      {detectedVariables.length > 0 && (
        <div
          style={{
            marginTop: '16px',
            padding: '16px',
            background: 'var(--color-bg)',
            border: '1px solid var(--color-border)',
            borderRadius: '8px',
          }}
        >
          <h4 style={{ margin: '0 0 8px 0', fontSize: '0.875rem' }}>
            Variables Applied ({detectedVariables.length})
          </h4>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {detectedVariables.map((v, i) => (
              <span
                key={i}
                style={{
                  padding: '4px 8px',
                  background: 'var(--color-primary-bg)',
                  color: 'var(--color-primary)',
                  borderRadius: '4px',
                  fontSize: '0.75rem',
                  fontFamily: 'monospace',
                }}
              >
                {`{{.${v.name}}}`} = {v.value}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="dialog-actions" style={{ marginTop: '16px' }}>
        <Button variant="secondary" onClick={() => setStep('review')}>
          <Icon name="arrow_back" size={14} />
          Back
        </Button>
        <div style={{ flex: 1 }} />
        <Button variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={() => onComplete(templateContent)}>
          <Icon name="check" size={14} />
          Use Template
        </Button>
      </div>
    </>
  );

  return (
    <div>
      {/* Progress indicator */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '16px',
          marginBottom: '24px',
        }}
      >
        {['paste', 'review', 'preview'].map((s, i) => (
          <div
            key={s}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              color: step === s ? 'var(--color-primary)' : 'var(--color-text-muted)',
            }}
          >
            <span
              style={{
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.75rem',
                fontWeight: 'bold',
                background: step === s ? 'var(--color-primary)' : 'var(--color-bg-secondary)',
                color: step === s ? 'white' : 'var(--color-text-muted)',
              }}
            >
              {i + 1}
            </span>
            <span style={{ fontSize: '0.875rem', textTransform: 'capitalize' }}>
              {s === 'paste' ? 'Paste Config' : s === 'review' ? 'Review Variables' : 'Preview'}
            </span>
          </div>
        ))}
      </div>

      {/* Error display */}
      {error && (
        <div
          style={{
            padding: '12px',
            marginBottom: '16px',
            background: 'var(--color-error-bg)',
            border: '1px solid var(--color-error)',
            borderRadius: '8px',
            color: 'var(--color-error)',
            fontSize: '0.875rem',
          }}
        >
          {error}
        </div>
      )}

      {/* Step content */}
      {step === 'paste' && renderPasteStep()}
      {step === 'review' && renderReviewStep()}
      {step === 'preview' && renderPreviewStep()}
    </div>
  );
}
