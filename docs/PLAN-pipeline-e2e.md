# PLAN: Pipeline de Produção End-to-End — AutoDark Studio

**Data:** 2026-04-07 | **Método:** SDD (Spec Driven Development) | **Status:** DRAFT

---

## 0. Contexto e Motivação

O AutoDark Studio tem todas as peças para produzir vídeos completos para canais dark do YouTube:
roteiro, narração, imagens, montagem via Remotion e export via FFmpeg. Mas hoje essas peças não
se encaixam — o resultado é uma "massa sem cobertura" onde o usuário precisa de retrabalho manual
para juntar áudio + slides, e a narração do Google TTS soa robotizada.

**Meta:** Um pipeline E2E onde o usuário clica "Produzir" em uma ideia aprovada e recebe um vídeo
MP4 completo com narração humana, slides animados, legendas e SEO — sem intervenção manual.

---

## 1. Estado Atual (As-Is)

### 1.1 Arquitetura de Agentes (src/agents/)

```
headAgent.ts          → Gera batch de ideias + estratégia de canal
scripterAgent.ts      → Roteiro: summary → capítulos → scripts por capítulo (via chat-completions)
narratorAgent.ts      → Narração: chama callTTS() por capítulo (via youtube-generate-audio)
visualAgent.ts        → Cenas: extrai scenes do script + gera imagens (Kie.ai → Pollinations → Canvas)
seoAgent.ts           → SEO: título, descrição, tags, timestamps
trendAgent.ts         → Analisa tendências/concorrentes
pipelineOrchestrator  → Orquestra tudo em sequência: trends → ideas → script → audio → visuals → SEO → save
```

### 1.2 Edge Functions (supabase/functions/)

```
chat-completions       → Proxy GPT-4o via AI33 (api.ai33.pro)
youtube-generate-audio → TTS com fallback chain: AI33 (tts-1) → OpenAI (tts-1) → Google Chirp3-HD
generate-kie-flow      → Imagens via Kie.ai
generate-ideas         → Gerar ideias (corrigido: agora usa service role para ler channels)
generate-script        → Script generation (edge)
generate-scene-images  → Scene images (edge)
generate-video-scenes  → Video scenes (edge)
process-content-audio  → Processar áudio
youtube-long-engine    → Engine de vídeo longo
```

### 1.3 Montagem de Vídeo (client-side)

```
useVideoAssembler.tsx  → Canvas-based: Ken Burns, vinheta, legendas word-by-word, crossfade
useFFmpegExport.tsx    → Export WebM→MP4 via @ffmpeg/ffmpeg (WASM, client-side)
RemotionPreview.tsx    → Preview Remotion: SlideShow, TitleCard, KenBurns, CaptionOverlay
```

### 1.4 Problemas identificados

| # | Problema | Severidade | Causa raiz |
|---|---------|-----------|-----------|
| P1 | **TTS robotizada** — Google Chirp é o default, soa artificial | BLOQUEADOR | Hub defaults usam `voice: "browser"` ou `google_chirp`. AI33/OpenAI TTS (`tts-1` com voz "onyx") não é usado por default. |
| P2 | **Pipeline não é automático** — requer clique manual em cada step do ProductionWizard (8 steps) | ALTO | `ProductionWizard` é manual por design. `pipelineOrchestrator` existe mas não é conectado ao flow principal. |
| P3 | **Áudio e slides desconectados** — Remotion espera `audioUrl` por slide, mas o audioUrl é por capítulo | MÉDIO | `narratorAgent` gera 1 áudio por capítulo. `RemotionPreview` espera `audioUrl` no `SlideData` (só no primeiro slide de cada capítulo). Timing fica errado se durationSec não for preciso. |
| P4 | **Export MP4 é client-side (WASM)** — lento, crash em vídeos >5min | ALTO | `useFFmpegExport` usa FFmpeg WASM no browser. Para vídeos de 8-25min, consome toda a RAM e crasha. |
| P5 | **Sem progresso persistido** — se o browser fecha, perde tudo | ALTO | Estado vive em useState. Nem chapters, nem audioBlobs, nem scenes são salvos no Supabase até o final. |
| P6 | **Dois caminhos duplicados** — `ProductionWizard` (manual, 8 steps) vs `pipelineOrchestrator` (automático) fazem a mesma coisa de formas diferentes | DÍVIDA | Código duplicado em src/pages/Production e src/agents/ |
| P7 | **Hub defaults em localStorage** — configurações de voz/imagem por canal ficam em localStorage, não no banco | MÉDIO | `loadHubDefaults()` lê de localStorage. Se mudar de máquina, perde config. |

