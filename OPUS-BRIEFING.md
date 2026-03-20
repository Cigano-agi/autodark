# BRIEFING PARA OPUS 4.6 — AutoDark

> Cole este documento inteiro no início da conversa com o Opus.
> Após ler, o Opus deve começar pela **Missão 0** sem pedir confirmação.

---

## Quem você é e o que você está fazendo

Você é **Opus 4.6**, responsável pelas missões complexas do projeto **AutoDark** — uma plataforma SaaS de geração automatizada de vídeos longos para YouTube.

O Sonnet já concluiu as missões de UX/UI (M2, M4, M6). Agora é a sua vez de implementar as missões técnicas pesadas: layout, wizard de vídeo, engine de render com Remotion e o pipeline de agentes.

---

## Stack

```
React + TypeScript + Vite + Tailwind + shadcn/ui
Supabase (auth, DB, Edge Functions) — projeto: mldbflihdejmddmapwnz
AI-33 Pro (gateway de LLMs — chave em VITE_AI33_API_KEY)
Kie.ai (imagens — FLUX, DALL-E — chave em VITE_KIE_API_KEY)
OpenRouter (fallback LLM — chave em VITE_OPENROUTER_API_KEY)
```

**Diretório de trabalho:** `C:\Users\Fabricio Padrin\Downloads\autodark\src`
**Raiz do projeto:** `C:\Users\Fabricio Padrin\Downloads\autodark`

---

## Design System (OBRIGATÓRIO em tudo que você criar)

```
Fundo: bg-background | bg-card/30 backdrop-blur
Bordas: border-white/10 | border-white/5
Texto: text-white | text-muted-foreground
Cards: rounded-2xl bg-card/30 backdrop-blur border border-white/10
Header: DashboardHeader fixo — pt-28 no conteúdo de cada página
BeamsBackground: wrapper externo nas páginas principais (Dashboard, ChannelView)
Estilos: glassmorphism dark — NUNCA usar zinc-*, slate-* ou gray-*
```

---

## Estado Atual do Projeto

### O que o Sonnet fez (concluído)

| Missão | Status | O que foi feito |
|--------|--------|-----------------|
| M2 — Media Hub | ✅ | `src/pages/MediaHub/Index.tsx` — catálogo de vozes/imagens/vídeo com preços BRL, calculadora de custo, storage key `autodark_hub_defaults_v2` |
| M4 — Publicação e Revisão | ✅ | `src/components/Channel/ReviewQueue.tsx` — fila de revisão no ChannelView com approve/reject/publish modal |
| M6 — Multi-canal | ✅ | `src/hooks/useGlobalQueue.tsx` + `src/components/Dashboard/GlobalQueueSection.tsx` — fila global no Dashboard, badges de status no ChannelFolder |

### Rotas atuais em App.tsx

```
/ → Login
/dashboard → Dashboard
/channel/:id → ChannelView
/channel/:id/prompts → ChannelPrompts
/channel/:id/studio → LongVideoStudio
/channel/:id/production → ProductionWizard  ← Sonnet já adicionou esta rota
/production → ProductionWizard (legado — ainda existe, você vai redirecionar)
/channel/:id/foundation → FoundationPage
/pipeline → PipelinePage
/hub → MediaHub
/fix → FixAndVerify (rota de debug — você vai remover)
```

### Problema: DashboardHeader duplicado em cada página

Cada página importa e renderiza `<DashboardHeader />` manualmente. **Missão 0 resolve isso.**

---

## Suas Missões (em ordem)

### 🔴 MISSÃO 0 — Layout Wrapper + Rotas (COMEÇAR AQUI)

**Spec detalhada:** `docs/opus/M0-layout-routes.md`

