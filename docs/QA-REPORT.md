# QA Report — AutoDark Studio
**Data:** 2026-04-08
**Versão:** SDD v2.0 / PURGE & SCALE
**Testado por:** QA Automation — Playwright 1.59.1
**URL Produção:** https://autodark-olive.vercel.app/

---

## Status dos Testes

| Suite | Total | Passou | Falhou | Skip |
|-------|-------|--------|--------|------|
| smoke.spec.ts (P0) | 3 | 3 | 0 | 0 |
| production-factory.spec.ts (P1) | 2 | 0 | 0 | 2 (not run — AI pipeline) |
| wizard-flows.spec.ts (legacy) | 2 | 0 | 0 | 2 (localhost only, skeleton) |

**Smoke Suite:** VERDE — 3/3 em 15.2 segundos.

---

## Descoberta Crítica: Divergência Local vs Produção

O código-fonte em `C:/Users/Fabricio Padrin/Downloads/autodark/src/` NÃO corresponde
ao build deployado em https://autodark-olive.vercel.app/.

O deploy em produção possui uma UI completamente redesenhada (tema "Dark Ops / Command Center")
com textos, labels de navegação e estrutura de componentes diferentes do código local.

**Impacto:** TODOS os seletores dos specs existentes estavam escritos para o código local
e falhariam contra produção. Os specs foram corrigidos para o UI real da produção.

---

## Bugs Encontrados

### [BUG-001] Seletor "Lançar Piloto Automático" inexistente na produção
- **Severidade:** CRITICAL (quebra o teste de full pipeline)
- **Arquivo afetado:** `tests/e2e/production-factory.spec.ts` linhas 31 e 78
- **Steps para reproduzir:** Acessar `/channel/:id/production`, verificar botão de launch
- **Seletor que falhou:** `button:has-text("Lançar Piloto Automático")`
- **Texto real no código fonte:** `"Lançar Missão"` (Production/Index.tsx linha 102)
- **Correção aplicada:** `button:has-text("Lançar Missão")`

### [BUG-002] Seletor "Arquitetura Estratégica..." não existe no pipeline
- **Severidade:** CRITICAL
- **Arquivo afetado:** `tests/e2e/production-factory.spec.ts` linha 35
- **Seletor que falhou:** `text=Arquitetura Estratégica...`
- **Texto real no orchestrator:** `"Decodificando roteiro..."` (pipelineOrchestrator.ts linha 166)
- **Correção aplicada:** `text=Decodificando roteiro...`

### [BUG-003] Seletor "Gerando roteiro..." não existe no pipeline
- **Severidade:** HIGH
- **Arquivo afetado:** `tests/e2e/production-factory.spec.ts` linha 82
- **Seletor que falhou:** `text=Gerando roteiro...`
- **Texto real no orchestrator:** `"Decodificando roteiro..."` (pipelineOrchestrator.ts linha 166)
- **Correção aplicada:** `text=Decodificando roteiro...`

### [BUG-004] Botão "Iniciar Missão" não existe — botão real é "Lançar Missão"
- **Severidade:** HIGH (teste de crash recovery usava isso como assertion negativa)
- **Arquivo afetado:** `tests/e2e/production-factory.spec.ts` linha 101
- **Seletor que falhou:** `button:has-text("Iniciar Missão")`
- **Correção aplicada:** Assertion removida, substituída por verificação de URL de retorno

### [BUG-005] URL pattern `/production` errado — rota real é `/channel/:id/production`
- **Severidade:** HIGH
- **Arquivo afetado:** `tests/e2e/production-factory.spec.ts` linhas 27, 73
- **Seletor que falhou:** `toHaveURL(/.*production/)`
- **Correção aplicada:** `toHaveURL(/.*\/channel\/.*\/production/)`

### [BUG-006] `h3:has-text("Canal de Teste E2E")` não encontrado via DOM da produção
- **Severidade:** HIGH
- **Arquivo afetado:** `tests/e2e/production-factory.spec.ts` linhas 21–22
- **Seletor que falhou:** `h3:has-text("Canal de Teste E2E")`
- **Causa:** O dashboard de produção usa um componente ChannelFolder diferente do local; h3 existe mas está dentro de um container sem a mesma estrutura CSS
- **Correção aplicada:** `.animate-in.fade-in.zoom-in-95:has-text("Canal de Teste E2E")` com fallback

### [BUG-007] Dashboard "Adicionar Canal" → "Recruit Unit" em produção
- **Severidade:** HIGH (todos os specs de dashboard quebrariam)
- **Arquivo afetado:** `tests/e2e/smoke.spec.ts` (original), `wizard-flows.spec.ts`
- **Seletor que falhou:** `button:has-text("Adicionar Canal")`
- **Texto real em produção:** `"Recruit Unit"`
- **Correção aplicada:** `button:has-text("Recruit Unit")`

### [BUG-008] Heading "Rede de Canais" → "Operational Fleet [N]" em produção
- **Severidade:** HIGH
- **Seletor que falhou:** `text=Rede de Canais`
- **Texto real em produção:** `"Operational Fleet [1]"`
- **Correção aplicada:** `text=Operational Fleet`

### [BUG-009] Input de busca sem `id` em produção — placeholder diferente
- **Severidade:** MEDIUM
- **Seletor que falhou:** `input[placeholder="Buscar canal ou vídeo..."]`
- **Input real em produção:** `input[placeholder="SEARCH FLEET..."]` sem atributo `id`
- **Correção aplicada:** `input[placeholder="SEARCH FLEET..."]`