---

## 2. Proposta (To-Be)

### 2.1 Princípio: One Pipeline, Two Modes

```
┌─────────────────────────────────────────────────────────────┐
│                    PIPELINE UNIFICADO                        │
│                                                              │
│  Ideia Aprovada                                              │
│       ↓                                                      │
│  ┌─── Config ────┐   (Mode: Auto = skip, Semi = user edit)  │
│  │ Idioma         │                                          │
│  │ Duração        │                                          │
│  │ Voz + Provider │  ← HubDefaults do BANCO (não localStorage)│
│  │ Estilo Visual  │  ← Blueprint do canal                    │
│  └───────────────┘                                           │
│       ↓                                                      │
│  ┌─── Script ────┐                                           │
│  │ Summary        │  scripterAgent.ts                        │
│  │ Chapters       │  → SALVA em channel_contents.script      │
│  │ Scripts        │  → STATUS: script_generated              │
│  └───────────────┘                                           │
│       ↓                                                      │
│  ┌─── Narração ──┐                                           │
│  │ TTS por cap.   │  narratorAgent.ts                        │
│  │ AI33 → OpenAI  │  → UPLOAD para Supabase Storage          │
│  │ → Google Chirp │  → SALVA URLs em channel_contents.audio  │
│  │ (fallback)     │  → STATUS: tts_done                      │
│  └───────────────┘                                           │
│       ↓                                                      │
│  ┌─── Visuais ───┐                                           │
│  │ Cenas extraídas│  visualAgent.ts                          │
│  │ Imagens geradas│  → UPLOAD para Supabase Storage          │
│  │ Kie→Pollinations│ → SALVA scenes JSON                     │
│  │ →Canvas fallback│ → STATUS: visuals_done                  │
│  └───────────────┘                                           │
│       ↓                                                      │
│  ┌─── Montagem ──┐                                           │
│  │ Remotion render │  Server-side (futuro) OU client preview │
│  │ Ken Burns       │                                         │
│  │ Legendas sync   │                                         │
│  │ Crossfade       │  → STATUS: assembled                    │
│  └────────────────┘                                          │
│       ↓                                                      │
│  ┌─── SEO ───────┐                                           │
│  │ Título otimizado│  seoAgent.ts                            │
│  │ Descrição       │  → SALVA em channel_contents            │
│  │ Tags + Timestamps│ → STATUS: awaiting_review              │
│  └────────────────┘                                          │
│       ↓                                                      │
│  REVIEW → PUBLISH                                            │
└──────────────────────────────────────────────────────────────┘
```

### 2.2 Upgrades de Qualidade de Narração

**Problema:** A voz padrão soa como GPS. Canais dark precisam de narração envolvente, dramática.

**Solução: Cascade de TTS com qualidade priorizada:**

```
Prioridade 1: AI33 tts-1 (voz "onyx" = grave, dramática, perfeita para dark)
   ↓ (fallback se AI33_API_KEY ausente ou erro)
Prioridade 2: OpenAI tts-1-hd (mesma API, qualidade superior, $15/1M chars)
   ↓ (fallback)
Prioridade 3: Google Chirp3-HD (pt-BR-Chirp3-HD-Algenib = melhor voz PT do Google)
   ↓ (fallback)
Prioridade 4: StreamElements/Vitoria (gratuito, qualidade baixa)
```

**Mudanças necessárias:**

