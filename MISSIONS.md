# AUTODARK — DOCUMENTO DE MISSÕES

> **Como funciona:** Este arquivo é o norte do projeto. Cada missão concluída é **removida** deste documento e o próximo bloco sobe. O Opus 4.6 executa as missões marcadas com 🔴. O Sonnet executa as marcadas com 🔵. Missões em paralelo possíveis estão marcadas com ⚡.

---

## CONTEXTO CONSOLIDADO

### Produto
Plataforma SaaS para geração automatizada de vídeos longos para YouTube.
- **Usuário primário:** Grilo (CEO) + operadores que gerenciam vários canais
- **Modelo de canal:** Inglês e Espanhol (RPM mais alto). PT-BR secundário.
- **Formato de vídeo:** SEMPRE landscape 16:9 (YouTube). Nunca portrait.
- **Referência de qualidade:** Canal @Kee0111 — slides com arte dark, narração, legendas animadas, Ken Burns.

### Stack
- React + TypeScript + Vite + Tailwind + shadcn/ui
- Supabase (auth, DB, Edge Functions)
- AI-33 Pro (acesso a múltiplas LLMs/models via uma API)
- Kie.ai (imagens — FLUX, DALL-E, etc.)
- Canvas + MediaRecorder → export WebM (atual, bugado)
- Remotion (planejado para montagem)
- FFmpeg.wasm (planejado para encode MP4 no browser, sem servidor)

### Decisões Travadas
| Decisão | Escolha |
|---|---|
| Idioma | EN + ES (prioridade), PT-BR (secundário) |
| TTS | Escolhável por canal com preview de custo. AI-33 tem menu de vozes. |
| Imagens | Escolhável por tipo (thumb vs slide) com modelo e custo visíveis |
| Render | No browser: Remotion Player (preview) + FFmpeg.wasm (export MP4 real) |
| Servidor dedicado | NÃO por agora |
| Publicação YouTube | Com aprovação humana antes de publicar |
| Duração de vídeo | Opções: 8min / 15min / 20min / Ultra (custom). Alimenta o roteiro. |
| Custo por vídeo | Mostrar estimativa ANTES de gerar. Quanto mais barato melhor com qualidade. |
| Prompts | Todos os agentes têm prompts customizáveis por canal |

---

## 🔴 MISSÃO 0 — ORGANIZAÇÃO BASE [OPUS]
**Status:** ✅ CONCLUÍDA (2026-03-19)
**Objetivo:** Limpar a casa. Rotas organizadas, layout compartilhado, UX alinhada ao design system da dashboard.

### Problema atual
- Cada página renderiza seu próprio `<DashboardHeader>` — sem Layout wrapper
- `ChannelView.tsx` tem 837 linhas com 8 tabs inline — impossível de manter
- `/production` não é scoped por canal (sem `:channelId`)
- `/channel/:id` tem tab "Pipeline" E existe `/pipeline` global — duplicação
- Mix de `<button>` nativo com `<TabsTrigger>` (aba Prompts no ChannelView)
- `/fix` é rota de debug que não deveria existir em produção

### O que fazer

#### 1. Criar `<AppLayout>`
```
src/components/layouts/AppLayout.tsx
→ Wraps DashboardHeader + slot de conteúdo
→ Usado por TODAS as rotas autenticadas
→ Elimina o DashboardHeader duplicado em cada página
```

#### 2. Reorganizar rotas em `App.tsx`
```
/ → Login
/dashboard → Dashboard

/channel/:id → ChannelView (hub)
/channel/:id/foundation → Foundation
/channel/:id/production → ProductionWizard  ← mover de /production
/channel/:id/studio → LongVideoStudio  ← considerar merge no wizard

/pipeline → PipelinePage (global, para operadores)
/hub → MediaHub
/fix → REMOVER ou mover para /debug (guard admin)
```

#### 3. Quebrar `ChannelView.tsx` em sub-componentes
```
src/pages/Channel/
  Index.tsx          ← orquestrador (~100 linhas)
  tabs/
    DashboardTab.tsx
    IdeasTab.tsx
    ContentsTab.tsx
    PipelineTab.tsx
    CompetitorsTab.tsx
    BlueprintTab.tsx
    SettingsTab.tsx
```

#### 4. UX/UI fixes no ChannelView
- Substituir o `<button>` do Prompts por `<TabsTrigger>` + navigate (sem mudar comportamento)
- TabsList responsiva — wrap correto em mobile
- Sticky header do canal ao scrollar (já tem banner bonito, só fixar)

