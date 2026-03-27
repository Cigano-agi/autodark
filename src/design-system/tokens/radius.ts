/**
 * Uber Base Design System - Border Radius Tokens
 */

export const radius = {
    none: '0px',
    sm: '2px',
    base: '4px',
    md: '6px',
    lg: '8px',
    xl: '12px',
    '2xl': '16px',
    full: '9999px',
} as const;

// Numeric values
export const radiusValues = {
    none: 0,
    sm: 2,
    base: 4,
    md: 6,
    lg: 8,
    xl: 12,
    '2xl': 16,
    full: 9999,
} as const;

export type RadiusToken = keyof typeof radius;
