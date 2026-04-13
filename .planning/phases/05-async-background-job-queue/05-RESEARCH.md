# Phase 5: Arquitetura Assíncrona (Background Job Queue) — Research

**Pesquisado:** 2026-04-12
**Domínio:** Supabase Edge Functions, Realtime, JSONB Schema, State Machine React
**Confiança:** HIGH (baseado em leitura direta do codebase)

---

## Resumo

O pipeline atual (`pipelineOrchestrator.ts`) executa tudo de forma síncrona dentro de um único `useCallback` (`runSemiAuto`), mantendo a conexão do browser aberta durante todo o processo de geração. A etapa mais lenta — geração de imagens via AI33 SeedDream (~2-4 minutos para lote de 20+ cenas) — é o gargalo crítico. Se o usuário fecha a aba ou ocorre timeout, todo o progresso de geração visual é perdido.

A fundação para a refatoração já existe: a tabela `production_states` tem colunas `scenes JSONB`, `total_scenes`, `completed_scenes`, e o hook `useProductionState` já implementa Realtime subscription. O que falta é: (1) persistir cada cena individualmente com status antes de gerar imagens, (2) criar uma Edge Function worker que processa lotes, (3) o frontend invocar esse worker em loop (ping-pong), e (4) o `useVideoAssembler` tolerar imagens temporariamente ausentes.

**Recomendação principal:** Implementar Opção A (ping loop no frontend) do `ASYNC_FLOW_PLAN.md` — mais simples, sem pg_cron, imediatamente testável. Não requer mudanças na infraestrutura do Supabase.

---

## Estado Atual do Codebase

### tabela `production_states` — Status de Migrations

**DESCOBERTA CRÍTICA:** A tabela `production_states` NÃO existe em nenhum arquivo `.sql` na pasta `supabase/migrations/`. [VERIFIED: grep em todos os .sql de migrations — nenhum resultado]

Ela foi criada diretamente no dashboard do Supabase (fora do controle de versão de migrations). A estrutura documentada no `PLAN-purge-and-scale.md` é:

```sql
-- Colunas confirmadas via código (useProductionState.ts + PLAN-purge-and-scale.md)
id UUID
channel_id UUID (UNIQUE)
user_id UUID
step NUMERIC
status TEXT
data JSONB
scenes JSONB DEFAULT '[]'
total_scenes INTEGER DEFAULT 0
completed_scenes INTEGER DEFAULT 0
updated_at TIMESTAMPTZ
```

**Implicação para o Plan 5.1:** A migration deve usar `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` (colunas podem já existir) e também deve CRIAR a migration formal que documenta o estado atual da tabela, caso ela ainda não exista no banco de produção. Usar `CREATE TABLE IF NOT EXISTS`.

### SceneSnapshot — Interface já definida

`useProductionState.ts` já define `SceneSnapshot` com os campos necessários: [VERIFIED: leitura direta]

```typescript
interface SceneSnapshot {
  chapterIndex: number;
  sceneIndex: number;
  status: "pending" | "audio_done" | "visual_done" | "complete" | "error";
  audioUrl?: string;
  imageUrl?: string;
  durationSec?: number;
  prompt?: string;
  errorMessage?: string;
}
```

**Gap para Phase 5:** Falta o campo `errorCount: number` mencionado no `ASYNC_FLOW_PLAN.md`. A interface atual tem `errorMessage` mas não contabiliza tentativas. O worker precisa de `errorCount` para decidir quando marcar como `fatal_error` (ex: 3 tentativas falharam).

### `saveScene()` — Existe mas NÃO está integrada no pipeline

`useProductionState.ts` exporta `saveScene()` que faz upsert granular por cena. [VERIFIED: leitura direta]

`pipelineOrchestrator.ts` recebe `saveProductionState` mas NÃO chama `saveScene()` em nenhum momento. [VERIFIED: leitura direta — `const { saveData: saveProductionState } = useProductionState(channelId)` — apenas `saveData` é desestruturado, `saveScene` é ignorado]