### Critério de conclusão
- [ ] `<AppLayout>` funcionando com todas as rotas autenticadas
- [ ] `ChannelView.tsx` < 150 linhas (tabs extraídas)
- [ ] `/production` redireciona para `/channel/:id/production`
- [ ] Zero `<DashboardHeader />` duplicados nas páginas
- [ ] Nenhuma rota quebrada

---

## 🔴 MISSÃO 1 — WIZARD DE NOVO VÍDEO [OPUS]
**Status:** ✅ CONCLUÍDA (2026-03-19)
**Objetivo:** Fluxo completo de criação de vídeo dentro do canal. Sem fadiga de decisão. Com estimativa de custo antes de gerar.

### Contexto do workflow (call do Grilo)
```
1. Usuário entra no canal
2. Clica "Novo Vídeo"
3. Escolhe template/configurações
4. Sistema gera: Roteiro → Narração → Imagens → Monta → Revisa → Publica
```

### Passos do Wizard (novo design)

#### Step 1 — Configuração do Vídeo
```
- Idioma: EN 🇺🇸 / ES 🇪🇸 / PT-BR 🇧🇷
- Duração: [8 min] [15 min] [20 min] [Ultra →]
  → Ultra: slider customizável (20-60 min)
- Tópico/Ideia: input ou selecionar ideia aprovada da lista
- Estimativa de custo: calcula e mostra ANTES de continuar
  → "Este vídeo vai custar aproximadamente R$ X (TTS: R$Y | Imagens: R$Z)"
```

#### Step 2 — Sumário e Capítulos
```
- IA gera: Título + Sumário com N capítulos baseado na duração
  → 8 min = ~4 capítulos de 2 min cada
  → 15 min = ~5 capítulos de 3 min cada
  → 20 min = ~6-7 capítulos
- Usuário pode editar o sumário antes de prosseguir
- Cada capítulo tem: título + descrição de 2 linhas do que será abordado
```

#### Step 3 — Roteiro por Capítulo
```
- IA gera o roteiro completo capítulo por capítulo
- Cada capítulo é expandido em narração contínua
- Slider por capítulo para ver/editar o texto
- Botão "Regenerar Capítulo" por capítulo
- Prompt do roteirista customizável (expandir → editar → salvar no blueprint)
```

#### Step 4 — Narração (TTS)
```
- Seletor de voz com:
  → Nome da voz
  → Idioma/sotaque
  → Preview de 5 segundos (sample)
  → Preço por minuto de áudio
  → Provedor (AI-33 / OpenAI / Fish Audio)
- Gerar narração por capítulo (ou tudo de uma vez)
- Player inline por capítulo
- Total de duração de áudio calculado
```

#### Step 5 — Slides e Imagens
```
- Para cada cena (~8 segundos de narração = 1 slide):
  → Prompt gerado automaticamente pelo sistema
  → Preview do prompt (editável)
  → Escolha do modelo: [FLUX Kontext] [DALL-E 3] [Ideogram] [Pexels (grátis)]
  → Preço por imagem visível
  → Status: Pendente / Gerando / Pronto
- Gerar tudo ou por capítulo
- Thumbnail: modelo separado (ex: NanoBanana, outro FLUX)
```

#### Step 6 — Montagem Preview (Remotion Player)
```
- Remotion Player no browser renderiza o preview em tempo real
- Slides sequenciados com timing do áudio
- Ken Burns effect nas imagens
- Legendas animadas sincronizadas com o áudio (word-by-word)
- Música de fundo (volume 20%, fade in/out)
- Controles: Play / Pause / Seek por capítulo
```

#### Step 7 — Export e Revisão
```
- Botão "Exportar MP4" → FFmpeg.wasm encoda no browser
  → Progress bar de encoding
  → Download local do arquivo .mp4
- Status do vídeo → "Aguardando Revisão"
- Preview final antes de aprovar
```

#### Step 8 — Aprovação e Publicação
```
- Card de revisão com: título, descrição gerada, thumbnail, tags
- Tudo editável
- Botão "Aprovar e Agendar" → abre date picker
- Botão "Publicar Agora" → sobe para YouTube via API
- NUNCA publica sem aprovação humana explícita
```

### Critério de conclusão
- [ ] Wizard 8 steps navegável sem erro
- [ ] Step 1 mostra estimativa de custo real calculada
- [ ] Step 2 gera sumário + capítulos com base na duração
- [ ] Step 3 gera roteiro por capítulo com edição inline
- [ ] Step 4 lista vozes com preço e sample
- [ ] Step 5 gera imagens com escolha de modelo e preço visível
- [ ] Step 6 mostra Remotion Player com slides + áudio + legendas
- [ ] Step 7 exporta MP4 via FFmpeg.wasm
- [ ] Step 8 requer aprovação antes de qualquer upload