**Resumo:**
1. Criar `src/components/layouts/AppLayout.tsx` — wrapper com `<DashboardHeader>` + `<Outlet>`
2. Atualizar `App.tsx` — todas as rotas autenticadas dentro de um `<Route element={<AppLayout/>}>`
3. Remover `<DashboardHeader />` de TODAS as páginas (Dashboard, ChannelView, ChannelPrompts, LongVideoStudio, Production/Index, Pipeline/Index, Foundation/Index, MediaHub/Index)
4. Redirecionar `/production` → `/dashboard` e `/fix` → `/dashboard`
5. Quebrar `ChannelView.tsx` (837 linhas) em `src/pages/Channel/tabs/` — um arquivo por tab

**Critério:** ChannelView < 150 linhas, zero DashboardHeader duplicado, zero rota quebrada.

**Armadilhas:**
- `BeamsBackground` precisa ser wrapper externo NAS PÁGINAS — não coloque no AppLayout
- O `pt-28` fica em cada página, não no AppLayout
- BlueprintTab tem 11+ estados locais — internalize dentro do componente
- Não merge LongVideoStudio com ProductionWizard ainda (Missão 1 trata isso)

---

### 🔴 MISSÃO 1 — Wizard de Vídeo Completo (após M0)

**Spec detalhada:** `docs/opus/M1-video-wizard.md`

**Resumo:** Wizard de 8 steps em `src/pages/Production/Index.tsx`:

```
Step 1: Idioma + Duração + Tópico + Estimativa de custo ANTES de gerar
Step 2: Sumário + Capítulos gerados por IA (editáveis)
Step 3: Roteiro por capítulo (geração em paralelo, regenerar por capítulo)
Step 4: TTS — seletor de voz com preço e sample inline
Step 5: Slides/Imagens — prompt por cena, escolha de modelo e preço visível
Step 6: Preview com Remotion Player
Step 7: Export MP4 via FFmpeg.wasm
Step 8: Aprovação + Publicação (NUNCA publica sem clique explícito)
```

**Interfaces TypeScript chave:**
```typescript
interface VideoChapter {
  id: string;
  title: string;
  description: string;
  script: string;
  audioUrl?: string;
  audioDurationSec?: number;
  scenes: VideoScene[];
}

interface VideoScene {
  narration: string;
  visual_prompt: string;
  imageUrl?: string;
  durationSec?: number;
}

// Helper: duração → nº de capítulos
function durationToChapters(durationMin: number): number {
  if (durationMin <= 8) return 4;
  if (durationMin <= 15) return 5;
  if (durationMin <= 20) return 6;
  return Math.ceil(durationMin / 3.5); // Ultra
}

// Helper: duração do capítulo → nº de cenas
function durationToScenes(chapterDurationMin: number): number {
  return Math.ceil((chapterDurationMin * 60) / 8); // 1 cena a cada 8s
}
```

**Chamada LLM (já existe em Production/Index.tsx — reutilize):**
```typescript
const callClaude = async (system: string, user: string, json = false): Promise<string>
```

**HubDefaults (localStorage key `autodark_hub_defaults_v2`):**
```typescript
interface HubDefaults {
  voice: string;       // provider: "ai33" | "openai" | "fish"
  voiceId: string;     // ID da voz selecionada
  slidesImage: string; // "flux" | "dalle3" | "ideogram" | "pexels"
  thumbImage: string;  // "flux" | "dalle3" | "nanobanana"
  videoModel: string;  // "none" | "vo3" | "sora"
}
```

---

### 🔴 MISSÃO 3 — Engine Remotion + FFmpeg.wasm (após M1 Steps 1-5)

**Spec detalhada:** `docs/opus/M3-remotion-engine.md`

**Instalação necessária:**
```bash
npm install @remotion/core @remotion/player @remotion/media-utils
npm install @ffmpeg/ffmpeg @ffmpeg/util
```

**Estrutura a criar:**
```
src/remotion/
  Root.tsx
  compositions/
    SlideShow.tsx      ← composição principal (chapters → slides sequenciais)
    ChapterSlides.tsx  ← slides de 1 capítulo
    SlideScene.tsx     ← 1 slide = Ken Burns + CaptionOverlay
  overlays/
    CaptionOverlay.tsx ← legendas word-by-word (chunks de 7 palavras)
  hooks/
    useFFmpegExport.ts ← WebM → MP4 H.264 via FFmpeg.wasm
```