**Implicação para Plan 5.4:** A refatoração do orchestrator deve desestruturar também `saveScene` do hook.

### Edge Function `generate-image` — Como funciona a AI33

A função atual (`supabase/functions/generate-image/index.ts`) [VERIFIED: leitura direta]:
1. Submete tarefa para `https://api.ai33.pro/v1i/task/generate-image` com multipart/form-data
2. Retorna `task_id` imediatamente
3. Faz polling em loop (a cada 3s) por até 240s
4. Retorna `imageUrl` quando `status === "done"`
5. **Modelo:** `bytedance-seedream-4.5`, resolução 2K, aspect ratio 16:9

O tempo de polling total pode chegar a 240s por imagem. Com 5 imagens em `Promise.all`, o worker ficará dentro de ~240s (limite seguro para Edge Functions do Supabase).

**Implicação para Plan 5.2:** A nova Edge Function `worker-generate-visuals` pode reutilizar a lógica de `pollAI33ImageTask()` existente — copiar ou importar o padrão.

### `useVideoAssembler.tsx` — Ponto de falha atual

A linha crítica: [VERIFIED: leitura direta]

```typescript
img.onerror = () => reject(new Error(`Falha ao carregar imagem da cena ${i + 1}`));
```

Isso faz `Promise.reject` quando qualquer imagem falha, abortando toda a montagem. O Plan 5.5 pede substituir por placeholder silencioso.

### Realtime subscription — Já configurada

`useProductionState.ts` já assina `postgres_changes` em `production_states` filtrado por `channel_id`. [VERIFIED: leitura direta] Qualquer UPDATE feito pela Edge Function worker aparece automaticamente no frontend sem necessidade de polling adicional.

---

## Stack Padrão

### Core (já no projeto)
| Biblioteca | Versão | Propósito |
|------------|--------|-----------|
| @supabase/supabase-js | 2.98.0 | DB, Realtime, Edge Functions, Storage |
| React | 18.3.1 | UI e state machine via hooks |
| TypeScript | 5.8.3 | Tipagem das interfaces de cena |

### Edge Function (a criar)
| Tecnologia | Versão | Propósito |
|------------|--------|-----------|
| Deno (Supabase Edge) | Runtime atual | Worker `worker-generate-visuals` |
| @supabase/supabase-js npm | 2.39.3 | Padrão das outras funções no projeto |

### Não instalar nada novo
O projeto já tem todas as dependências necessárias. Nenhum pacote adicional é requerido.

---

## Padrões de Arquitetura

### Padrão 1: Worker Edge Function com Batch Claim

O padrão de "claim" (marcar como `processing` antes de processar) previne que múltiplas invocações simultâneas do worker processem a mesma cena:

```typescript
// Dentro da Edge Function worker-generate-visuals
// 1. Busca e clama atomicamente (UPDATE + RETURNING)
// Supabase não suporta SELECT FOR UPDATE em RPC simples,
// então o padrão seguro é:
// a) Buscar cenas pending
// b) Marcá-las como processing IMEDIATAMENTE antes de processar
// c) A verificação de race condition é: se já está 'processing', skip

const { data: state } = await supabase
  .from('production_states')
  .select('scenes, id')
  .eq('channel_id', channelId)
  .single();

const pending = state.scenes
  .filter(s => s.status === 'pending')
  .slice(0, 5);

// Marcar como processing antes de chamar AI
const updatedScenes = state.scenes.map(s =>
  pending.find(p => p.chapterIndex === s.chapterIndex && p.sceneIndex === s.sceneIndex)
    ? { ...s, status: 'processing' }
    : s
);
await supabase.from('production_states')
  .update({ scenes: updatedScenes })
  .eq('channel_id', channelId);

// Agora processar em paralelo (safe — já estão marcadas)
await Promise.all(pending.map(scene => generateAndSaveImage(scene)));
```

