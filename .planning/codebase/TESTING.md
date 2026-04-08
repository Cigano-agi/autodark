# Testing

## Test Framework

- **Framework**: Playwright (e2e testing)
- **Version**: @playwright/test ^1.59.1
- **Config**: Playwright default config (no playwright.config.ts checked in)
- **Language**: TypeScript (.spec.ts files)
- **No Unit Testing**: vitest.config.ts not found; no unit/integration tests in src/

## Test Coverage

### Coverage Areas
- **E2E Only**: Browser automation and user flow testing
- **Not Tested (Gaps)**:
  - Unit tests for utilities (cn, formatNumber, getHealthColor)
  - Unit tests for custom hooks (useAuth, useChannels, useGlobalQueue)
  - Component snapshots or rendering tests
  - Query logic and mutation handlers
  - Error scenarios and edge cases
  - Accessibility (a11y)

### Untested Code
- src/lib/utils.ts — utility functions
- src/hooks/*.tsx — all custom hooks
- src/components/ui/*.tsx — shadcn/ui wrapper components
- src/integrations/supabase/client.ts — Supabase client initialization
- Error handling and exception flows

## Test Files

All tests in `tests/e2e/` directory:

### 1. smoke.spec.ts (6041 bytes)
- **Purpose**: P0 smoke tests — <3 minutes, no video generation, no AI calls
- **Trigger**: Every commit / before meetings
- **Test ID**: P0-001 — Login redirects to /dashboard
  - Logs in via email/password
  - Verifies redirect to /dashboard
  - Checks greeting displays "OLÁ," (uppercase)
- **Coverage**:
  - Login flow → /dashboard redirect
  - Dashboard: greeting, search, "ADICIONAR CANAL" button, channel card
  - Channel Hub: sidebar nav + inline tabs (Analytics, Estratégia, Fábrica, etc.)
  - Sidebar globals: Dashboard, Fila Global, Media Hub
  - Sidebar channel: Visão Geral, DNA do Canal, Production Factory
  - Channel inline tabs: Analytics, Estratégia, Fábrica, Concorrentes, Configuração
  - Header buttons: Novo Vídeo, Studio Longo
  - Tab persistence: ?tab= query param via useSearchParams
- **Base URL**: https://autodark-olive.vercel.app
- **Credentials**: brufab222@gmail.com / guijoni45

### 2. production-factory.spec.ts (8289 bytes)
- **Purpose**: Production Factory workflow end-to-end
- **Test Coverage**:
  - Factory UI states (Narrator, Director, Editor, Publisher components)
  - Scene card rendering
  - Production pipeline flows
  - Data binding and state transitions
- **Scope**: Multi-step production workflow validation

### 3. wizard-flows.spec.ts (2673 bytes)
- **Purpose**: Wizard and multi-step flows
- **Test Coverage**:
  - Step progression (e.g., channel creation dialogs with step 1 → step 2)
  - Form validation in wizard context
  - Dialog/modal state transitions

## How to Run

### Install Dependencies
```bash
npm install
```

### Run All E2E Tests
```bash
npx playwright test
```

### Run Specific Test File
```bash
npx playwright test tests/e2e/smoke.spec.ts
```

### Run in Debug Mode
```bash
npx playwright test --debug
```

### Run with UI
```bash
npx playwright test --ui
```

### View Test Report
```bash
npx playwright show-report
```

### Run with Specific Browser
```bash
npx playwright test --project=chromium
npx playwright test --project=firefox
npx playwright test --project=webkit
```

### Other Commands
```bash
npm run dev        # Start dev server
npm run build      # Build for production
npm run lint       # Run ESLint (no unit tests)
npm run preview    # Preview production build
```

## Test Configuration

### Playwright Defaults (not overridden)
- Browsers: Chromium, Firefox, WebKit (all 3 tested by default)
- Workers: Parallel execution by default
- Timeout: 30 seconds per test
- Retries: 2 by default (can be configured per test)
- Screenshot: On failure (default)

### Test Credentials
- Email: brufab222@gmail.com
- Password: guijoni45
- Bypass: localStorage keys exist for emergency auth bypass
  - `autodark_bypass_auth: 'true'`
  - `autodark_bypass_email: 'email@domain.com'`

## Gaps

### Critical Gaps
1. **No Unit Tests**: Zero unit/integration tests for business logic
   - useAuth hook not tested
   - useChannels hook (CRUD operations) not tested
   - Utility functions (formatNumber, cn, getHealthColor) untested
   - React Query integration untested

2. **No Component Tests**: No component rendering/snapshot tests
   - shadcn/ui wrappers not validated
   - Custom components (Factory, Dashboard, etc.) not tested
   - Props validation missing
   - CSS classes not verified

3. **No Error Handling Tests**: E2E tests don't validate:
   - Supabase connection failures
   - Auth failures and edge cases
   - Network errors and timeouts
   - Invalid form submissions
   - API error responses

4. **No Accessibility Tests**: No a11y testing
   - ARIA attributes not verified
   - Keyboard navigation not tested
   - Screen reader compatibility not tested

5. **Limited E2E Scope**:
   - No video generation flows (explicitly excluded)
   - No AI call flows (explicitly excluded)
   - No FFmpeg/Remotion integration tests
   - No concurrent user tests

6. **No Performance Tests**:
   - Load time benchmarks missing
   - Query performance not measured
   - Bundle size regression detection missing

### Recommendations for Coverage
- Add vitest for unit tests (hooks, utilities, mutations)
- Add @testing-library/react for component tests
- Expand E2E to include error scenarios and edge cases
- Add accessibility testing (axe-core or Playwright a11y)
- Mock Supabase for unit tests
