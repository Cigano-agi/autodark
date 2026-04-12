/**
 * Smoke Suite — P0
 * Goal: < 3 minutes, no video generation, no AI calls.
 * Trigger: Every commit / before meetings.
 *
 * Covers:
 *  1. Login flow → redirect to /dashboard
 *  2. Dashboard: greeting, search, "Adicionar Canal" button, channel card
 *  3. Channel Hub: sidebar nav + inline tabs (Analytics, Estratégia, Fábrica, etc.)
 *
 * UI State (post PURGE & SCALE deploy 2026-04-08):
 *  - Dashboard greeting: "OLÁ,"
 *  - Search placeholder: "BUSCAR CANAL OU VÍDEO..."
 *  - Add button: "ADICIONAR CANAL"
 *  - Sidebar global: "Dashboard", "Fila Global", "Media Hub"
 *  - Sidebar channel: "Visão Geral", "DNA do Canal", "Production Factory"
 *  - Channel inline tabs: Analytics, Estratégia, Fábrica, Concorrentes, Configuração
 *  - Header buttons: "Novo Vídeo", "Studio Longo"
 *  - Tab persistence: ?tab= query param (useSearchParams)
 */

import { test, expect, Page } from '@playwright/test';

const BASE_URL = 'https://autodark-olive.vercel.app';
const EMAIL = 'brufab222@gmail.com';
const PASSWORD = 'guijoni45';

async function loginIfNeeded(page: Page): Promise<void> {
  await page.goto(`${BASE_URL}/`);
  await page.waitForTimeout(1500);
  if (page.url().includes('/dashboard') || page.url().includes('/channel')) return;

  await page.fill('input[id="login-email"]', EMAIL);
  await page.fill('input[id="login-password"]', PASSWORD);
  await page.click('button:has-text("Entrar na Plataforma")');
  await expect(page).toHaveURL(/.*\/dashboard/, { timeout: 20000 });
}

// ─── P0-001: Login ────────────────────────────────────────────────────────────

test('P0-001 — Login redirects to /dashboard', async ({ page }) => {
  await page.goto(`${BASE_URL}/`);
  await page.waitForTimeout(1500);

  if (page.url().includes('/dashboard')) {
    console.log('[SKIP] Already authenticated');
    return;
  }

  await expect(page.locator('input[id="login-email"]')).toBeVisible({ timeout: 10000 });
  await page.fill('input[id="login-email"]', EMAIL);
  await page.fill('input[id="login-password"]', PASSWORD);
  await page.click('button:has-text("Entrar na Plataforma")');

  await expect(page).toHaveURL(/.*\/dashboard/, { timeout: 20000 });

  // Dashboard greeting uses "OLÁ," (uppercase)
  await expect(page.locator('text=OLÁ')).toBeVisible({ timeout: 10000 });
});

// ─── P0-002: Dashboard ────────────────────────────────────────────────────────

test('P0-002 — Dashboard renders channels, search and add button', async ({ page }) => {
  await loginIfNeeded(page);

  // Search input with new placeholder (PURGE & SCALE updated)
  await expect(
    page.locator('input[placeholder*="BUSCAR"], input[placeholder*="Buscar"]').first()
  ).toBeVisible({ timeout: 15000 });

  // "Adicionar Canal" button (replaced "Recruit Unit")
  await expect(
    page.locator('button:has-text("Adicionar"), button:has-text("ADICIONAR")').first()
  ).toBeVisible({ timeout: 10000 });

  // Sidebar global nav — updated labels
  await expect(page.locator('text=Dashboard').first()).toBeVisible({ timeout: 5000 });

  // Channel card
  await expect(page.locator('h3:has-text("Canal de Teste E2E")').first()).toBeVisible({ timeout: 10000 });

  // Search interaction
  const searchInput = page.locator('input[placeholder*="BUSCAR"], input[placeholder*="Buscar"]').first();
  await searchInput.fill('teste');
  await page.waitForTimeout(400);
  await searchInput.fill('');
});

// ─── P0-003: Channel Hub ──────────────────────────────────────────────────────

test('P0-003 — Channel Hub: sidebar nav, inline tabs, header buttons', async ({ page }) => {
  await loginIfNeeded(page);

  // Navigate to channel
  await page.waitForSelector('h3:has-text("Canal de Teste E2E")', { timeout: 15000 });
  await page.locator('h3:has-text("Canal de Teste E2E")').first().click();
  await expect(page).toHaveURL(/.*\/channel\/[a-z0-9-]+$/, { timeout: 10000 });

  const channelId = page.url().match(/\/channel\/([a-zA-Z0-9-]+)/)?.[1] ?? '';
  expect(channelId).not.toBe('');

  // Channel sidebar nav links
  await expect(page.locator('text=Visão Geral').first()).toBeVisible({ timeout: 10000 });
  await expect(page.locator('text=DNA do Canal').first()).toBeVisible({ timeout: 5000 });
  await expect(page.locator('text=Production Factory').first()).toBeVisible({ timeout: 5000 });

  // Header action buttons
  await expect(page.locator('button:has-text("Novo Vídeo")').first()).toBeVisible({ timeout: 5000 });
  await expect(page.locator('button:has-text("Studio Longo")').first()).toBeVisible({ timeout: 5000 });

  // Inline tab buttons (Channel/Index.tsx — 5 tabs)
  await page.evaluate(() => window.scrollBy(0, 400));
  await page.waitForTimeout(500);

  const tabs = ['Analytics', 'Estratégia', 'Fábrica', 'Concorrentes', 'Configuração'];
  for (const label of tabs) {
    await expect(page.locator(`button:has-text("${label}")`).first()).toBeVisible({ timeout: 8000 });
  }

  // Tab persistence: click Estratégia → URL should contain ?tab=ideas
  await page.locator('button:has-text("Estratégia")').first().click();
  await expect(page).toHaveURL(/.*\?tab=ideas/, { timeout: 5000 });

  // F5 persistence: reload and verify same tab stays active
  await page.reload();
  await expect(page).toHaveURL(/.*\?tab=ideas/, { timeout: 5000 });
  await page.evaluate(() => window.scrollBy(0, 400));
  await page.waitForTimeout(500);
  await expect(page.locator('button:has-text("Estratégia")').first()).toBeVisible({ timeout: 5000 });

  // Navigate to Production Factory via sidebar
  await page.locator('text=Production Factory').first().click();
  await expect(page).toHaveURL(`${BASE_URL}/channel/${channelId}/production`, { timeout: 10000 });
});