[ASSUMED] PostgreSQL transactions via Supabase REST não são equivalentes a `SELECT FOR UPDATE`. Para lock real seria necessário uma `FUNCTION` PL/pgSQL. Para uso single-tenant (um usuário por canal) o padrão acima é suficiente.

### Padrão 2: Frontend Ping Loop

```typescript
// No frontend — após salvar todas as cenas como 'pending'
const runVisualWorker = async (channelId: string) => {
  while (true) {
    const { data: state } = await supabase
      .from('production_states')
      .select('scenes')
      .eq('channel_id', channelId)
      .single();

    const hasPending = (state?.scenes ?? []).some(
      (s: SceneSnapshot) => s.status === 'pending' || s.status === 'processing'
    );

    if (!hasPending) break;

    await supabase.functions.invoke('worker-generate-visuals', {
      body: { channel_id: channelId }
    });

    // Pequena pausa para não saturar a API
    await new Promise(r => setTimeout(r, 2000));
  }
};
```

**Nota importante:** `supabase.functions.invoke()` aguarda a resposta da Edge Function. Isso significa que o loop aguarda cada batch terminar antes de invocar o próximo — comportamento correto.

### Padrão 3: State Machine no Orchestrator

Dividir `runSemiAuto` em etapas discretas controladas por `useEffect`:

```
Estado DB (production_states.step):
1 = queued
2 = script_done
2.5 = scenes_extracted (cenas salvas como pending)
3 = audio_done
4 = visuals_done (worker terminou)
4.5 = assembling
6 = done
```

```typescript
// Em vez de uma sequência imperativa longa,
// useEffect observa mudanças no step e avança
useEffect(() => {
  if (!productionState || productionState.status !== 'running') return;

  switch (productionState.step) {
    case 2.5:
      // Cenas salvas como pending — disparar worker loop
      runVisualWorker(channelId);
      break;
    case 4:
      // Visuals prontos — montar vídeo
      startAssembly();
      break;
  }
}, [productionState?.step]);
```

### Padrão 4: Realtime como Source of Truth

O `useProductionState` já tem Realtime configurado. O worker atualiza o banco, o banco notifica o frontend via Postgres Changes. O frontend NÃO precisa fazer polling — apenas o ping-loop para invocar o worker.

```
Frontend               Supabase DB             Edge Function Worker
    |                      |                          |
    |-- invoke worker ---->|                          |
    |                      |<------ update scenes ----|
    |<--- Realtime push ---|                          |
    | (UI atualiza)        |                          |
    |-- invoke worker ---->|                          |
    |                      |<------ update scenes ----|
    |<--- Realtime push ---|                          |
```

### Anti-patterns a evitar

- **Não usar pg_cron para Phase 5**: Requer setup manual no Supabase Dashboard, não é versionável em migrations, e a Opção A (ping loop) é equivalente para single-user. Manter como backlog.
- **Não processar > 5 cenas por invocação**: Edge Functions têm timeout. 5 × 240s (max poll time) = teórico máximo de 240s total com Promise.all, dentro do limite de 400s.
- **Não fazer polling de cenas no frontend**: Usar Realtime subscription já configurada no `useProductionState`.
- **Não alterar migrations aplicadas**: Sempre `CREATE TABLE IF NOT EXISTS` e `ADD COLUMN IF NOT EXISTS`.

---

## Não Implementar do Zero

| Problema | Não construir | Usar em vez disso |
|----------|---------------|-------------------|
| Polling AI33 task | Loop de polling customizado | Copiar `pollAI33ImageTask()` de `generate-image/index.ts` |
| Upload para Storage | Lógica de upload custom | `uploadImage()` de `src/lib/storage.ts` (já existe) |
| Realtime subscription | WebSocket manual | `useProductionState` já tem configurado |
| Persistência de cena | Lógica de upsert | `saveScene()` de `useProductionState` (já existe, só falta integrar) |
| Placeholder de imagem | Canvas custom no assembler | Imagem placeholder estática ou URL de fallback via `generateCanvasDarkImage()` já existente em `llm.ts` |

