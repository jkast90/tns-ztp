// Typography constants - platform agnostic definitions

/**
 * Monospace font family for web - CSS standard
 */
export const MONOSPACE_FONT = 'monospace';

/**
 * Font sizes used throughout the app
 */
export const FONT_SIZES = {
  xs: 11,
  sm: 12,
  md: 13,
  base: 14,
  lg: 16,
  xl: 18,
  '2xl': 24,
} as const;

export type FontSize = keyof typeof FONT_SIZES;
