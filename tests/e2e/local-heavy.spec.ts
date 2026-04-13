import { test, expect, Page } from '@playwright/test';

const BASE_URL = 'http://localhost:5173';

test.describe('Autodark Local Heavy Audit (Phase 4)', () => {
  // Configurar o bypass antes de cada teste
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
    await page.evaluate(() => {
      localStorage.setItem('autodark_bypass_auth', 'true');
      localStorage.setItem('autodark_bypass_email', 'test@autodark.com');
    });
    // Força recarregamento para o provedor de Auth detectar o localStorage
    await page.goto(`${BASE_URL}`, { waitUntil: 'networkidle' });
  });

  test('Deve exibir o Dashboard após acessar rotas protegidas usando bypass', async ({ page }) => {
    // Redireciona para o dashboard, que é uma rota protegida
    await page.goto(`${BASE_URL}/dashboard`);
    await expect(page).toHaveURL(/.*\/dashboard/, { timeout: 15000 });
    
    // Verifica a listagem de canais
    const searchInput = page.locator('input[placeholder*="Buscar"], input[placeholder*="BUSCAR"]').first();
    await expect(searchInput).toBeVisible();

    const addChannelBtn = page.locator('button:has-text("ADICIONAR"), button:has-text("Adicionar")').first();
    await expect(addChannelBtn).toBeVisible();
  });

  test('Deve ser possível navegar na Foundation de um canal', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'networkidle' });
    
    // Clica no primeiro canal que aparecer, se houver
    const channelCards = page.locator('div.grid > div.relative').first();
    const hasChannel = await channelCards.count() > 0;
    
    if (hasChannel) {
      await channelCards.click();
      await expect(page).toHaveURL(/.*\/channel\/[a-z0-9-]+$/i, { timeout: 10000 });
      
      // Ir para Foundation
      await page.click('text=Foundation');
      await expect(page).toHaveURL(/.*\/channel\/[a-z0-9-]+\/foundation$/i, { timeout: 10000 });
      
      // Validar os blocos implantados na Phase 3
      await expect(page.locator('h3:has-text("Block A")')).toBeVisible({ timeout: 5000 });
      await expect(page.locator('h3:has-text("Hardware")')).toBeVisible({ timeout: 5000 });
      await expect(page.locator('h3:has-text("Z-Score")')).toBeVisible({ timeout: 5000 });
    } else {
      console.log('Nenhum canal presente para testar a Foundation.');
    }
  });

  test('Deve testar o fluxo do Pipeline (Production Factory)', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'networkidle' });
    const channelCards = page.locator('div.grid > div.relative').first();
    
    if (await channelCards.count() > 0) {
      await channelCards.click();
      await expect(page).toHaveURL(/.*\/channel\/[a-z0-9-]+$/i, { timeout: 10000 });
      
      // Ir para Production Factory
      await page.click('text=Production Factory');
      await expect(page).toHaveURL(/.*\/channel\/[a-z0-9-]+\/production$/i, { timeout: 10000 });
      
      // Validar que o Studio LITE está presente
      const statusTitle = page.locator('text=Status Fábrica').first();
      await expect(statusTitle).toBeVisible();
    }
  });
});
