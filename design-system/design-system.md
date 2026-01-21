# Uber Base Design System

> The Base design system defines the foundations of user interfaces across Uber's ecosystem of products & services.

---

## Table of Contents

1. [Colors](#colors)
2. [Typography](#typography)
3. [Spacing](#spacing)
4. [Shadows & Elevation](#shadows--elevation)
5. [Border Radius](#border-radius)
6. [Breakpoints](#breakpoints)
7. [Components](#components)

---

## Colors

### Primary Colors

| Token | Value | Usage |
|-------|-------|-------|
| `black` | `#000000` | Primary brand, CTAs, text on light backgrounds |
| `white` | `#FFFFFF` | Backgrounds, text on dark backgrounds |

### Gray Scale (Neutral Colors)

| Token | Value | Usage |
|-------|-------|-------|
| `gray50` | `#F6F6F6` | Lightest backgrounds |
| `gray100` | `#EEEEEE` | Light backgrounds, dividers |
| `gray200` | `#E2E2E2` | Borders, disabled states |
| `gray300` | `#CBCBCB` | Borders, placeholder text |
| `gray400` | `#AFAFAF` | Muted text, icons |
| `gray500` | `#757575` | Secondary text |
| `gray600` | `#545454` | Body text |
| `gray700` | `#333333` | Dark text, headings |
| `gray800` | `#1F1F1F` | Dark backgrounds |
| `gray900` | `#141414` | Darkest backgrounds |

### Semantic Colors

| Category | Token | Value | Usage |
|----------|-------|-------|-------|
| **Positive** | `positive` | `#05944F` | Success states, confirmations |
| | `positiveDark` | `#03703C` | Hover state |
| | `positiveLight` | `#E6F5ED` | Background tint |
| **Negative** | `negative` | `#E11900` | Errors, destructive actions |
| | `negativeDark` | `#AB1300` | Hover state |
| | `negativeLight` | `#FFEFED` | Background tint |
| **Warning** | `warning` | `#FFC043` | Warnings, alerts |
| | `warningDark` | `#997328` | Hover state |
| | `warningLight` | `#FFF2D9` | Background tint |
| **Accent** | `accent` | `#276EF1` | Links, interactive elements |
| | `accentDark` | `#1E54B7` | Hover state |
| | `accentLight` | `#EEF3FE` | Background tint |

---

## Typography

### Font Families

```css
--font-display: "Uber Move", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
--font-text: "Uber Move Text", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
--font-mono: "Uber Move Mono", ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace;
```

### Type Scale

Base: 14px, Ratio: 1.125 (Major Second)

| Token | Size | Line Height | Weight | Letter Spacing |
|-------|------|-------------|--------|----------------|
| `display1` | 96px | 112px | 700 | -1.5px |
| `display2` | 60px | 72px | 700 | -0.5px |
| `h1` | 48px | 56px | 700 | 0px |
| `h2` | 34px | 42px | 700 | 0.25px |
| `h3` | 24px | 32px | 700 | 0px |
| `h4` | 20px | 28px | 700 | 0.15px |
| `h5` | 18px | 24px | 700 | 0px |
| `h6` | 16px | 22px | 700 | 0.15px |
| `bodyLarge` | 16px | 24px | 400 | 0.5px |
| `body` | 14px | 20px | 400 | 0.25px |
| `bodySmall` | 12px | 16px | 400 | 0.4px |
| `caption` | 11px | 14px | 400 | 0.4px |
| `label` | 12px | 16px | 500 | 0.5px |

---

## Spacing

4px base unit, 8px standard rhythm.

| Token | Value | Usage |
|-------|-------|-------|
| `space0` | 0px | No spacing |
| `space1` | 4px | Minimal spacing |
| `space2` | 8px | Tight spacing (default) |
| `space3` | 12px | Compact spacing |
| `space4` | 16px | Standard spacing |
| `space5` | 20px | Comfortable spacing |
| `space6` | 24px | Relaxed spacing |
| `space8` | 32px | Section padding |
| `space10` | 40px | Large gaps |
| `space12` | 48px | Section margins |
| `space16` | 64px | Page sections |
| `space20` | 80px | Hero sections |
| `space24` | 96px | Maximum spacing |

---

## Shadows & Elevation

| Token | Value | Usage |
|-------|-------|-------|
| `shadowNone` | `none` | No shadow |
| `shadowSm` | `0 1px 2px 0 rgba(0,0,0,0.05)` | Subtle depth |
| `shadowBase` | `0 1px 3px 0 rgba(0,0,0,0.1), 0 1px 2px 0 rgba(0,0,0,0.06)` | Cards |
| `shadowMd` | `0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)` | Dropdowns |
| `shadowLg` | `0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05)` | Modals |
| `shadowXl` | `0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)` | Dialogs |
| `shadow2xl` | `0 25px 50px -12px rgba(0,0,0,0.25)` | Popovers |

---

## Border Radius

| Token | Value | Usage |
|-------|-------|-------|
| `radiusNone` | 0px | No rounding |
| `radiusSm` | 2px | Minimal rounding |
| `radiusBase` | 4px | Default rounding |
| `radiusMd` | 6px | Medium rounding |
| `radiusLg` | 8px | Large rounding |
| `radiusXl` | 12px | Extra large rounding |
| `radius2xl` | 16px | Maximum rounding |
| `radiusFull` | 9999px | Pill/circle shapes |

---

## Breakpoints

| Token | Value | CSS Variable |
|-------|-------|--------------|
| `sm` | 640px | `--breakpoint-sm` |
| `md` | 768px | `--breakpoint-md` |
| `lg` | 1024px | `--breakpoint-lg` |
| `xl` | 1280px | `--breakpoint-xl` |
| `2xl` | 1536px | `--breakpoint-2xl` |

---

## Components

### Button

**Variants:** `primary`, `secondary`, `outline`, `ghost`, `destructive`  
**Sizes:** `sm` (32px), `md` (40px), `lg` (48px)

```jsx
<Button variant="primary" size="md">Click Me</Button>
```

### Input

**States:** `default`, `focus`, `error`, `disabled`  
**Sizes:** `sm`, `md`, `lg`

```jsx
<Input placeholder="Enter text" size="md" error={false} />
```

### Card

**Variants:** `default`, `elevated`, `outlined`

```jsx
<Card variant="elevated">
  <CardHeader>Title</CardHeader>
  <CardContent>Content</CardContent>
</Card>
```

### Typography

```jsx
<Typography variant="h1">Heading 1</Typography>
<Typography variant="body">Body text</Typography>
<Typography variant="caption">Caption text</Typography>
```
