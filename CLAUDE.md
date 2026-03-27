# AutoDark Studio

> Plataforma web SaaS para automatizar produção de vídeos para YouTube — da ideia ao vídeo montado em ~20 minutos.

---

## Rápido Setup (novo membro ou máquina nova)

```bash
# 1. Instalar dependências
npm install

# 2. Variáveis de ambiente
cp .env .env.local   # .env já tem os valores de dev — NÃO commitar

# 3. Rodar em desenvolvimento
npm run dev          # http://localhost:5173
```

> **Primeira vez aqui?** Leia as seções "Auth", "Edge Functions" e "Armadilhas Conhecidas"
> antes de mexer em qualquer coisa.

---

## MCP Supabase deste projeto

**Cada projeto tem sua própria conta Supabase isolada. Nunca misture tokens.**

- **Projeto:** AutoDark Studio
- **Project ID:** `bwitfpvqruwikpuaiurc`
- **URL:** `https://bwitfpvqruwikpuaiurc.supabase.co`
- **Anon key:** variável `VITE_SUPABASE_PUBLISHABLE_KEY` no `.env`
- **MCP:** já habilitado em `.claude/settings.json` — servidor `supabase`
- **⛔ NUNCA usar token de outro projeto aqui.**

---

## Stack

| Camada | Tecnologia | Observação |
|--------|-----------|------------|
| Frontend | React 18 + Vite + TypeScript | SPA pura, sem SSR |
| UI | shadcn/ui + Radix + Tailwind | componentes em `src/components/ui/` |
| Roteamento | React Router v6 | App Router–style com lazy loading |
| Estado server | TanStack Query v5 | `staleTime: 5min`, `refetchOnWindowFocus: false` |
| Auth | Supabase Auth | email/senha + Google OAuth, sessão em localStorage |
| Banco | Supabase Postgres | RLS habilitado em todas as tabelas |
| Edge Functions | Supabase (Deno) | 10 funções — todas com `verify_jwt = false` |
| Video preview | Remotion 4 | player embed, não rendering server-side |
| Video assembly | @ffmpeg/ffmpeg 0.12 | roda no browser via WASM |
| Deploy | Vercel | branch `main` = produção; rewrites em `vercel.json` |

---

## Estrutura de Pastas

```
src/
  App.tsx                 → raiz: providers, BrowserRouter, rotas protegidas
  main.tsx                → entry point
  pages/
    Login.tsx             → rota pública "/"
    Dashboard.tsx         → lista de canais do usuário
    Channel/Index.tsx     → visão de um canal (métricas, conteúdos)
    ChannelPrompts.tsx    → configurar prompts do canal
    Foundation/Index.tsx  → "fundação" do canal (persona, nicho, directives)
    Production/Index.tsx  → wizard 8-steps para produzir um vídeo (PRINCIPAL)
    LongVideoStudio.tsx   → studio alternativo para vídeos longos
    Pipeline/Index.tsx    → pipeline global de conteúdos
    MediaHub/Index.tsx    → hub de mídias (imagens, áudio gerados)
  components/
    layouts/AppLayout.tsx → wrapper autenticado com header + Outlet
    ui/                   → shadcn/ui (NÃO editar manualmente)
    Channel/              → componentes da visão de canal
    Dashboard/            → cards do dashboard
    Strategy/             → componentes de estratégia de conteúdo
    YouTube/              → componentes de métricas YouTube
  agents/
    types.ts              → tipos compartilhados do pipeline de vídeo
    llm.ts                → helpers: callClaude, callTTS, callImageGeneration
    headAgent.ts          → orquestrador geral do pipeline
    pipelineOrchestrator.ts → execução sequencial das etapas
    scripterAgent.ts      → geração de roteiro por capítulos
    narratorAgent.ts      → narração / TTS
    trendAgent.ts         → análise de tendências YouTube
    seoAgent.ts           → título, descrição, tags para YouTube
    visualAgent.ts        → geração de imagens para cenas
    tts.ts                → wrapper TTS (Google / AI33 / browser)
  hooks/
    useAuth.tsx           → AuthContext + Provider (signIn, signUp, signOut)
    useChannels.tsx       → CRUD canais
    useBlueprint.tsx      → config do canal (blueprint)
    useContentPipeline.tsx → pipeline de conteúdos
    usePipeline.tsx       → estado do pipeline de vídeo
    useVideoAssembler.tsx  → montagem FFmpeg no browser
    useFFmpegExport.tsx   → exportação final do vídeo
    useHeadAgent.tsx      → hook para orquestrar o HeadAgent
    useGlobalQueue.tsx    → fila de gerações em paralelo
    useGenerationLogger.ts → log de etapas do pipeline
  integrations/supabase/
    client.ts             → `supabase` client (ÚNICO — não criar outros)
    types.ts              → tipos gerados automaticamente do schema
  lib/
    utils.ts              → cn(), helpers gerais
    videoStorage.ts       → salvar/carregar vídeos no Supabase Storage
    mock-data.ts          → dados mock para dev/demo mode

supabase/
  config.toml             → project_id + portas locais + Edge Function flags
  migrations/             → migrations em ordem cronológica
  functions/              → Edge Functions em Deno/TypeScript
    chat-completions/     → proxy LLM (AI33 → OpenRouter fallback)
    generate-ideas/       → geração de ideias de vídeo
    generate-script/      → geração de roteiro
    generate-strategy/    → estratégia de conteúdo
    generate-directives/  → directives personalizadas do canal
    generate-video-scenes/→ cenas a partir do script
    generate-scene-images/→ imagens para cada cena
    generate-kie-flow/    → geração de imagens via Kie.ai
    process-content-audio/→ processamento TTS server-side
    youtube-generate-audio/→ TTS Google ou AI33
    youtube-long-engine/  → engine para vídeos longos
    scrape-youtube-channel/→ scraping via Apify
    sync-youtube-metrics/ → sync métricas YouTube
```