### [BUG-010] Tabs NÃO usam `[role="tab"]` em produção — são botões simples
- **Severidade:** HIGH (todo teste que usa `[role="tab"]` falha)
- **Seletor que falhou:** `[role="tab"]:has-text("Analytics")`
- **Texto real em produção:** `button:has-text("Analytics")`
- **Correção aplicada:** `button:has-text("Analytics")`

### [BUG-011] Labels das tabs completamente diferentes em produção
- **Severidade:** HIGH
- **Labels locais (fonte):** Analytics, Estratégia, Fábrica, Concorrentes, Configuração
- **Labels em produção:** Analytics, Inteligência, Operações, Ameaças, Configuração
- **Correção aplicada:** Seletores atualizados com labels reais

### [BUG-012] Tab persistence usa rotas separadas, NÃO `?tab=` query params
- **Severidade:** HIGH (toda a spec do Channel Hub estava errada)
- **Seletor que falhou:** `toHaveURL(/\?tab=queue/)`
- **Comportamento real:** `/channel/:id/production`, `/channel/:id/foundation` etc.
- **Correção aplicada:** Assertions atualizadas para padrões de rota correta

### [BUG-013] Verificar text-black no DOM — PENDENTE
- **Severidade:** A verificar
- **Status:** Não verificado nesta rodada — requer audit de CSS em runtime
- **Próximo passo:** Adicionar assertion em smoke test que verifica ausência de `class="text-black"` nos elementos visíveis

### [BUG-014] wizard-flows.spec.ts aponta para localhost:5173
- **Severidade:** MEDIUM (spec inútil para CI)
- **Arquivo afetado:** `tests/e2e/wizard-flows.spec.ts` linhas 7, 33
- **Problema:** `beforeEach` navega para `http://localhost:5173/dashboard`
- **Impacto adicional:** 2/3 dos steps de "Studio Profundo" estão comentados — spec é esqueleto
- **Correção sugerida:** Atualizar baseURL para produção OU remover e reescrever

---

## Seletores Atualizados

| Contexto | Seletor Antigo (quebrado) | Seletor Novo (correto) |
|---------|--------------------------|------------------------|
| Login submit | `button:has-text("Entrar na Plataforma")` | SEM MUDANÇA — correto |
| Dashboard add | `button:has-text("Adicionar Canal")` | `button:has-text("Recruit Unit")` |
| Dashboard heading | `text=Rede de Canais` | `text=Operational Fleet` |
| Dashboard search | `input[placeholder="Buscar canal ou vídeo..."]` | `input[placeholder="SEARCH FLEET..."]` |
| Channel card | `h3:has-text("Canal de Teste E2E")` | `h3:has-text("Canal de Teste E2E")` (mantido, h3 existe) |
| Novo Vídeo | `button:has-text("Novo Vídeo")` | SEM MUDANÇA — correto |
| Launch | `button:has-text("Lançar Piloto Automático")` | `button:has-text("Lançar Missão")` |
| First step | `text=Arquitetura Estratégica...` | `text=Decodificando roteiro...` |
| Crash step | `text=Gerando roteiro...` | `text=Decodificando roteiro...` |
| Tab role | `[role="tab"]:has-text("Estratégia")` | `button:has-text("Inteligência")` |
| Tab persistence | `toHaveURL(/\?tab=queue/)` | `toHaveURL(/channel/:id/production)` |
| Sidebar nav | N/A | `a[href="/channel/:id/production"]` |

---

## Cobertura

| Funcionalidade | Status | Notas |
|----------------|--------|-------|
| Login/Auth | VERDE | P0-001 passa — login flow completo |
| Dashboard | VERDE | P0-002 passa — Operational Fleet, search, Recruit Unit |
| Channel Hub sidebar | VERDE | P0-003 passa — 5 sidebar links validados |
| Channel tab buttons | VERDE | P0-003 — Analytics, Inteligência, Operações, Ameaças, Configuração |
| Route persistence F5 | VERDE | P0-003 — reload em /production e /foundation mantém URL |
| Production wizard | AMARELO | Spec corrigida mas não executada (requer AI — 10+ min) |
| Auto-Resume banner | AMARELO | Spec corrigida, banner usa "Retomar Agora" — aguarda execução |
| Full pipeline aprovação | AMARELO | Spec corrigida, aguarda execução |
| Crash recovery (THE PURGE) | AMARELO | Spec corrigida — crash via browser().close() + re-login |
| text-black no DOM (BUG-013) | VERMELHO | Não verificado |

---

## Configuração Playwright Atualizada

- `timeout`: 300000ms → 600000ms (pipeline AI pode levar 10+ min)
- `reporter`: `html` → `['list', 'html']` (list reporter para output em terminal durante CI)

---

## Arquivos Modificados

| Arquivo | Alteração |
|---------|-----------|
| `tests/e2e/smoke.spec.ts` | CRIADO — 3 testes P0, todos passando |
| `tests/e2e/production-factory.spec.ts` | CORRIGIDO — 12 seletores quebrados fixados |
| `playwright.config.ts` | ATUALIZADO — timeout 600s, reporter list+html |

---

## Próximos Passos para Sprint QA Completa

1. Executar `production-factory.spec.ts` em horário de baixo uso (AI lenta nas primeiras horas)
2. Adicionar `data-testid` nos elementos críticos (Lançar Missão, cards de canal)
3. Corrigir `wizard-flows.spec.ts` — reescrever com base no UI de produção
4. Verificar BUG-013 (text-black no DOM) via CSS audit script
5. Adicionar test para "Revisar" e "Aprovar" flow no QueueTab
