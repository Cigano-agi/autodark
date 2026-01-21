# Style Guide for Developers

Quick reference for using the Uber Base Design System in AutoDark.

---

## Quick Start

```tsx
// Import tokens
import { colors, typography, spacing, shadows, radius } from '@/design-system/tokens';

// Import components
import { Button, Input, Card, Typography, Stack } from '@/design-system/components';
```

---

## Color Usage

```tsx
// ✅ Do: Use tokens
<div style={{ backgroundColor: colors.gray900, color: colors.white }}>

// ❌ Don't: Hardcode colors
<div style={{ backgroundColor: '#141414', color: '#fff' }}>
```

### CSS Classes (Tailwind)

```html
<!-- Primary actions -->
<button class="bg-base-black text-base-white">Primary</button>

<!-- Secondary actions -->
<button class="bg-base-gray100 text-base-gray700">Secondary</button>

<!-- Semantic colors -->
<span class="text-base-positive">Success</span>
<span class="text-base-negative">Error</span>
<span class="text-base-warning">Warning</span>
<span class="text-base-accent">Link</span>
```

---

## Typography

### Components

```tsx
<Typography variant="display1">Hero Title</Typography>
<Typography variant="h1">Page Title</Typography>
<Typography variant="h2">Section Title</Typography>
<Typography variant="h3">Subsection</Typography>
<Typography variant="body">Regular text</Typography>
<Typography variant="bodySmall">Small text</Typography>
<Typography variant="caption">Caption</Typography>
<Typography variant="label">LABEL TEXT</Typography>
```

### CSS Classes

```html
<h1 class="text-display1">Display 1</h1>
<p class="text-body">Body text</p>
<span class="text-caption">Caption</span>
```

---

## Spacing

Use spacing tokens for consistent rhythm.

```tsx
// Component props
<Stack gap={4}>  // 16px gap
<Box padding={6}>  // 24px padding

// Tailwind classes
<div class="p-4 gap-2 m-6">  // padding-16px, gap-8px, margin-24px
```

### Spacing Scale

| Class | Value |
|-------|-------|
| `space-1` | 4px |
| `space-2` | 8px |
| `space-3` | 12px |
| `space-4` | 16px |
| `space-6` | 24px |
| `space-8` | 32px |

---

## Components

### Button

```tsx
// Primary (default)
<Button>Submit</Button>

// Variants
<Button variant="secondary">Cancel</Button>
<Button variant="outline">Edit</Button>
<Button variant="ghost">Learn More</Button>
<Button variant="destructive">Delete</Button>

// Sizes
<Button size="sm">Small</Button>
<Button size="md">Medium</Button>
<Button size="lg">Large</Button>

// States
<Button disabled>Disabled</Button>
<Button loading>Loading...</Button>
```

### Input

```tsx
// Basic
<Input placeholder="Email" />

// With label
<Input label="Email" placeholder="you@example.com" />

// Error state
<Input error="Invalid email" />

// Disabled
<Input disabled />
```

### Card

```tsx
// Default
<Card>
  <p>Content</p>
</Card>

// Elevated (with shadow)
<Card variant="elevated">
  <p>Content with shadow</p>
</Card>

// Outlined
<Card variant="outlined">
  <p>Content with border</p>
</Card>
```

### Layout

```tsx
// Stack (vertical by default)
<Stack gap={4}>
  <div>Item 1</div>
  <div>Item 2</div>
</Stack>

// Horizontal stack
<Stack direction="horizontal" gap={2}>
  <Button>Cancel</Button>
  <Button variant="primary">Confirm</Button>
</Stack>

// Container (centered, max-width)
<Container>
  <h1>Page content</h1>
</Container>

// Grid
<Grid columns={3} gap={4}>
  <Card>1</Card>
  <Card>2</Card>
  <Card>3</Card>
</Grid>
```

---

## Dark Mode

Dark mode is the default. Colors adapt automatically:

| Light Mode | Dark Mode |
|------------|-----------|
| `gray50` | `gray900` |
| `gray100` | `gray800` |
| `gray700` | `gray300` |
| `black` | `white` |

---

## Accessibility

- **Contrast**: All text meets WCAG 2.1 AA (4.5:1 ratio)
- **Focus**: Visible focus ring on interactive elements
- **Labels**: Always provide accessible labels

```tsx
// ✅ Do
<Button aria-label="Close dialog">×</Button>
<Input label="Email" id="email" />

// ❌ Don't
<Button>×</Button>
<Input placeholder="Email" />  // Missing label
```

---

## Rules

1. **Never hardcode colors** – Always use tokens
2. **Use spacing scale** – Stick to 4px increments
3. **Font weights** – Only 400 (regular), 500 (medium), 700 (bold)
4. **Always test dark mode** – Verify contrast on dark backgrounds
5. **Mobile first** – Design for 640px, then scale up