---

## Auth

- **Provider:** Supabase Auth
- **Métodos:** email + senha, Google OAuth
- **Hook central:** `useAuth()` em `src/hooks/useAuth.tsx`
- **Proteção de rotas:** `ProtectedRoute` / `PublicRoute` em `App.tsx`
- **Sessão:** persiste em `localStorage` (não cookies — é SPA pura)
- **Redirect pós-login:** `/dashboard`
- **userName:** `user.user_metadata.full_name || email.split('@')[0]`

```typescript
// Como usar em qualquer componente:
import { useAuth } from "@/hooks/useAuth";
const { user, signOut, userName } = useAuth();
```

---

## Banco de Dados (Supabase Postgres)

**Todas as tabelas têm RLS habilitado.** A função helper `owns_channel(channel_id)` verifica ownership via `auth.uid()`.

| Tabela | Descrição | Chave |
|--------|-----------|-------|
| `channels` | Canais do usuário | `user_id` → auth |
| `channel_blueprints` | Config de produção (persona, voz, estilo) | `channel_id` (1:1) |
| `channel_metrics` | Métricas históricas do canal | `channel_id` |
| `channel_contents` | Conteúdos/vídeos (com `scenes JSONB`, `render_status`) | `channel_id` |
| `channel_foundations` | Fundação estratégica do canal | `channel_id` |
| `video_generations` | Histórico de gerações para restauro | `user_id` + `channel_id` |

> **Migration nova?** Crie sempre via `supabase/migrations/YYYYMMDDHHMMSS_nome.sql`. Nunca edite migrations existentes.

---

## Edge Functions

Todas as funções estão em `supabase/functions/` e usam `verify_jwt = false` (sem auth JWT na requisição).

**Como chamar do frontend:**
```typescript
import { supabase } from "@/integrations/supabase/client";

const { data, error } = await supabase.functions.invoke("chat-completions", {
  body: { systemPrompt, userPrompt, requireJson: true }
});
```

**LLM helper centralizado:** `src/agents/llm.ts`
- `callClaude()` → sempre chama Edge Function `chat-completions` (nunca API direta)
- `callTTS()` → chama `youtube-generate-audio` (Google TTS ou AI33)
- `callImageGeneration()` → Kie.ai (via Edge Function) → Pollinations.ai (fallback) → Canvas offline

---

## Variáveis de Ambiente

```bash
# LLMs
VITE_AI33_API_KEY=sk_...          # AI33 Pro (LLM primário, proxy /api-ai)
VITE_OPENROUTER_API_KEY=sk-or-... # OpenRouter (fallback)

# Imagens
VITE_KIE_API_KEY=...              # Kie.ai para imagens

# Supabase
VITE_SUPABASE_URL=https://bwitfpvqruwikpuaiurc.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJ...  # anon key, segura para frontend
VITE_SUPABASE_PROJECT_ID=bwitfpvqruwikpuaiurc

# Server-side (apenas Edge Functions / scripts Node)
APIFY_API_TOKEN=...   # scraping YouTube
OPENROUTER_API_KEY=... # sem prefixo VITE → só Node/Deno
AI33_API_KEY=...
KIE_API_KEY=...
```

