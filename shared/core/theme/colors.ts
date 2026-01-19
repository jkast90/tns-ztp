// Theme color definitions - platform agnostic
// These can be used by both React Web (as CSS custom properties) and React Native (directly)

import type { Theme } from '../types';

export interface ThemeColors {
  // Backgrounds
  bgPrimary: string;
  bgSecondary: string;
  bgCard: string;
  bgHover: string;

  // Accent Colors
  accentBlue: string;
  accentCyan: string;
  accentTeal: string;
  accentPurple: string;

  // Text Colors
  textPrimary: string;
  textSecondary: string;
  textMuted: string;

  // Border Colors
  border: string;
  borderHover: string;

  // Status Colors
  success: string;
  successBg: string;
  error: string;
  errorBg: string;
  warning: string;
  warningBg: string;

  // Overlay colors
  overlayLight: string;
  overlayDark: string;
}

export const darkTheme: ThemeColors = {
  // Backgrounds
  bgPrimary: '#0a0a0f',
  bgSecondary: '#12121a',
  bgCard: '#1a1a24',
  bgHover: '#22222e',

  // Accent Colors
  accentBlue: '#3b82f6',
  accentCyan: '#22d3ee',
  accentTeal: '#14b8a6',
  accentPurple: '#a855f7',

  // Text Colors
  textPrimary: '#f8fafc',
  textSecondary: '#94a3b8',
  textMuted: '#64748b',

  // Border Colors
  border: '#2d2d3a',
  borderHover: '#3d3d4a',

  // Status Colors
  success: '#22c55e',
  successBg: 'rgba(34, 197, 94, 0.15)',
  error: '#ef4444',
  errorBg: 'rgba(239, 68, 68, 0.15)',
  warning: '#f59e0b',
  warningBg: 'rgba(245, 158, 11, 0.15)',

  // Overlay colors
  overlayLight: 'rgba(255, 255, 255, 0.2)',
  overlayDark: 'rgba(0, 0, 0, 0.5)',
};

export const lightTheme: ThemeColors = {
  // Backgrounds
  bgPrimary: '#f8fafc',
  bgSecondary: '#ffffff',
  bgCard: '#ffffff',
  bgHover: '#f1f5f9',

  // Accent Colors
  accentBlue: '#2563eb',
  accentCyan: '#0891b2',
  accentTeal: '#0d9488',
  accentPurple: '#9333ea',

  // Text Colors
  textPrimary: '#0f172a',
  textSecondary: '#475569',
  textMuted: '#94a3b8',

  // Border Colors
  border: '#e2e8f0',
  borderHover: '#cbd5e1',

  // Status Colors
  success: '#16a34a',
  successBg: 'rgba(22, 163, 74, 0.1)',
  error: '#dc2626',
  errorBg: 'rgba(220, 38, 38, 0.1)',
  warning: '#d97706',
  warningBg: 'rgba(217, 119, 6, 0.1)',

  // Overlay colors
  overlayLight: 'rgba(255, 255, 255, 0.5)',
  overlayDark: 'rgba(0, 0, 0, 0.3)',
};

export const plainTheme: ThemeColors = {
  // Backgrounds
  bgPrimary: '#ffffff',
  bgSecondary: '#fafafa',
  bgCard: '#ffffff',
  bgHover: '#f5f5f5',

  // Accent Colors (all use same blue for minimal styling)
  accentBlue: '#2563eb',
  accentCyan: '#2563eb',
  accentTeal: '#2563eb',
  accentPurple: '#2563eb',

  // Text Colors
  textPrimary: '#171717',
  textSecondary: '#525252',
  textMuted: '#a3a3a3',

  // Border Colors
  border: '#e5e5e5',
  borderHover: '#d4d4d4',

  // Status Colors
  success: '#16a34a',
  successBg: '#f0fdf4',
  error: '#dc2626',
  errorBg: '#fef2f2',
  warning: '#d97706',
  warningBg: '#fffbeb',

  // Overlay colors
  overlayLight: 'rgba(255, 255, 255, 0.7)',
  overlayDark: 'rgba(0, 0, 0, 0.2)',
};

export const themes: Record<Theme, ThemeColors> = {
  dark: darkTheme,
  light: lightTheme,
  plain: plainTheme,
};

export function getThemeColors(theme: Theme): ThemeColors {
  return themes[theme];
}
