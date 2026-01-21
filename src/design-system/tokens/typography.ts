/**
 * Uber Base Design System - Typography Tokens
 * 
 * Font: Uber Move (Display, Text, Mono)
 * Scale: Modular (Base 14px, Ratio 1.125)
 */

export const fontFamily = {
    display: '"Uber Move", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    text: '"Uber Move Text", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    mono: '"Uber Move Mono", ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
} as const;

export const fontSize = {
    display1: '96px',
    display2: '60px',
    h1: '48px',
    h2: '34px',
    h3: '24px',
    h4: '20px',
    h5: '18px',
    h6: '16px',
    bodyLarge: '16px',
    body: '14px',
    bodySmall: '12px',
    caption: '11px',
    label: '12px',
} as const;

export const lineHeight = {
    display1: '112px',
    display2: '72px',
    h1: '56px',
    h2: '42px',
    h3: '32px',
    h4: '28px',
    h5: '24px',
    h6: '22px',
    bodyLarge: '24px',
    body: '20px',
    bodySmall: '16px',
    caption: '14px',
    label: '16px',
} as const;

export const fontWeight = {
    regular: 400,
    medium: 500,
    bold: 700,
} as const;

export const letterSpacing = {
    display1: '-1.5px',
    display2: '-0.5px',
    h1: '0px',
    h2: '0.25px',
    h3: '0px',
    h4: '0.15px',
    h5: '0px',
    h6: '0.15px',
    bodyLarge: '0.5px',
    body: '0.25px',
    bodySmall: '0.4px',
    caption: '0.4px',
    label: '0.5px',
} as const;

// Combined typography styles for each variant
export const typography = {
    display1: {
        fontFamily: fontFamily.display,
        fontSize: fontSize.display1,
        lineHeight: lineHeight.display1,
        fontWeight: fontWeight.bold,
        letterSpacing: letterSpacing.display1,
    },
    display2: {
        fontFamily: fontFamily.display,
        fontSize: fontSize.display2,
        lineHeight: lineHeight.display2,
        fontWeight: fontWeight.bold,
        letterSpacing: letterSpacing.display2,
    },
    h1: {
        fontFamily: fontFamily.display,
        fontSize: fontSize.h1,
        lineHeight: lineHeight.h1,
        fontWeight: fontWeight.bold,
        letterSpacing: letterSpacing.h1,
    },
    h2: {
        fontFamily: fontFamily.display,
        fontSize: fontSize.h2,
        lineHeight: lineHeight.h2,
        fontWeight: fontWeight.bold,
        letterSpacing: letterSpacing.h2,
    },
    h3: {
        fontFamily: fontFamily.display,
        fontSize: fontSize.h3,
        lineHeight: lineHeight.h3,
        fontWeight: fontWeight.bold,
        letterSpacing: letterSpacing.h3,
    },
    h4: {
        fontFamily: fontFamily.display,
        fontSize: fontSize.h4,
        lineHeight: lineHeight.h4,
        fontWeight: fontWeight.bold,
        letterSpacing: letterSpacing.h4,
    },
    h5: {
        fontFamily: fontFamily.display,
        fontSize: fontSize.h5,
        lineHeight: lineHeight.h5,
        fontWeight: fontWeight.bold,
        letterSpacing: letterSpacing.h5,
    },
    h6: {
        fontFamily: fontFamily.display,
        fontSize: fontSize.h6,
        lineHeight: lineHeight.h6,
        fontWeight: fontWeight.bold,
        letterSpacing: letterSpacing.h6,
    },
    bodyLarge: {
        fontFamily: fontFamily.text,
        fontSize: fontSize.bodyLarge,
        lineHeight: lineHeight.bodyLarge,
        fontWeight: fontWeight.regular,
        letterSpacing: letterSpacing.bodyLarge,
    },
    body: {
        fontFamily: fontFamily.text,
        fontSize: fontSize.body,
        lineHeight: lineHeight.body,
        fontWeight: fontWeight.regular,
        letterSpacing: letterSpacing.body,
    },
    bodySmall: {
        fontFamily: fontFamily.text,
        fontSize: fontSize.bodySmall,
        lineHeight: lineHeight.bodySmall,
        fontWeight: fontWeight.regular,
        letterSpacing: letterSpacing.bodySmall,
    },
    caption: {
        fontFamily: fontFamily.text,
        fontSize: fontSize.caption,
        lineHeight: lineHeight.caption,
        fontWeight: fontWeight.regular,
        letterSpacing: letterSpacing.caption,
    },
    label: {
        fontFamily: fontFamily.text,
        fontSize: fontSize.label,
        lineHeight: lineHeight.label,
        fontWeight: fontWeight.medium,
        letterSpacing: letterSpacing.label,
        textTransform: 'uppercase' as const,
    },
} as const;

export type TypographyVariant = keyof typeof typography;
