import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';

// Layout width options
export type PageWidth = 'narrow' | 'default' | 'wide' | 'full';
export type DialogWidth = 'compact' | 'default' | 'wide' | 'extra-wide';

export interface LayoutSettings {
  pageWidth: PageWidth;
  dialogWidth: DialogWidth;
}

export interface LayoutContextValue extends LayoutSettings {
  setPageWidth: (width: PageWidth) => void;
  setDialogWidth: (width: DialogWidth) => void;
  resetToDefaults: () => void;
}

const STORAGE_KEY = 'ztp_layout_settings';

const DEFAULT_SETTINGS: LayoutSettings = {
  pageWidth: 'default',
  dialogWidth: 'default',
};

// CSS variable values for each setting
export const PAGE_WIDTH_VALUES: Record<PageWidth, string> = {
  narrow: '1000px',
  default: '1400px',
  wide: '1800px',
  full: '100%',
};

export const DIALOG_WIDTH_VALUES: Record<DialogWidth, { default: string; wide: string }> = {
  compact: { default: '400px', wide: '550px' },
  default: { default: '500px', wide: '700px' },
  wide: { default: '600px', wide: '850px' },
  'extra-wide': { default: '700px', wide: '1000px' },
};

// Labels for UI
export const PAGE_WIDTH_OPTIONS: { value: PageWidth; label: string; description: string }[] = [
  { value: 'narrow', label: 'Narrow', description: '1000px max width' },
  { value: 'default', label: 'Default', description: '1400px max width' },
  { value: 'wide', label: 'Wide', description: '1800px max width' },
  { value: 'full', label: 'Full', description: 'Full viewport width' },
];

export const DIALOG_WIDTH_OPTIONS: { value: DialogWidth; label: string; description: string }[] = [
  { value: 'compact', label: 'Compact', description: 'Smaller dialogs' },
  { value: 'default', label: 'Default', description: 'Standard size' },
  { value: 'wide', label: 'Wide', description: 'Larger dialogs' },
  { value: 'extra-wide', label: 'Extra Wide', description: 'Maximum size' },
];

const LayoutContext = createContext<LayoutContextValue | null>(null);

// Apply CSS variables to document root
function applyCSSVariables(settings: LayoutSettings) {
  const root = document.documentElement;
  root.style.setProperty('--layout-page-width', PAGE_WIDTH_VALUES[settings.pageWidth]);
  root.style.setProperty('--layout-dialog-width', DIALOG_WIDTH_VALUES[settings.dialogWidth].default);
  root.style.setProperty('--layout-dialog-wide-width', DIALOG_WIDTH_VALUES[settings.dialogWidth].wide);
}

// Load settings from localStorage
function loadSettings(): LayoutSettings {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return {
        pageWidth: parsed.pageWidth || DEFAULT_SETTINGS.pageWidth,
        dialogWidth: parsed.dialogWidth || DEFAULT_SETTINGS.dialogWidth,
      };
    }
  } catch (e) {
    console.warn('Failed to load layout settings:', e);
  }
  return DEFAULT_SETTINGS;
}

// Save settings to localStorage
function saveSettings(settings: LayoutSettings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch (e) {
    console.warn('Failed to save layout settings:', e);
  }
}

interface LayoutProviderProps {
  children: ReactNode;
}

export function LayoutProvider({ children }: LayoutProviderProps) {
  const [settings, setSettings] = useState<LayoutSettings>(() => {
    const loaded = loadSettings();
    // Apply immediately on load
    applyCSSVariables(loaded);
    return loaded;
  });

  // Apply CSS variables whenever settings change
  useEffect(() => {
    applyCSSVariables(settings);
    saveSettings(settings);
  }, [settings]);

  const setPageWidth = useCallback((width: PageWidth) => {
    setSettings((prev) => ({ ...prev, pageWidth: width }));
  }, []);

  const setDialogWidth = useCallback((width: DialogWidth) => {
    setSettings((prev) => ({ ...prev, dialogWidth: width }));
  }, []);

  const resetToDefaults = useCallback(() => {
    setSettings(DEFAULT_SETTINGS);
  }, []);

  const value: LayoutContextValue = {
    ...settings,
    setPageWidth,
    setDialogWidth,
    resetToDefaults,
  };

  return (
    <LayoutContext.Provider value={value}>
      {children}
    </LayoutContext.Provider>
  );
}

export function useLayout(): LayoutContextValue {
  const context = useContext(LayoutContext);
  if (!context) {
    throw new Error('useLayout must be used within a LayoutProvider');
  }
  return context;
}