| Arquivo | Mudança |
|---------|---------|
| `src/agents/llm.ts:callTTS()` | Mudar default de `voice: "browser"` para `voice: "ai33"`, voiceId: `"onyx"` |
| `src/agents/pipelineOrchestrator.ts:loadHubDefaults()` | Mudar fallback default para `voice: "ai33"` |
| `src/pages/MediaHub/Index.tsx` | Reordenar providers: AI33 primeiro, Google por último |
| `supabase/functions/youtube-generate-audio` | Já implementado — cascade AI33 → OpenAI → Google funciona |
| Hub defaults | **Migrar de localStorage → banco** (tabela `channel_hub_settings`) |

### 2.3 Pipeline Persistido (crash-resistant)

Cada step do pipeline salva estado intermediário no banco:

```sql
-- Nova tabela para estado de produção (ou reusar channel_contents com status granular)
-- Abordagem: usar channel_contents com campos existentes + status granular

channel_contents.status evolução:
  'queued'           → Ideia aprovada, na fila
  'config_set'       → Config definida (idioma, voz, duração)  
  'script_generated' → Roteiro salvo (campo script)
  'tts_done'         → Áudio gerado e uploadado (campo audio_path)
  'visuals_done'     → Imagens geradas (campo scenes JSON)
  'assembled'        → Preview montado (Remotion data salvo)
  'seo_done'         → SEO gerado
  'awaiting_review'  → Pronto para review humano
  'published'        → Publicado
  'failed'           → Erro (campo error_log com detalhes)
```

### 2.4 Hub Settings no Banco

```sql
-- Migration: mover hub defaults de localStorage para o banco
CREATE TABLE IF NOT EXISTS channel_hub_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id UUID NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
  voice_provider TEXT NOT NULL DEFAULT 'ai33',
  voice_id TEXT NOT NULL DEFAULT 'onyx',
  slides_image_provider TEXT NOT NULL DEFAULT 'kie_flux',
  thumb_image_provider TEXT NOT NULL DEFAULT 'kie_flux',
  video_model TEXT NOT NULL DEFAULT 'none',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(channel_id)
);

ALTER TABLE channel_hub_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own channel hub settings"
  ON channel_hub_settings FOR ALL
  USING (channel_id IN (SELECT id FROM channels WHERE user_id = auth.uid()));
```

---

## 3. Tasks (ordenadas por dependência)

### Sprint A — Fundação (corrigir o que temos)

| # | Task | Arquivo(s) | Agente | Critério de Aceite |
|---|------|-----------|--------|-------------------|
| A1 | **Migrar Hub defaults para banco** | Nova migration + `useHubSettings.ts` + update MediaHub | database-architect + backend-specialist | `loadHubDefaults()` lê do Supabase, não de localStorage |
| A2 | **Default de voz = AI33/onyx** | `pipelineOrchestrator.ts`, `llm.ts`, `MediaHub/Index.tsx` | frontend-specialist | Novo canal criado já tem voice: "ai33", voiceId: "onyx" |
| A3 | **Persistir estado por step** | `pipelineOrchestrator.ts`, `channel_contents` updates | backend-specialist | Cada stage faz UPDATE no banco com status + dados parciais. Browser pode fechar e retomar. |
| A4 | **Upload de áudio para Storage** | `narratorAgent.ts`, nova fn `uploadAudioBlob()` | backend-specialist | Audio blobs são uploadados para `supabase.storage.from('audio')`, URLs persistidas em `audio_path` |
| A5 | **Upload de imagens para Storage** | `visualAgent.ts`, nova fn `uploadSceneImage()` | backend-specialist | Imagens geradas são uploadadas para `supabase.storage.from('images')`, URLs persistidas em scenes JSON |

### Sprint B — Automação (unificar pipelines)