---

## Riscos e Armadilhas

### Armadilha 1: `production_states` não está em migration
**O que vai errar:** Se o banco de produção não tem a tabela criada, o Plan 5.1 falhará silenciosamente ou com erro 404.
**Raiz:** A tabela foi criada no dashboard, não via `supabase db push`.
**Como evitar:** Plan 5.1 deve incluir `CREATE TABLE IF NOT EXISTS production_states (...)` completo, com todas as colunas documentadas no `PLAN-purge-and-scale.md`, antes de adicionar as colunas novas de Phase 5.

### Armadilha 2: Race condition no worker (multiple tabs)
**O que vai errar:** Duas abas abertas podem invocar o worker simultaneamente, gerando imagens duplicadas e contando `errorCount` incorretamente.
**Raiz:** Falta de lock atômico no banco.
**Como evitar:** O padrão de marcar `status='processing'` atomicamente ANTES de processar (veja Padrão 1 acima). Se uma cena já está `processing`, o segundo worker a ignora. Adicionar check: `filter(s => s.status === 'pending')` — not `processing`.

### Armadilha 3: `errorCount` ausente na SceneSnapshot atual
**O que vai errar:** Worker não tem como saber quantas vezes já tentou gerar uma cena — pode tentar infinitamente.
**Raiz:** Interface `SceneSnapshot` em `useProductionState.ts` não tem `errorCount`.
**Como evitar:** Plan 5.1 deve adicionar `errorCount: number` na interface TypeScript e na coluna JSONB. O worker incrementa `errorCount` em cada falha e marca `status='error'` quando `errorCount >= 3`.

### Armadilha 4: Ping loop não para se o usuário fecha a aba
**O que vai errar:** Se o usuário fecha a aba DURANTE o ping loop, o loop para. Cenas em `processing` ficam travadas nesse status indefinidamente.
**Raiz:** O loop é client-side — depende do browser estar aberto.
**Como evitar:** Dois mecanismos: (1) O worker deve ter timeout de `processing` — se uma cena está `processing` por mais de 5 minutos, resetar para `pending` (auto-recovery). (2) Na abertura da Production page, verificar se há cenas em `processing` e retomar o ping loop. Esse comportamento de recovery já existe parcialmente no Auto-Resume do `QueueTab.tsx`.

### Armadilha 5: `useVideoAssembler` quebra com imagens do Storage
**O que vai errar:** Imagens salvas no Supabase Storage têm CORS configurado — `img.crossOrigin = "anonymous"` já está no assembler, mas se a URL for de outro domínio sem CORS header correto, vai falhar.
**Raiz:** `useVideoAssembler` já tem `img.crossOrigin = "anonymous"` [VERIFIED: linha 159] — isso está correto para Storage do Supabase. O problema é o `img.onerror = () => reject(...)` — uma falha cancela tudo.
**Como evitar:** Plan 5.5 deve substituir `reject` por `resolve` com URL de placeholder (usar `generateCanvasDarkImage()` já existente em `llm.ts`).

### Armadilha 6: `saveScene()` não está sendo usada — integração não é trivial
**O que vai errar:** `saveScene()` usa o estado local `state?.scenes` para fazer merge. Se o orchestrator chamar `saveScene` concorrentemente durante o audio loop, pode haver race conditions no merge.
**Raiz:** `saveScene` em `useProductionState.ts` faz read-merge-write — não é atomic.
**Como evitar:** Para Phase 5, `saveScene()` é usada apenas para salvar cenas como `pending` ANTES de invocar o worker. O worker então usa o Supabase client direto (service role) para atualizar — não usa o hook React.

---

## Recomendações por Plan

### Plan 5.1 — Migration DB

