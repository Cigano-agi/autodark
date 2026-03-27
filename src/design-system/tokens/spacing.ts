/**
 * Uber Base Design System - Spacing Tokens
 * 
 * Base unit: 4px
 * Standard rhythm: 8px
 */

export const spacing = {
    0: '0px',
    1: '4px',
    2: '8px',
    3: '12px',
    4: '16px',
    5: '20px',
    6: '24px',
    8: '32px',
    10: '40px',
    12: '48px',
    16: '64px',
    20: '80px',
    24: '96px',
} as const;

// Numeric values for JS calculations
export const spacingValues = {
    0: 0,
    1: 4,
    2: 8,
    3: 12,
    4: 16,
    5: 20,
    6: 24,
    8: 32,
    10: 40,
    12: 48,
    16: 64,
    20: 80,
    24: 96,
} as const;

export type SpacingToken = keyof typeof spacing;

// Helper function to get spacing value
export const getSpacing = (token: SpacingToken): string => spacing[token];
export const getSpacingValue = (token: SpacingToken): number => spacingValues[token];