| # | Task | Arquivo(s) | Agente | Critério de Aceite |
|---|------|-----------|--------|-------------------|
| B1 | **Unificar Production + Orchestrator** | Refatorar `ProductionWizard` para usar `pipelineOrchestrator` internamente | frontend-specialist | Um único flow: wizard visual = orchestrator por baixo. Modo auto = roda tudo. Modo semi = pausa para review entre steps. |
| B2 | **Botão "Produzir" na IdeasTab** | `IdeasTab.tsx` → chama pipeline direto | frontend-specialist | Ideia aprovada → 1 clique → pipeline roda e atualiza status em real-time |
| B3 | **Progress real-time via Supabase Realtime** | Subscribe em `channel_contents` changes | frontend-specialist | Tab "Fila" mostra progresso live: "Gerando roteiro...", "Narrando cap. 2/4...", "Imagem 7/12..." |
| B4 | **Retry com fallback automático** | `pipelineOrchestrator.ts` error handling | backend-specialist | Se TTS falha, tenta próximo provider automaticamente. Se imagem falha, usa Canvas placeholder e marca para re-geração. |

### Sprint C — Qualidade (elevar o nível)

| # | Task | Arquivo(s) | Agente | Critério de Aceite |
|---|------|-----------|--------|-------------------|
| C1 | **TTS-1-HD como opção premium** | `youtube-generate-audio/index.ts` | backend-specialist | Quando hub setting = "openai_hd", usa model: "tts-1-hd" em vez de "tts-1" |
| C2 | **Sincronização áudio↔slides precisa** | `narratorAgent.ts` + `RemotionPreview` | frontend-specialist | `durationSec` por scene = (audio duration / número de scenes no capítulo). Slides acompanham o áudio exatamente. |
| C3 | **Legendas word-by-word** | `CaptionOverlay.tsx` | frontend-specialist | Legendas destacam a palavra sendo falada (estilo karaokê). Timing baseado em WPM médio do narrador. |
| C4 | **Music bed de fundo** | Adicionar campo `music_url` no SlideShow | frontend-specialist | Música ambiente loopada no volume 20% durante todo o vídeo. Biblioteca de 5-10 loops dark/cinematic gratuitos. |
| C5 | **ElevenLabs + Fish Audio integration** | `youtube-generate-audio/index.ts` | backend-specialist | Quando hub setting = "elevenlabs" ou "fish", chama API respectiva. Voice cloning como feature premium. |

---

## 4. Roteiro QA — Testes E2E

### 4.1 Cenários Críticos (para qa-automation-engineer)

```gherkin
@blocker @pipeline
Feature: Pipeline de Produção E2E

  Background:
    Given um usuário autenticado com um canal configurado
    And o canal tem blueprint preenchido e hub settings salvos

  @smoke
  Scenario: Produção completa no modo semi-automático
    Given o canal tem uma ideia aprovada "5 Conspirações do Vaticano"
    When o usuário clica "Produzir" na ideia
    Then o sistema deve navegar para o ProductionWizard
    And o step "Config" deve estar pré-preenchido com as configurações do canal
    When o usuário confirma a config e avança
    Then o roteiro deve ser gerado em menos de 60 segundos
    And o roteiro deve ter no mínimo 3 capítulos
    When o usuário avança para narração
    Then o áudio deve ser gerado capítulo por capítulo
    And o provider de TTS usado deve ser AI33 (ou fallback visível)
    And a barra de progresso deve avançar proporcionalmente
    When o usuário avança para imagens
    Then as imagens devem ser geradas scene por scene
    And cada scene deve ter imageUrl definido (não placeholder)
    When o usuário avança para preview
    Then o Remotion preview deve renderizar slides com áudio sincronizado
    And as legendas devem acompanhar a narração

  @smoke  
  Scenario: Fallback de TTS funciona
    Given AI33_API_KEY está inválida nas env vars da edge function
    When o pipeline tenta gerar narração
    Then o sistema deve cair para OpenAI TTS automaticamente
    And o log deve indicar "AI33 failed, falling back to OpenAI"
    And o áudio final deve ser gerado com sucesso

  @smoke
  Scenario: Pipeline persiste estado no banco
    Given o pipeline está no step "generating_audio" (cap. 2 de 4 concluído)
    When o usuário fecha o browser
    And o usuário reabre o canal
    Then o conteúdo deve aparecer com status "tts_done" (parcial)
    And deve haver opção "Retomar produção"

  @regression
  Scenario: Hub Settings persistem no banco
    Given o usuário está no MediaHub
    When ele seleciona voz "AI33 Onyx" e imagem "Kie.ai Flux"
    And ele salva
    Then as configurações devem persistir no banco (não em localStorage)
    When ele abre o ProductionWizard
    Then a config padrão deve ser "AI33 Onyx" + "Kie.ai Flux"

  @regression
  Scenario: Qualidade de narração — comparação de providers
    Given o canal tem o script "Em uma noite escura de 1947..."
    When a narração é gerada com provider "ai33" + voice "onyx"
    Then o áudio MP3 retornado deve ter:
      | propriedade | valor esperado |
      | Content-Type | audio/mpeg |
      | tamanho mínimo | 50KB (para 30s de áudio) |
      | duração | entre 25s e 45s |

  @regression
  Scenario: Imagens geradas são persistidas no Storage
    Given o pipeline está na fase de geração visual
    When uma imagem é gerada com sucesso
    Then a imagem deve ser uploadada para Supabase Storage bucket "images"
    And a URL pública deve ser salva no campo scenes do channel_contents
    And a URL deve ser acessível via GET (não blob URL efêmero)

  @edge-case
  Scenario: Pipeline com todas as APIs down
    Given todas as APIs de imagem estão indisponíveis (Kie, Pollinations)
    When o pipeline tenta gerar imagens
    Then deve usar o Canvas fallback para cada scene
    And o conteúdo deve ter status "visuals_done" (com flag "placeholder_images: true")
    And o usuário deve ver aviso "Imagens placeholder — clique para regenerar"
```