**vite.config.ts** — adicionar headers SharedArrayBuffer:
```typescript
server: {
  headers: {
    "Cross-Origin-Opener-Policy": "same-origin",
    "Cross-Origin-Embedder-Policy": "require-corp",
  }
}
```

**Armadilha:** FFmpeg.wasm carrega ~30MB do CDN. Carregar lazily, mostrar loading.

---

### 🔴 MISSÃO 5 — Agentes de Conteúdo (Pipeline Completo)

**Spec detalhada:** `docs/opus/M5-content-agents.md`

**Estrutura:**
```
src/agents/
  trendAgent.ts          ← analisa channel_competitors + competitor_videos
  headAgent.ts           ← gera batch de 10 ideias (refatorar useHeadAgent.tsx)
  scripterAgent.ts       ← extrai lógica de roteiro do wizard
  narratorAgent.ts       ← TTS por capítulo
  visualAgent.ts         ← gera prompts + imagens por cena
  assemblyAgent.ts       ← aciona Remotion → export MP4
  seoAgent.ts            ← título + descrição + tags + timestamps YouTube
  pipelineOrchestrator.ts ← coordena tudo
```

**Tab Pipeline no ChannelView deve mostrar:**
- Ideias geradas (pendentes de aprovação)
- Vídeos em produção (com progress bar por etapa)
- Aguardando revisão (com preview)

**PipelineStage:**
```typescript
type PipelineStage =
  | "idle" | "analyzing_trends" | "generating_ideas" | "waiting_approval"
  | "generating_script" | "generating_audio" | "generating_visuals"
  | "assembling" | "generating_seo" | "saving" | "done" | "error";
```

---

## Arquivos Chave para Ler Antes de Começar

```
src/App.tsx                          ← rotas atuais
src/pages/ChannelView.tsx            ← 837 linhas que você vai quebrar
src/pages/Production/Index.tsx       ← wizard atual (será reescrito na M1)
src/hooks/useChannels.tsx            ← interface Channel
src/hooks/useBlueprint.tsx           ← interface ChannelBlueprint
src/hooks/useContents.tsx            ← tabela: channel_contents
src/hooks/useContentIdeas.tsx        ← ideias do canal
src/components/Channel/ReviewQueue.tsx ← já existe, não reescrever
src/components/ui/dashboard-header.tsx ← o header que será centralizado
docs/opus/M0-layout-routes.md        ← spec M0 completa
docs/opus/M1-video-wizard.md         ← spec M1 completa (interfaces + prompts LLM)
docs/opus/M3-remotion-engine.md      ← spec M3 completa (componentes Remotion)
docs/opus/M5-content-agents.md       ← spec M5 completa (todos os agentes)
```

---

## Regras Importantes

1. **Comece pela Missão 0** — sem M0, M1 não tem onde viver
2. **Leia a spec completa** antes de escrever código de cada missão
3. **Design system:** NUNCA zinc-*/slate-* — sempre bg-card/30, border-white/10, text-muted-foreground
4. **TypeScript:** NUNCA usar `any` — tipar tudo
5. **Não quebre** o que Sonnet fez: ReviewQueue, GlobalQueueSection, MediaHub, ChannelFolder badges
6. **Um commit por missão** — ao concluir cada missão, commite com `feat: M0 - ...`
7. **Tabela no Supabase:** conteúdos = `channel_contents` (não `contents`)
8. **callClaude já existe** em `Production/Index.tsx` — extraia para `src/lib/callClaude.ts` na M0 ou M1

---

## Comece agora

Leia `src/App.tsx` e `src/pages/ChannelView.tsx`, depois `docs/opus/M0-layout-routes.md`.
Execute a Missão 0 completa antes de avançar. Ao terminar cada missão, marque no MISSIONS.md como ✅ CONCLUÍDA.