> ⚠️ O `.env` atual contém chaves reais — **nunca commitar**. Está em `.gitignore`.

---

## Proxies de API (dev vs produção)

Em dev (`npm run dev`), o Vite faz proxy via `vite.config.ts`:
```
/api-ai       → https://api.ai33.pro
/api-kie      → https://api.kie.ai
/api-pollinations → https://image.pollinations.ai
/api-tts      → https://translate.google.com
/api-streamelements → https://api.streamelements.com
```

Em produção (Vercel), os mesmos rewrites ficam em `vercel.json`.

**Regra:** Code sempre usa caminhos relativos (`/api-ai/...`), nunca URLs absolutas hardcodadas.

---

## Pipeline de Produção de Vídeo (8 Steps)

Arquivo principal: `src/pages/Production/Index.tsx`

```
Step 1: Definir tópico + sumário
Step 2: Aprovar sumário e capítulos
Step 3: Gerar roteiros por capítulo    ← BUG ATIVO (ver Armadilhas)
Step 4: Gerar áudio/narração TTS
Step 5: Extrair cenas do script
Step 6: Gerar imagens por cena
Step 7: Montar vídeo (FFmpeg WASM)
Step 8: SEO (título, descrição, tags)
```

O estado do pipeline fica em `localStorage` → pode fechar o browser e retomar.

Orquestração: `src/agents/pipelineOrchestrator.ts` → chama agentes em sequência.

---

## Armadilhas Conhecidas

### P0 — Bug Crítico: Geração de Roteiros falha silenciosamente
- **Onde:** `Production/Index.tsx` → `handleGenerateAllScripts()` (em torno da linha 535)
- **Sintoma:** Usuário clica "Gerar Roteiros (3 capítulos)" → nada acontece, step permanece em 2
- **Causa:** Erro capturado sem toast/feedback visível
- **Debug:** DevTools Console + Network tab ao clicar o botão; verificar se `/api-ai` responde
- **Fix pendente:** Adicionar `try/catch` com `toast.error()` visível

### Edge Functions sem JWT
- Todas as Edge Functions têm `verify_jwt = false` — qualquer um com a URL pode chamar
- Segurança depende das RLS policies no banco, não do JWT nas funções

### FFmpeg WASM — primeira carga
- `@ffmpeg/ffmpeg` baixa ~30MB de WASM no primeiro uso
- Em desenvolvimento pode demorar ou falhar se o servidor não servir os headers COOP/COEP corretamente
- Vite já está configurado para isso; em produção o Vercel também

### Supabase client — único arquivo
- O client Supabase fica em `src/integrations/supabase/client.ts` (gerado pelo Lovable)
- **Nunca criar um segundo `createClient()`** — sempre importar deste arquivo

### `tmp_old_*.tsx` na raiz
- Arquivos legados de refatorações anteriores. Não são importados em lugar nenhum.
- Podem ser deletados com segurança se necessário.

### Remotion vs FFmpeg
- **Remotion** (`@remotion/player`): apenas para preview no browser
- **FFmpeg WASM**: para a montagem/exportação real do vídeo
- Não confundir os dois — são responsabilidades diferentes

---

## Como rodar migrações

```bash
# Aplicar migrations no projeto remoto
supabase db push

# Ou via Supabase Dashboard → SQL Editor (colar o conteúdo do .sql)
# Ver APPLY_MIGRATION.md para instruções detalhadas
```

---

## Deploy

- **Produção:** Vercel, branch `main`
- **Preview:** qualquer push para branch feature cria preview automático no Vercel
- **Sem CI/CD de testes** configurado ainda — testar manualmente antes de merge

---

## Documentação Interna

| Arquivo | Conteúdo |
|---------|----------|
| `KNOWLEDGE_BASE.md` | Enciclopédia completa do sistema (agentes, APIs, bugs históricos) |
| `EXEC-SUMMARY.md` | Status executivo em 2026-03-19 (score card, riscos) |
| `ROADMAP-FIXES-PRIORITARIOS.md` | Lista de bugs P0/P1 com passos de debug |
| `RELATORIO-TESTE-END-TO-END.md` | Relatório de teste completo do fluxo |
| `MISSIONS.md` | Missões/sprints planejados |
| `DEBUG-QUICK-START.md` | Guia de debug rápido |
| `APPLY_MIGRATION.md` | Como aplicar migrations no Supabase |