### 4.2 Checklist Manual (pré-call)

```markdown
## QA Checklist — AutoDark Demo

### Login
- [ ] Criar conta nova (sign up) funciona
- [ ] Login com conta existente funciona
- [ ] Redirect para /dashboard após login
- [ ] Logout funciona e limpa sessão

### Dashboard
- [ ] Lista de canais carrega do Supabase (não mock)
- [ ] Criar novo canal funciona (dialog 2-step)
- [ ] Canal aparece na lista após criação

### Canal
- [ ] 5 tabs visíveis (Visão Geral, Ideias, Fila, Concorrentes, Configuração)
- [ ] Breadcrumb "← Meus Canais" funciona
- [ ] Header global tem links Pipeline e Hub

### Ideias
- [ ] "Gerar Ideias" chama edge function e retorna ideias reais
- [ ] Aprovar/Rejeitar ideia atualiza no banco
- [ ] Status da ideia atualiza na UI sem refresh

### Produção (ProductionWizard)
- [ ] Breadcrumb "← Voltar ao Canal" visível e funcional
- [ ] Step 1 (Config) carrega defaults do hub
- [ ] Step 2 (Sumário) gera título + capítulos via IA
- [ ] Step 3 (Roteiro) gera scripts por capítulo
- [ ] Step 4 (Narração) gera áudio — VERIFICAR que NÃO soa robotizado
- [ ] Step 5 (Cenas) extrai scenes do script
- [ ] Step 6 (Imagens) gera imagens (Kie ou Pollinations)
- [ ] Step 7 (Thumb) gera thumbnail
- [ ] Step 8 (Preview) mostra vídeo montado com áudio + slides
- [ ] Barra de progresso reflete step correto

### Pipeline Global (/pipeline)
- [ ] Monitor mostra conteúdos em produção
- [ ] Status atualiza em tempo real

### Configuração
- [ ] Blueprint salva no banco
- [ ] Settings salva no banco
- [ ] Link "Prompts" navega corretamente
- [ ] ContentStatusBadge mostra labels amigáveis (não "tts_done")
```

---

## 5. Decisões Arquiteturais

### ADR-05: Unificação de Pipeline

**Contexto:** Existem dois caminhos para produzir vídeo — `ProductionWizard` (manual, 8 steps UI)
e `pipelineOrchestrator` (automático, hooks). Ambos duplicam lógica de script, áudio e imagens.