**O que fazer:**
1. Criar migration `YYYYMMDDHHMMSS_async_scene_queue.sql`
2. Conteúdo deve ser defensivo (`IF NOT EXISTS`):

```sql
-- Garantir tabela production_states existe (criada manualmente antes)
CREATE TABLE IF NOT EXISTS public.production_states (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  channel_id UUID UNIQUE REFERENCES public.channels(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  step NUMERIC DEFAULT 1,
  status TEXT DEFAULT 'idle',
  data JSONB DEFAULT '{}',
  scenes JSONB DEFAULT '[]',
  total_scenes INTEGER DEFAULT 0,
  completed_scenes INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.production_states ENABLE ROW LEVEL SECURITY;

-- RLS se não existir
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'production_states' AND policyname = 'production_states_owner'
  ) THEN
    CREATE POLICY "production_states_owner"
      ON public.production_states FOR ALL
      USING (auth.uid() = user_id);
  END IF;
END $$;
```

3. A interface TypeScript `SceneSnapshot` em `useProductionState.ts` deve ganhar `errorCount?: number`
4. Não alterar a estrutura JSONB das cenas já existentes — os novos campos são opcionais

**Risco:** A tabela pode não existir no banco de produção se nunca foi `supabase db push`ada. O `CREATE TABLE IF NOT EXISTS` cobre isso.

### Plan 5.2 — Edge Function `worker-generate-visuals`

**Estrutura recomendada:**

```
supabase/functions/worker-generate-visuals/index.ts
```

**Lógica:**
1. Recebe `{ channel_id: string }` no body
2. Usa `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` (não anon key — precisa contornar RLS para atualizar cenas do servidor)
3. Busca `production_states` pelo `channel_id`
4. Filtra `scenes` onde `status === 'pending'`, pega no máximo 5
5. Atualiza essas 5 para `status: 'processing'` IMEDIATAMENTE
6. `Promise.all` para gerar as 5 imagens via `pollAI33ImageTask()` (copiar de `generate-image`)
7. Para cada resultado: upload para Storage bucket `images`, atualizar cena com `status: 'done'` + `imageUrl`
8. Para cada erro: incrementar `errorCount`, se `errorCount >= 3` marcar `status: 'error'`, senão voltar para `status: 'pending'`
9. Atualizar `completed_scenes` = count de cenas `done`

**Autenticação no worker:** Usar `SUPABASE_SERVICE_ROLE_KEY` para poder ler/escrever `production_states` sem depender do token do usuário (que pode expirar). [ASSUMED] A chave service role está disponível como `Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")` em todas as Edge Functions do Supabase.

**Timeout safety:** 5 cenas × (submit ~1s + poll até 240s) com `Promise.all` = máximo ~240s. Dentro do limite seguro de 400s das Edge Functions do Supabase. [ASSUMED: limite de 400s — verificar no dashboard do Supabase se necessário]

### Plan 5.3 — Frontend Ping Loop

**Localização:** Criar função `runVisualWorker(channelId)` fora do React (arquivo utilitário ou dentro do orchestrator como callback separado).

**Comportamento esperado:**
- Invocar após `saveProductionState(2.5, ...)` (cenas salvas como pending)
- Loop continua enquanto houver `pending` OU `processing`
- Termina quando todas as cenas são `done` ou `error`
- UI já atualiza via Realtime — loop é apenas o gatilho do worker

**Tratamento de fechamento de aba:** No `useEffect` cleanup do componente de Production, NÃO cancelar o loop com AbortController — deixar o worker atual terminar. Ao remount, verificar `processing` e retomar se necessário.

### Plan 5.4 — Refatorar pipelineOrchestrator

**Mudanças necessárias em `runSemiAuto`:**

1. Após `extractScenes()` (step 2.5), salvar cada cena como `SceneSnapshot` com `status: 'pending'` usando `saveScene()`:

