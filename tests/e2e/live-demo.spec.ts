import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:5173';

test('Autodark LIVE DEMO: Geração de Vídeo Completa', async ({ page }) => {
  // Ajusta timeout geral do demo para 10 minutos para dar tempo de assistir e gerar
  test.setTimeout(600000);

  console.log('[🚀] Iniciando Demo: Entrando no sistema...');
  await page.goto(BASE_URL);
  
  await page.goto(BASE_URL, { waitUntil: 'networkidle' });
  
  if (!page.url().includes('/dashboard')) {
    console.log('[🔑] Inserindo credenciais de acesso livre...');
    await page.fill('input[id="login-email"]', 'test@autodark.com');
    await page.fill('input[id="login-password"]', '123456');
    await page.click('button:has-text("Entrar na Plataforma")');
  }

  // Aguarda o roteamento seguro da aplicação
  await expect(page).toHaveURL(/.*\/dashboard/, { timeout: 15000 });
  
  console.log('[👤] Login efetuado! Acessando primeiro canal...');
  const firstChannel = page.locator('div.relative.group').first();
  // Aguarda até existir
  await firstChannel.waitFor({ state: 'visible', timeout: 15000 });
  await firstChannel.click();
  await expect(page).toHaveURL(/.*\/channel\/[a-z0-9-]+$/i, { timeout: 15000 });

  console.log('[🎬] Acessando Production Factory...');
  const baseUrlChannel = page.url();
  await page.goto(`${baseUrlChannel}/production`, { waitUntil: 'networkidle' });

  await expect(page).toHaveURL(/.*\/production/, { timeout: 15000 });
  console.log('[⚙️] Configurando pauta...');

  // Preenche dados
  const textarea = page.locator('textarea');
  await textarea.fill('A teoria da relatividade geral de Einstein, com piadas sarcásticas estilo Rick and Morty');
  
  // Seleciona a duração mínima (2m)
  const durationBtn = page.locator('button:has-text("2m")').first();
  await durationBtn.click();
  
  console.log('[⚡] Lançando Pipeline! Segure firme nas cadeiras...');
  
  // Clica no botão de iniciar produção (pode se chamar "Lançar Missão" ou "Iniciar Produção")
  const startBtn = page.locator('button:has-text("Iniciar Produção"), button:has-text("Lançar Missão")').first();
  await startBtn.click();
  
  // Agora apenas aguardamos o pipeline inteiro completar. 
  // O orchestrator passa pelo Script -> Cenas -> Áudio -> Final.
  // Quando tudo finaliza ele redireciona para a aba Fila (?tab=queue)
  console.log('[🧠] Pipeline Ativado! A I.A. assumiu o controle. Agora é só sentar e ver a tela...');
  
  // Espera completar (Redirecionamento para queue indica a conclusão nas regras do Autodark)
  await page.waitForURL(/.*\?tab=queue/, { timeout: 500000 });
  
  console.log('[⭐] SUCESSO ABSOLUTO! Pipeline finalizou de ponta a ponta. Bem-vindo à nova era!');
  
  // Deixa a tela aberta por 10 segundos pra você contemplar o resultado antes de fechar!
  await page.waitForTimeout(10000);
});