**Decisão:** Manter `ProductionWizard` como UI mas usar `pipelineOrchestrator` como engine por baixo.
O wizard se torna uma "casca visual" que observa e controla o orchestrator.

**Consequência:** Elimina duplicação. Modo auto = orchestrator roda sozinho. Modo semi = orchestrator
pausa entre stages e o wizard mostra o resultado para o user editar.

### ADR-06: Upload para Storage vs Blob URLs

**Contexto:** Áudio e imagens hoje são blob URLs efêmeros (vivem na memória do browser).
Se o browser fecha, perde tudo.

**Decisão:** Todo asset gerado (áudio MP3, imagens) é uploadado imediatamente para Supabase Storage.
O blob URL é usado apenas para preview local. A URL do Storage é o que persiste no banco.

**Consequência:** Pipeline crash-resistant. Usuário pode fechar o browser e retomar.

### ADR-07: TTS Priority = AI33 > OpenAI > Google

**Contexto:** Google Chirp é gratuito mas robotizado. AI33 via tts-1 com voz "onyx" é dramática
e natural, ideal para canais dark. OpenAI tts-1-hd é a melhor qualidade mas mais cara.

**Decisão:** Default = AI33 (onyx). Fallback automático = OpenAI → Google. Premium = tts-1-hd.
Hub settings permite override manual.

**Consequência:** Narração "out of the box" já soa profissional.

---

## 6. Riscos e Mitigações

| Risco | Impacto | Mitigação |
|-------|---------|-----------|
| AI33 API instável/down | Pipeline para na narração | Fallback chain automático (OpenAI → Google). Retry com exponential backoff. |
| Kie.ai rate limit | Imagens não geradas | Fallback para Pollinations → Canvas. Queue com 2s delay entre requests. |
| FFmpeg WASM crash em vídeos longos | Export falha | Fase 1: manter client-side para preview <5min. Fase 2: mover export para edge function com FFmpeg nativo. |
| Supabase Storage limits (1GB free) | Storage cheio | Limpar assets de conteúdos deletados. Compressão de imagens (JPEG 80%). Alert quando >80% usado. |
| OpenRouter/AI33 custo acumulado | Bill surprise | Rate limit por canal: max 5 produções/dia no free tier. Dashboard de custo estimado no MediaHub. |

---

## 7. Sequência de Implementação

```
Semana 1 (Sprint A):
  A1 → A2 → A3 → A4 → A5
  (Hub no banco, voz padrão AI33, persistência, upload storage)

Semana 2 (Sprint B):
  B1 → B2 → B3 → B4
  (Unificar pipelines, botão produzir, realtime, retry)

Semana 3 (Sprint C):
  C1 → C2 → C3 → C4 → C5
  (TTS-HD, sync áudio-slides, legendas, música, ElevenLabs/Fish)

QA contínuo:
  - Após Sprint A: rodar cenários @smoke
  - Após Sprint B: rodar cenários @regression
  - Após Sprint C: rodar cenários @edge-case + checklist manual completo
```

---

## Apêndice: APIs Disponíveis

| API | Função | Key | Status |
|-----|--------|-----|--------|
| AI33 (api.ai33.pro) | LLM (GPT-4o) + TTS (tts-1) | `AI33_API_KEY` (edge env) | Ativo |
| OpenAI | TTS fallback (tts-1, tts-1-hd) | `OPENAI_API_KEY` (edge env) | Ativo |
| Google Cloud TTS | Chirp3-HD (pt-BR) | `GOOGLE_TTS_API_KEY` (edge env) | Ativo |
| Kie.ai | Imagens (Flux) | `KIE_API_KEY` (edge env) | Ativo |
| Pollinations.ai | Imagens (gratuito, sem key) | — | Ativo |
| Supabase Storage | Upload assets | Automático (service role) | Ativo |
| ElevenLabs | TTS premium (futuro) | Não configurado | Pendente |
| Fish Audio | TTS + voice clone (futuro) | Não configurado | Pendente |
