/**
 * Uber Base Design System - Color Tokens
 * 
 * Primary colors: Black and White
 * Gray scale: 10 shades from light to dark
 * Semantic: Positive, Negative, Warning, Accent
 */

export const colors = {
  // Primary
  black: '#000000',
  white: '#FFFFFF',

  // Gray Scale (Base Greys)
  gray50: '#F6F6F6',
  gray100: '#EEEEEE',
  gray200: '#E2E2E2',
  gray300: '#CBCBCB',
  gray400: '#AFAFAF',
  gray500: '#757575',
  gray600: '#545454',
  gray700: '#333333',
  gray800: '#1F1F1F',
  gray900: '#141414',

  // Semantic - Positive (Success)
  positive: '#05944F',
  positiveDark: '#03703C',
  positiveLight: '#E6F5ED',

  // Semantic - Negative (Error)
  negative: '#E11900',
  negativeDark: '#AB1300',
  negativeLight: '#FFEFED',

  // Semantic - Warning
  warning: '#FFC043',
  warningDark: '#997328',
  warningLight: '#FFF2D9',

  // Semantic - Accent (Interactive)
  accent: '#276EF1',
  accentDark: '#1E54B7',
  accentLight: '#EEF3FE',
} as const;

// HSL versions for CSS variables (dark mode compatible)
export const colorsHSL = {
  // Primary
  black: '0 0% 0%',
  white: '0 0% 100%',

  // Gray Scale
  gray50: '0 0% 96%',
  gray100: '0 0% 93%',
  gray200: '0 0% 89%',
  gray300: '0 0% 80%',
  gray400: '0 0% 69%',
  gray500: '0 0% 46%',
  gray600: '0 0% 33%',
  gray700: '0 0% 20%',
  gray800: '0 0% 12%',
  gray900: '0 0% 8%',

  // Semantic - Positive
  positive: '153 95% 30%',
  positiveDark: '153 96% 23%',
  positiveLight: '147 52% 93%',

  // Semantic - Negative
  negative: '8 100% 45%',
  negativeDark: '8 100% 34%',
  negativeLight: '8 100% 97%',

  // Semantic - Warning
  warning: '38 100% 63%',
  warningDark: '38 53% 38%',
  warningLight: '38 100% 93%',

  // Semantic - Accent
  accent: '220 87% 55%',
  accentDark: '220 72% 42%',
  accentLight: '224 89% 97%',
} as const;

export type ColorToken = keyof typeof colors;