```typescript
// Após chaptersWithScenes
const allScenes = chaptersWithScenes.flatMap((ch, ci) =>
  ch.scenes.map((scene, si) => ({
    chapterIndex: ci,
    sceneIndex: si,
    status: 'pending' as const,
    prompt: scene.visual_prompt,
    durationSec: scene.durationSec,
  }))
);

for (const sceneSnap of allScenes) {
  await saveScene(sceneSnap, allScenes.length);
}
```

2. Remover `generateVisuals()` do fluxo síncrono do `runSemiAuto` — a geração visual agora é responsabilidade do worker.

3. Após salvar cenas, invocar `runVisualWorker(channelId)` — que retorna uma Promise que resolve quando a fila esvazia.

4. Após o worker terminar, ler as cenas atualizadas do banco (não da memória React) para montar o vídeo.

**Importante:** `runSemiAuto` ainda aguarda o worker terminar (via Promise) — o que muda é que o browser pode ser fechado e reaberto sem perder progresso, pois o worker atualiza o DB. O "background" é relativo ao estado React, não ao browser.

### Plan 5.5 — Ajustar useVideoAssembler

**Mudança 1 — img.onerror:**

```typescript
// Antes:
img.onerror = () => reject(new Error(`Falha ao carregar imagem da cena ${i + 1}`));

// Depois:
img.onerror = () => {
  // Usar placeholder dark cinematográfico ao invés de abortar
  const placeholderUrl = generatePlaceholderForScene(scenes[i]);
  img.src = placeholderUrl; // tenta com placeholder
  // Se placeholder também falhar, resolve com canvas em branco
  img.onerror = () => {
    console.warn(`[assembler] Cena ${i + 1} sem imagem — usando canvas fallback`);
    resolve(); // Não rejeitar — continuar montagem
  };
};
```

**Mudança 2 — Guard de cenas essenciais:**

Antes de iniciar a montagem, verificar que a maioria das cenas tem `imageUrl`:

```typescript
const scenesReady = scenes.filter(s => s.imageUrl && s.imageUrl !== '');
if (scenesReady.length < scenes.length * 0.8) {
  throw new Error(`Apenas ${scenesReady.length}/${scenes.length} cenas prontas — aguardando worker`);
}
```

**Importante:** O chamador de `assembleVideo()` deve verificar o estado das cenas ANTES de chamar — não deixar o assembler descobrir no meio da montagem.

---

## Inventário de Estado em Runtime

> Esta fase inclui evolução de schema JSONB — responder explicitamente cada categoria.

| Categoria | Itens encontrados | Ação necessária |
|-----------|-------------------|-----------------|
| Dados armazenados | `production_states.scenes JSONB` — cenas existentes têm `SceneSnapshot` sem `errorCount` | Migração tolerante: `errorCount` é opcional, worker trata ausência como `0` |
| Config de serviço live | Nenhuma — Edge Functions não têm config externa fora de secrets | Nenhuma |
| Estado registrado no OS | Nenhum — não há cron, scheduler ou service registrado | Nenhuma |
| Secrets/env vars | `AI33_API_KEY` já está nos secrets do Supabase (usada em `generate-image`) | Reutilizar — não criar nova variável |
| Artefatos de build | Nenhum — Edge Functions são deployadas via `supabase functions deploy` | Novo deploy necessário para `worker-generate-visuals` |

---

## Disponibilidade de Ambiente

| Dependência | Requerida por | Disponível | Versão | Fallback |
|-------------|---------------|------------|--------|----------|
| Supabase Edge Functions | Plans 5.2, 5.3 | Verificar deploy | Deno runtime | Nenhum |
| AI33_API_KEY (Supabase secret) | Plan 5.2 (worker) | Provável — usada em `generate-image` | N/A | Pollinations.ai (já em `callImageGeneration`) |
| Supabase Realtime | Plan 5.4 | Sim — já configurado no hook | Supabase atual | Polling com setInterval |
| Storage bucket `images` | Plan 5.2 (upload) | Provável — usado em `uploadImage()` | N/A | URL direta da AI33 (sem upload) |

