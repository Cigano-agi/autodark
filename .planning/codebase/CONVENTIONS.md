# Code Conventions

## TypeScript

- **Strict Mode**: DISABLED (`strict: false` in tsconfig.app.json)
  - `noImplicitAny: false` — implicit `any` types allowed
  - `noUnusedLocals: false` — unused variables permitted
  - `noUnusedParameters: false` — unused parameters permitted
  - `noFallthroughCasesInSwitch: false` — fall-through cases allowed in switch statements
  - Target: ES2020, Module: ESNext, moduleDetection: force

- **Type Annotations**: Minimal required; types inferred where possible
- **Path Aliases**: `@/*` → `./src/*` for cleaner imports
- **React**: JSX via React 18.3 with react-jsx compiler option

## Styling

### Tailwind CSS
- **Dark Mode**: Default via `darkMode: ["class"]`
- **Light Mode Support**: `.light` class toggles light palette in index.css
- **Prefix**: None (default TW classes)
- **Custom Design System**: Uber Base Design System colors and spacing

### Color Conventions
- **Base Colors**: HSL CSS variables in :root and .dark/.light classes
  - `--base-black`, `--base-white`
  - `--base-gray50` through `--base-gray900` (11-step grayscale)
  - Semantic: `--base-positive` (green), `--base-negative` (red), `--base-warning` (yellow), `--base-accent` (blue)
  - Light/dark variants: `--base-*Dark`, `--base-*Light`

- **Legacy shadcn/ui Colors**: Mapped to base system for compatibility
  - `--primary`, `--secondary`, `--destructive`, `--accent`, `--muted`, etc.
  - Semantic: `--success`, `--warning`, `--info`
  - Health: `--health-green`, `--health-yellow`, `--health-red`
  - Charts: `--chart-1` through `--chart-5`

### Spacing
- 4px base unit
- Scale: 0.5 (2px) → 24 (96px), including 3.5, 7 variants
- Classes: `gap-2`, `p-4`, `m-8`, `px-3`, etc.

### Typography
- **Font**: Inter, system fonts fallback
- **Mono**: ui-monospace, SFMono-Regular, Menlo, Consolas
- **Scale**: display1/2, h1–h6, body-lg/body/body-sm, caption, label
  - Example: `h3: 24px / 32px line-height / 700 weight`

### Animations
- **Keyframes** (Tailwind + CSS):
  - `accordion-down/up` (0.2s)
  - `fade-in`, `slide-up`, `scale-in` (0.5s / 0.4s / 0.3s)
  - `pulse-glow`, `conveyor`, `conveyor-slow`
- **Animation Classes**: `.animate-fade-in`, `.animate-slide-up`, etc.
- **Delays**: `.delay-100`, `.delay-200`, `.delay-300`, `.delay-500`, `.delay-1000`

### Component Patterns
- **CVA (Class Variance Authority)** for variant-based styling
  - Example: Button with `variant` (default, destructive, outline, secondary, ghost, link) and `size` props
- **clsx + twMerge** via `cn()` utility for class merging
- **Shadcn/ui Components**: Radix UI + Tailwind wrapper components
  - Located in `src/components/ui/`
  - Export convention: named exports + component.displayName
  - forwardRef for DOM element components (Button, Input, etc.)

## Component Structure

### Organization
- **Pages**: `src/pages/` → route-level pages (Dashboard, Channel, etc.)
- **Components**: `src/components/`
  - `ui/` — shadcn/ui base components (button, dialog, card, etc.)
  - `layout/` — AppLayout, PremiumSidebar
  - `Factory/` — Multi-part component via Object.assign pattern (Narrator, Director, Editor, Publisher)
  - Feature folders: Channel/, Dashboard/, Production/, etc.
