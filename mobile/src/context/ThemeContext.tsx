import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getThemeColors,
  THEME_OPTIONS,
  type Theme,
  type ThemeColors,
  type ThemeConfig,
} from '../core';

const STORAGE_KEY = 'ztp-theme';

// Storage adapter for AsyncStorage
const asyncStorageAdapter = {
  get: async (key: string): Promise<string | null> => {
    try {
      return await AsyncStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set: async (key: string, value: string): Promise<void> => {
    try {
      await AsyncStorage.setItem(key, value);
    } catch {
      // Silently fail
    }
  },
};

interface ThemeContextValue {
  theme: Theme;
  colors: ThemeColors;
  setTheme: (theme: Theme) => void;
  themeConfig: ThemeConfig;
  themeOptions: ThemeConfig[];
  isLoading: boolean;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>('dark');
  const [isLoading, setIsLoading] = useState(true);

  // Load saved theme on mount
  useEffect(() => {
    const loadTheme = async () => {
      const saved = await asyncStorageAdapter.get(STORAGE_KEY);
      if (saved && THEME_OPTIONS.some(t => t.value === saved)) {
        setThemeState(saved as Theme);
      }
      setIsLoading(false);
    };
    loadTheme();
  }, []);

  const setTheme = useCallback((newTheme: Theme) => {
    setThemeState(newTheme);
    asyncStorageAdapter.set(STORAGE_KEY, newTheme);
  }, []);

  const colors = getThemeColors(theme);
  const themeConfig = THEME_OPTIONS.find(t => t.value === theme) || THEME_OPTIONS[0];

  const value: ThemeContextValue = {
    theme,
    colors,
    setTheme,
    themeConfig,
    themeOptions: THEME_OPTIONS,
    isLoading,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useAppTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useAppTheme must be used within a ThemeProvider');
  }
  return context;
}