---

## 🔵 MISSÃO 2 — MEDIA HUB: CATÁLOGO DE MODELOS [SONNET] ⚡
**Status:** ✅ CONCLUÍDA (2026-03-19)
**Objetivo:** Tela centralizada de todos os modelos disponíveis com preços em BRL, salvos por canal.

### O que fazer
- Seção **Vozes (TTS)**
  - Tabela: Provedor | Voz | Idioma | Qualidade | Preço/min | Sample
  - Provedores: AI-33 Pro, OpenAI TTS, Fish Audio
  - Botão "Usar neste canal" → salva no blueprint do canal

- Seção **Imagens**
  - Tabela: Modelo | Provedor | Estilo | Preço/imagem | Tempo médio
  - Modelos: FLUX Kontext Pro, DALL-E 3, Ideogram, NanoBanana, Pexels (grátis)
  - Separar por uso: Thumbnail | Slide | Personagem

- Seção **Vídeo (VO3/Sora)**
  - Tabela: Modelo | Duração máx | Preço/seg | Observações
  - Modelos: VO3 (10s/$0.30), Sora2

- Seleção salva por canal no blueprint
- Calculadora de custo: "Se gerar 4 vídeos de 15 min por semana = R$X/mês"

### Critério de conclusão
- [ ] Tabelas de vozes, imagens e vídeos com preços em BRL
- [ ] Seleção salva por canal
- [ ] Calculadora de custo mensal funcionando

---

## 🔴 MISSÃO 3 — ENGINE DE MONTAGEM COM REMOTION [OPUS]
**Status:** ✅ CONCLUÍDA (2026-03-19)
**Objetivo:** Engine de render que produz MP4 de qualidade profissional 100% no browser.

### Arquitetura
```
Remotion Player (preview no browser)
    ↓
Composição React: SlideShow
    ├── SlideScene (por cena/slide)
    │   ├── BackgroundImage (com Ken Burns)
    │   ├── CaptionOverlay (legendas word-by-word)
    │   └── AudioTrack (narração do capítulo)
    ├── MusicTrack (trilha de fundo, volume 20%)
    └── TransitionEffect (fade entre slides)
```

### Componentes Remotion a criar
```
src/remotion/
  Root.tsx                  ← registerRoot
  compositions/
    SlideShow.tsx           ← composição principal
    SlideScene.tsx          ← 1 slide = 1 cena
    TitleCard.tsx           ← card de título de capítulo
  overlays/
    CaptionOverlay.tsx      ← legendas animadas (word-by-word)
    KenBurns.tsx            ← wrapper de efeito zoom
  audio/
    NarrationTrack.tsx      ← áudio da narração
    MusicTrack.tsx          ← trilha de fundo
```

### Export MP4 via FFmpeg.wasm
```
1. Remotion Player captura frames via offscreen canvas
2. FFmpeg.wasm (libx264) encoda os frames em H.264
3. Mux com o áudio (AAC)
4. Output: .mp4 válido para upload no YouTube
```

### Parâmetros por canal (Blueprint)
- Ken Burns intensity (0-20%)
- Duração por slide sem áudio (padrão: 6s)
- Estilo de legenda (cor, fonte, tamanho, posição)
- Fade de entrada/saída do vídeo
- Volume da música de fundo

### Critério de conclusão
- [ ] Remotion Player renderiza preview de 1 capítulo com imagem + áudio + legenda
- [ ] Ken Burns funcionando sem bug de duração (timing correto)
- [ ] FFmpeg.wasm exporta MP4 H.264 válido
- [ ] Vídeo de 8 min exportado < 10 min de processamento no browser
- [ ] Legendas sincronizadas palavra por palavra com o áudio

---

## 🔵 MISSÃO 4 — PUBLICAÇÃO E REVISÃO [SONNET] ⚡
**Status:** ✅ CONCLUÍDA (2026-03-19)
**Objetivo:** Fila de revisão + publicação no YouTube com aprovação obrigatória.

### O que fazer
- **Fila de Revisão** no ChannelView (nova aba ou seção no tab Conteúdos)
  - Card por vídeo: thumbnail + título + status
  - Status: `rascunho` → `aguardando_revisão` → `aprovado` → `publicado`
  - Preview do MP4 antes de aprovar
  - Edição de título, descrição, tags inline
  - Seleção de thumbnail (gerada ou upload manual)