- **Hooks**: `src/hooks/` — custom React hooks (useAuth, useChannels, useGlobalQueue, etc.)
- **Lib**: `src/lib/utils.ts` — utilities (cn, formatNumber, getHealthColor, etc.)
- **Constants**: `src/constants/` — configuration, option lists (nicheOptions, etc.)
- **Integrations**: `src/integrations/` — Supabase client, external APIs

### Naming Conventions
- **Files**: PascalCase for components (Button.tsx), camelCase for utilities (utils.ts), kebab-case for folders (ui, layout)
- **Components**: PascalCase (AppLayout, Dashboard, Factory, etc.)
- **Hooks**: camelCase with `use` prefix (useAuth, useChannels, useGlobalQueue, useMutation, useQuery)
- **Exports**: Named exports for utilities and hooks; default export for pages

## State Management

### React Query (TanStack Query)
- **Version**: 5.83.0
- **Usage**: Caching, server state, automatic refetch
- **Config** (App.tsx):
  - `staleTime: 10min` (data staleness threshold)
  - `gcTime: 30min` (garbage collection time, formerly cacheTime)
  - `retry: 1` (failed requests retried once)
  - `refetchOnWindowFocus: false`
  - `refetchOnReconnect: 'always'` (always refetch when reconnecting)
- **Hooks**: useQuery (read), useMutation (write), useQueryClient (cache)

### Auth Context
- **useAuth Hook**: Custom context provider in src/hooks/useAuth.tsx
  - Methods: signInWithEmail, signUpWithEmail, signInWithGoogle, signOut
  - State: user, session, loading, userName
  - Provider wraps entire app in App.tsx

### Local State
- useState for component-level UI state (dialogs, forms, filters)
- Examples: createDialogOpen, createStep, searchTerm, etc.

### Supabase
- Client initialized in `src/integrations/supabase/client.ts`
- Tables accessed via `.from('table_name').select(...)...`
- Auth managed via supabase.auth methods

## File Naming

- **React Components**: PascalCase + .tsx
  - `Button.tsx`, `AppLayout.tsx`, `Dashboard.tsx`
- **Utility/Helper Files**: camelCase + .ts
  - `utils.ts`, `client.ts`, `constants.ts`
- **Folders**: kebab-case
  - `src/components/ui/`, `src/pages/`, `src/hooks/`
- **Index Files**: `index.ts` for multi-part components (Factory)
  - Export barrel style: `export { Component }; export type { Props };`

## Import Aliases

- `@/*` → `./src/*` — used throughout for cleaner imports
  - `import { Button } from "@/components/ui/button"`
  - `import { cn } from "@/lib/utils"`
  - `import { useAuth } from "@/hooks/useAuth"`
  - `import { supabase } from "@/integrations/supabase/client"`

## Code Quality & Linting

- **ESLint**: typescript-eslint + React Hooks plugin
  - Rules:
    - `@typescript-eslint/no-unused-vars: off` (noUnusedLocals: false in tsconfig)
    - `react-refresh/only-export-components: warn` (Vite Fast Refresh compatibility)
    - `react-hooks/exhaustive-deps: recommended`
  - Ignores: `dist/` directory
- **No Prettier**: Code formatting via ESLint only

## Error Handling & Logging

- **Error Boundary**: Custom ErrorBoundary component wraps app
- **Toast Notifications**: Sonner + shadcn Toaster for user feedback
  - Example: `toast.error('Preencha os campos obrigatórios')`
- **Async Error Handling**: Try-catch in mutations, promise chains with error callbacks

## Module Bundling

- **Vite**: Build tool with React SWC for fast compilation
- **Manual Chunks** (build optimization):
  - vendor-react: react, react-dom, react-router-dom
  - vendor-ui: lucide-react, framer-motion, clsx, tailwind-merge
  - vendor-supabase: @supabase/supabase-js
  - vendor-charts: recharts
  - vendor-remotion: remotion, @remotion/player
  - vendor-ffmpeg: @ffmpeg/ffmpeg, @ffmpeg/util, @ffmpeg/core
- **Chunk Size Warning**: 1200kb limit