**Dependências faltando sem fallback:** Nenhuma identificada. O cenário mais arriscado é `AI33_API_KEY` não configurada no worker — mas o fallback para Pollinations.ai já existe em `callImageGeneration()`.

---

## Arquitetura de Validação

> nyquist_validation não foi identificado como `false` no config — seção incluída.

### Framework de Testes
| Propriedade | Valor |
|-------------|-------|
| Framework | Playwright 1.59.1 |
| Arquivo de config | playwright.config.ts (verificar existência) |
| Comando rápido | `npx playwright test --headed` |
| Suite completa | `npx playwright test` |

### Mapeamento de Requisitos para Testes

| Req | Comportamento | Tipo de Teste | Automação Possível |
|-----|---------------|---------------|-------------------|
| 5.1 | Migration aplicada sem erros | Smoke | Verificar via `supabase db push` sem erros |
| 5.2 | Worker processa 5 cenas e atualiza DB | Integration | Playwright — mock AI33, verificar DB update |
| 5.3 | Loop para quando fila esvazia | Unit | Vitest (se disponível) ou Playwright |
| 5.4 | F5 após cenas salvas retoma pipeline | E2E | Playwright — reload da página durante step 2.5 |
| 5.5 | Montagem não aborta com imagem faltante | Unit | Jest/Vitest mock de img.onerror |

### Gaps Wave 0
- [ ] Não há testes unitários para `pipelineOrchestrator` — escopo para verificação manual
- [ ] `worker-generate-visuals` precisará de teste de integração com AI33 mockado

---

## Domínio de Segurança

### Categorias ASVS Aplicáveis

| Categoria ASVS | Aplica | Controle |
|----------------|--------|---------|
| V2 Autenticação | Sim | Worker deve validar `channel_id` pertence ao usuário (via RLS ou verificação explícita) |
| V4 Controle de Acesso | Sim | RLS em `production_states` — um usuário não deve disparar worker de outro canal |
| V5 Validação de Input | Sim | `channel_id` deve ser UUID válido no worker |
| V6 Criptografia | Não | Não aplicável nesta fase |

### Ameaças conhecidas neste stack

| Padrão | STRIDE | Mitigação |
|--------|--------|-----------|
| Worker invocado com `channel_id` de outro usuário | Spoofing | RLS garante que o worker só lê cenas do canal autorizado — usar service role apenas internamente, validar ownership explicitamente |
| AI33 retorna URL de imagem maliciosa | Tampering | URL é salva no DB e carregada pelo browser — `img.crossOrigin = "anonymous"` já presente; não há execução do conteúdo |
| Ping loop infinito (bug no worker) | DoS (self) | Limite máximo de iterações: `while (attempts++ < 50)` no loop |

---

## Log de Suposições

| # | Afirmação | Seção | Risco se errado |
|---|-----------|-------|-----------------|
| A1 | `SUPABASE_SERVICE_ROLE_KEY` está disponível como env var nas Edge Functions | Plan 5.2 | Worker não consegue bypassar RLS — usar anon key com token do usuário passado no body como alternativa |
| A2 | Timeout de Edge Functions do Supabase é ~400s | Plan 5.2 / Armadilha | Worker pode ser morto antes de terminar 5 imagens — reduzir para 3 imagens por batch |
| A3 | Storage bucket `images` já existe e permite upload | Plan 5.2 | Upload falha — criar bucket ou usar URL direta da AI33 |
| A4 | `production_states` existe no banco de produção com as colunas documentadas | Plan 5.1 | Migration deve ser mais agressiva em criar a tabela do zero |
| A5 | pg_cron não está disponível no plano Supabase atual | Padrão / Alternativa B | Se disponível, permite true background sem necessidade do ping loop |

---

## Exemplos de Código Verificados

### Padrão AI33 Image Task (da Edge Function existente)

