// Centralized theme constants for the mobile app

export const COLORS = {
  // Backgrounds
  background: {
    primary: '#0f0f1a',
    secondary: '#1a1a2e',
    tertiary: '#2a2a4e',
  },

  // Borders
  border: {
    primary: '#2a2a4e',
    focus: '#4a9eff',
    error: '#ff5252',
  },

  // Brand / Accent
  primary: '#4a9eff',

  // Text
  text: {
    primary: '#fff',
    secondary: '#ccc',
    muted: '#888',
    disabled: '#666',
  },

  // Status
  status: {
    success: '#4ade80',
    error: '#ff5252',
    warning: '#ffc107',
    info: '#4a9eff',
    pending: '#888',
  },

  // Transparent overlays
  overlay: {
    light: 'rgba(255, 255, 255, 0.2)',
    dark: 'rgba(0, 0, 0, 0.5)',
    danger: 'rgba(255, 82, 82, 0.2)',
  },
} as const;

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const BORDER_RADIUS = {
  sm: 6,
  md: 8,
  lg: 12,
} as const;

export const FONT_SIZE = {
  xs: 12,
  sm: 13,
  md: 14,
  lg: 16,
  xl: 18,
  xxl: 20,
} as const;