- **Agendamento**
  - Date picker com timezone (UTC por padrão, configurável por canal)
  - Calendário visual de publicações do canal
  - "Publicar Agora" vs "Agendar"

- **YouTube Upload**
  - YouTube Data API v3
  - Campos: title, description, tags, thumbnail, scheduledStartTime
  - Status do upload: progress bar (vídeo pode ser grande)
  - Após upload: salvar `youtube_video_id` no Supabase

### Critério de conclusão
- [ ] Fila de revisão com status visual
- [ ] Preview do vídeo antes de aprovar
- [ ] Agendamento com calendário
- [ ] Upload para YouTube com progress
- [ ] NUNCA publica sem clique explícito de aprovação

---

## 🔴 MISSÃO 5 — AGENTES DE CONTEÚDO (PIPELINE COMPLETO) [OPUS]
**Status:** ✅ CONCLUÍDA (2026-03-19)
**Objetivo:** Pipeline end-to-end funcionando automaticamente: canal → vídeo pronto sem intervenção manual (mas com opção de revisão em cada etapa).

### Agentes
1. **Trend Agent** — scrape de concorrentes a cada 12h, identifica tópicos em alta
2. **Ideias Agent** — gera batch de 10 ideias com base no blueprint + trends
3. **Roteirista Agent** — transforma ideia aprovada em roteiro estruturado (sumário + capítulos)
4. **Narrador Agent** — gera TTS capítulo por capítulo
5. **Visual Agent** — gera prompts de imagem por cena, aciona geração
6. **Montagem Agent** — aciona pipeline Remotion → exporta MP4
7. **SEO Agent** — gera título otimizado, descrição, tags, capítulos do vídeo (YT timestamps)

### Modo de operação
- **Manual** (padrão): usuário inicia cada etapa
- **Semi-auto**: usuário aprova ideias → sistema executa steps 3-7 automaticamente
- **Full-auto**: sistema roda tudo e coloca na fila de revisão (só aprovação final é manual)

### Customização por canal
- Cada agente tem prompt base + override por canal
- Blueprint do canal alimenta todos os agentes como contexto
- Histórico de vídeos publicados evita repetição de tópicos

### Critério de conclusão
- [ ] Pipeline completo: ideia → MP4 rodando de ponta a ponta
- [ ] Cada agente logado com input/output visível
- [ ] Modo semi-auto funcionando
- [ ] Prompts de cada agente editáveis pelo usuário no canal

---

## 🔵 MISSÃO 6 — MULTI-CANAL E OPERAÇÕES [SONNET]
**Status:** ✅ CONCLUÍDA (2026-03-19) — core implementado
**Objetivo:** Suporte a operação de muitos canais simultâneos.

### O que fazer
- Dashboard global com todos os canais do usuário + status de cada pipeline
- Fila global de vídeos em produção (ver todos os canais de uma vez)
- Sistema de templates: salvar configuração de canal como template reutilizável
- Banco de procedimentos (onboarding de novo canal: criar email, canal YT, proxy, etc.)
- Suporte a múltiplos usuários/operadores por conta (futuro: com seus próprios API keys)

---

## ORDEM DE EXECUÇÃO

```
Semana 1 (AGORA):
├── Missão 0 🔴 (Opus) — Layout + Rotas
├── Missão 2 🔵 (Sonnet) — Media Hub ⚡ paralelo
│
Semana 1-2:
├── Missão 1 🔴 (Opus) — Wizard de Vídeo (Steps 1-5 primeiro)
│
Semana 2:
├── Missão 3 🔴 (Opus) — Engine Remotion + FFmpeg.wasm
├── Missão 4 🔵 (Sonnet) — Publicação + Revisão ⚡ paralelo
│
Semana 3:
├── Missão 5 🔴 (Opus) — Pipeline completo de agentes
│
Semana 4+:
└── Missão 6 🔵 (Sonnet) — Multi-canal e operações
```

---

## REGRAS DESTE DOCUMENTO

1. **Nunca editar uma missão em andamento** — abrir issue/PR separado se precisar ajustar escopo
2. **Missão concluída** = todos os critérios marcados → remover o bloco desta missão
3. **Bloqueios** → anotar aqui embaixo da missão bloqueada com `⚠️ BLOQUEIO: [descrição]`
4. **Decisões novas** → atualizar a tabela de Decisões Travadas no topo
5. **Custo de API** → sempre que novo modelo/provedor for adicionado, atualizar o Media Hub

---

*Última atualização: 2026-03-19 | Owner: Fabricio + Opus 4.6*
