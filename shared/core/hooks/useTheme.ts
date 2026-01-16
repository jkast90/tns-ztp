// Theme management hook - platform agnostic logic

import { useState, useCallback, useEffect } from 'react';
import type { Theme } from '../types';

const STORAGE_KEY = 'ztp-theme';
const DEFAULT_THEME: Theme = 'dark';

export interface ThemeConfig {
  value: Theme;
  icon: string;
  label: string;
  description: string;
}

export const THEME_OPTIONS: ThemeConfig[] = [
  { value: 'dark', icon: 'dark_mode', label: 'Dark', description: 'Dark background with blue accents' },
  { value: 'light', icon: 'light_mode', label: 'Light', description: 'Light background with blue accents' },
  { value: 'plain', icon: 'check_box_outline_blank', label: 'Plain', description: 'Minimal styling, no gradients' },
];

export interface ThemeStorage {
  get: (key: string) => string | null;
  set: (key: string, value: string) => void;
}

// Default storage for web - React Native should provide AsyncStorage adapter
const getDefaultStorage = (): ThemeStorage => {
  if (typeof window !== 'undefined' && window.localStorage) {
    return {
      get: (key) => localStorage.getItem(key),
      set: (key, value) => localStorage.setItem(key, value),
    };
  }
  // Fallback for non-web environments (React Native must provide storage)
  return {
    get: () => null,
    set: () => {},
  };
};

export interface UseThemeOptions {
  storage?: ThemeStorage;
  onThemeChange?: (theme: Theme) => void;
}

export interface UseThemeReturn {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  themeConfig: ThemeConfig;
  themeOptions: ThemeConfig[];
}

export function useTheme(options: UseThemeOptions = {}): UseThemeReturn {
  const { storage = getDefaultStorage(), onThemeChange } = options;

  const [theme, setThemeState] = useState<Theme>(() => {
    const saved = storage.get(STORAGE_KEY) as Theme | null;
    return saved && THEME_OPTIONS.some(t => t.value === saved) ? saved : DEFAULT_THEME;
  });

  const setTheme = useCallback((newTheme: Theme) => {
    setThemeState(newTheme);
    storage.set(STORAGE_KEY, newTheme);
    onThemeChange?.(newTheme);
  }, [storage, onThemeChange]);

  const themeConfig = THEME_OPTIONS.find(t => t.value === theme) || THEME_OPTIONS[0];

  return {
    theme,
    setTheme,
    themeConfig,
    themeOptions: THEME_OPTIONS,
  };
}

// Web-specific: apply theme to document
// NOTE: Do not import this in React Native - use useTheme with a custom onThemeChange instead
export function useWebTheme(options: Omit<UseThemeOptions, 'onThemeChange'> = {}) {
  const result = useTheme({
    ...options,
    onThemeChange: (theme) => {
      document.documentElement.setAttribute('data-theme', theme);
    },
  });

  // Apply on mount
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', result.theme);
  }, [result.theme]);

  return result;
}