```typescript
// Source: supabase/functions/generate-image/index.ts (VERIFIED)
async function pollAI33ImageTask(taskId, apiKey, timeoutMs = 240_000, intervalMs = 3_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const res = await fetch(`https://api.ai33.pro/v1/task/${taskId}`, {
      headers: { "xi-api-key": apiKey },
    });
    const task = await res.json();
    if (task.status === "done") {
      const url = task.metadata?.result_images?.[0]?.imageUrl
        ?? task.metadata?.result_images?.[0]?.previewUrl;
      if (!url) throw new Error("AI33: task done but no image URL");
      return url;
    }
    if (task.status === "error") throw new Error(task.error_message ?? "AI33 image task failed");
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  throw new Error("AI33 image: timeout after 240s");
}
```

### Padrão saveScene (já implementado, só integrar)

```typescript
// Source: src/hooks/useProductionState.ts (VERIFIED)
const saveScene = async (patch: SceneSnapshot, totalScenes?: number) => {
  // ... faz upsert no array scenes JSONB por chapterIndex+sceneIndex
};
// Usar após extractScenes para salvar todas as cenas como 'pending'
```

### Padrão Realtime já configurado

```typescript
// Source: src/hooks/useProductionState.ts linhas 79-96 (VERIFIED)
supabase.channel(`production-state-${channelId}`)
  .on("postgres_changes", { event: "*", schema: "public",
    table: "production_states", filter: `channel_id=eq.${channelId}` },
    (payload) => setState(payload.new as ProductionState)
  ).subscribe();
// Esta subscription já está ativa — o worker só precisa fazer UPDATE no banco
```

---

## Estado da Arte

| Abordagem Antiga | Abordagem Atual | Impacto |
|-----------------|-----------------|---------|
| `generateVisuals()` síncrono no browser | Worker Edge Function com batch | Pipeline sobrevive ao fechar aba |
| Estado em memória React | JSONB por cena no banco | Auto-resume granular |
| `img.onerror = reject` | `img.onerror = placeholder` | Montagem tolerante a falhas |
| `runSemiAuto` monolítico | State machine por step com Realtime | UI reativa sem polling |

---

## Fontes

### Primárias (HIGH — leitura direta do codebase)
- `src/agents/pipelineOrchestrator.ts` — fluxo completo de `runSemiAuto`
- `src/hooks/useProductionState.ts` — schema `SceneSnapshot`, Realtime, `saveScene()`
- `src/hooks/useVideoAssembler.tsx` — ponto de falha em `img.onerror`
- `src/agents/visualAgent.ts` — `generateVisuals()` atual com CONCURRENCY=4
- `src/agents/llm.ts` — `callAI33Image()`, `pollAI33ImageTask()`, fallbacks
- `supabase/functions/generate-image/index.ts` — integração AI33 SeedDream completa
- `ASYNC_FLOW_PLAN.md` — design original do owner para esta arquitetura
- `PLAN-purge-and-scale.md` — schema `production_states` documentado
- `src/integrations/supabase/types.ts` — ausência de `production_states` confirma que não está em migration formal

### Secundárias (MEDIUM)
- `.planning/codebase/ARCHITECTURE.md` — data flow e agent roles
- `.planning/codebase/CONCERNS.md` — `MEDIUM-02`: saveScene não integrado confirmado
- `.planning/codebase/STACK.md` — versões de dependências

---

## Metadados

**Breakdown de confiança:**
- Schema DB / migrations: HIGH — leitura direta de todos os .sql files
- Comportamento atual do orchestrator: HIGH — leitura direta dos arquivos TypeScript
- Limites de Edge Functions: MEDIUM (A2 assumido, verificar no dashboard)
- Disponibilidade de secrets no worker: MEDIUM (A1 assumido, padrão do Supabase)
- Race conditions em multi-tab: MEDIUM — análise teórica, não testado

**Data da pesquisa:** 2026-04-12
**Válido até:** 2026-05-12 (stack estável)

---

## RESEARCH COMPLETE
