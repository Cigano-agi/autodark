# KNOWLEDGE BASE — Veritas & Gold YouTube Engine
**Versão**: 1.0 | **Última atualização**: 2026-03-07 | **Sprints cobertos**: 1–9

> Documento de referência completo. Cobre todos os agentes, bibliotecas, directives,
> configurações de hardware, banco de dados, bugs conhecidos e guias de modificação.

---

## ÍNDICE

1. [Visão Geral do Sistema](#1-visão-geral-do-sistema)
2. [Estrutura de Diretórios](#2-estrutura-de-diretórios)
3. [Pipeline Completo — 11 Etapas](#3-pipeline-completo--11-etapas)
4. [Detalhamento dos Scripts (24 arquivos)](#4-detalhamento-dos-scripts-24-arquivos)
5. [Directives — As Constituições do Sistema](#5-directives--as-constituições-do-sistema)
6. [Bibliotecas Python — Catálogo Completo](#6-bibliotecas-python--catálogo-completo)
7. [Variáveis de Ambiente (.env)](#7-variáveis-de-ambiente-env)
8. [Banco de Dados Supabase — 5 Tabelas](#8-banco-de-dados-supabase--5-tabelas)
9. [Hardware & Performance](#9-hardware--performance)
10. [Sprint History — O que Foi Construído](#10-sprint-history--o-que-foi-construído)
11. [Guia de Modificação por Componente](#11-guia-de-modificação-por-componente)
12. [Bugs Conhecidos & Gotchas (Enciclopédia)](#12-bugs-conhecidos--gotchas-enciclopédia)

---

## 1. Visão Geral do Sistema

### Objetivo
Produzir **2 vídeos/semana** automatizados — documentários de geopolítica e cybersecurity —
no padrão investigativo "insider cínico", com narração clonada, imagens cinematic, SFX
dinâmicos e upload automático no YouTube.

### Hardware de Referência
- **CPU**: Intel i7 12th Gen (i7-12700F, 12 núcleos físicos)
- **RAM**: 32 GB DDR4
- **GPU**: NVIDIA RTX 3050 Ti — 4 GB VRAM (encode NVENC, **máx 3 workers simultâneos**)
- **SO**: Windows 11 Pro
- **Risco #1**: queda de energia (Manaus/AM) → sistema de checkpoints por arquivo

### Arquitetura DOE (3 Camadas)

```
┌─────────────────────────────────────────────────────────────┐
│  LAYER 1 — DIRECTIVES (directives/*.md)                     │
│  SOPs em Markdown: objetivos, regras, edge cases            │
├─────────────────────────────────────────────────────────────┤
│  LAYER 2 — ORCHESTRATION (você / smart_pipeline.py)         │
│  Lê directives → chama scripts → trata erros → resume       │
├─────────────────────────────────────────────────────────────┤
│  LAYER 3 — EXECUTION (execution/*.py)                       │
│  Scripts Python determinísticos: APIs, FFmpeg, DB           │
└─────────────────────────────────────────────────────────────┘
```

### Filosofia Central
> "LLMs são probabilísticos; a lógica de negócios é determinística."
> Toda complexidade é empurrada para o código — o LLM só toma decisões.

### Multi-Model LLM Strategy
| Profile | Modelo | API | Uso |
|---------|--------|-----|-----|
| `fast` | `gemini-2.5-flash` | GEMINI_API_KEY | Extração entidades, tarefas auxiliares |
| `pro` | `gemini-3.1-pro` | GEMINI_API_KEY | Refino intermediário |
| `flagship` | `claude-sonnet-4-6` | ANTHROPIC_API_KEY | Roteiro de produção final |
| `research` | Perplexity `sonar-pro` | PERPLEXITY_API_KEY | Web-search com fontes em tempo real |

---

## 2. Estrutura de Diretórios

```
c:\Youtube Automatization\
│
├── execution/              ← 24 scripts Python (Layer 3)
├── directives/             ← 8 SOPs em Markdown (Layer 1)
├── docs/                   ← Docs estratégicos (orchestration, executions, directives)
├── assets/                 ← SFX, música, overlays, logos
│   └── registry.json       ← Catálogo de assets (gerado por asset_indexer.py)
│
├── videos/                 ← Uma pasta por vídeo produzido
│   └── {SLUG}/             ← ex: openai-s-projected-compute-spend-commitment-before/
│       ├── 02_SCRIPT/      ← visual_manifest.json, timed_visual_manifest.json, script_full.txt
│       ├── 03_VOICE/       ← narration_normalized.wav, voice_timestamps.json
│       ├── 04_EVIDENCE/    ← ev_01.jpg, ev_02.jpg, ev_02_2.jpg ... (faces, logos, B-roll)
│       ├── 05_VISUALS/
│       │   ├── flux_frames/    ← fx_01.png ... fx_60.png (FLUX AI)
│       │   ├── composed_frames/ ← cf_01.png ... cf_XX.png (bg + logo)
│       │   ├── hooks/          ← hk_01.mp4 ... hk_XX.mp4 (animados pelo wan_agent)
│       │   └── wan_intro/      ← intro_01.mp4, intro_02.mp4, intro_03.mp4
│       ├── 06_FINAL/       ← final_video.mp4, thumbnail.jpg, subtitles.srt
│       └── manifest.json   ← Manifesto unificado de todas as cenas
│
├── .tmp/                   ← Intermediários (DELETÁVEL a qualquer momento)
│   ├── current_video_dir.txt   ← Aponta para videos/SLUG/ atual
│   ├── voice_segments/         ← Segmentos de áudio TTS individuais
│   └── ...
│
├── CHANNEL VERITAS&GOLD/   ← Assets do canal
│   └── reference.wav       ← Áudio de referência para clonagem de voz (31.3s)
│
├── CLAUDE.md               ← Instruções do sistema (espelhado em AGENTS.md, GEMINI.md)
├── .env                    ← TODAS as credenciais e variáveis
├── requirements.txt        ← Dependências Python
└── run_full_pipeline.bat   ← Executor master
```

### Convenção de Nomenclatura de Arquivos

| Arquivo | Descrição |
|---------|-----------|
| `ev_02.jpg` | Evidência principal da cena 2 |
| `ev_02_2.jpg` | Segunda evidência da cena 2 (query_alt) |
| `ev_02_3.jpg` | Terceira evidência da cena 2 (query_alt2) |
| `cf_02.png` | Composed frame da cena 2 (background + logo) |
| `cf_02_2.png` | Segundo composed frame da cena 2 |
| `hk_02.mp4` | Hook animado da cena 2 (wan_agent) |
| `hk_02_2.mp4` | Segundo hook da cena 2 |
| `fx_02.png` | Frame FLUX da cena 2 |
| `intro_01.mp4` | Primeiro clip da abertura (wan_intro) |

---

## 3. Pipeline Completo — 11 Etapas

### Fluxo de Dados

```
SUPABASE topics (viral Z≥2.5)
         ↓
[1] setup_pipeline.py      → videos/SLUG/ criado, script_full.txt salvo
         ↓
[2] voice_producer.py      → narration_normalized.wav, voice_timestamps.json
         ↓
[3] time_master.py         → timed_visual_manifest.json (timing real por cena)
         ↓
[4] video_analyzer.py      → video_analysis.json (contexto visual por segmento)
         ↓
[5] evidence_collector.py  → manifest.json, 04_EVIDENCE/ev_XX.jpg (1-3 por cena)
         ↓
[6] flux_agent.py          → 05_VISUALS/flux_frames/fx_XX.png (60 imagens)
         ↓
[7] frame_composer.py      → 05_VISUALS/composed_frames/cf_XX.png
         ↓
[8] wan_agent.py           → 05_VISUALS/hooks/hk_XX.mp4
         ↓
[9] wan_intro_agent.py     → 05_VISUALS/wan_intro/intro_01-03.mp4
         ↓
[10] opening_agent.py      → wan_intro/intro_01.mp4 (abertura montada)
         ↓
[11] assembly_agent.py     → 06_FINAL/final_video.mp4 (h264, 1920×1080)
         ↓
SUPABASE video_uploads
```

### Tabela de Etapas

| # | Script | Checkpoint (como pipeline sabe que está pronto) | Re-rodar individualmente |
|---|--------|------------------------------------------------|--------------------------|
| 1 | `setup_pipeline.py` | `videos/SLUG/02_SCRIPT/script_full.txt` existe | `python execution/setup_pipeline.py` |
| 2 | `voice_producer.py` | `03_VOICE/narration_normalized.wav` > 100KB | `python execution/voice_producer.py` |
| 3 | `time_master.py` | `02_SCRIPT/timed_visual_manifest.json` > 500B | `python execution/time_master.py` |
| 4 | `video_analyzer.py` | `video_analysis.json` > 100B | `python execution/video_analyzer.py` |
| 5 | `evidence_collector.py` | `manifest.json` > 5KB | `python execution/evidence_collector.py` |
| 6 | `flux_agent.py` | `05_VISUALS/flux_frames/` tem ≥ 5 arquivos | `python execution/flux_agent.py` |
| 7 | `frame_composer.py` | `05_VISUALS/composed_frames/` tem ≥ 1 arquivo | `python execution/frame_composer.py` |
| 8 | `wan_agent.py` | `05_VISUALS/hooks/` tem ≥ 1 arquivo ≥ 10KB | `python execution/wan_agent.py` |
| 9 | `wan_intro_agent.py` | `05_VISUALS/wan_intro/intro_01.mp4` existe | `python execution/wan_intro_agent.py` |
| 10 | `opening_agent.py` | `wan_intro/intro_01.mp4` existe | `python execution/opening_agent.py` |
| 11 | `assembly_agent.py` | `06_FINAL/final_video.mp4` > 10MB | `python execution/assembly_agent.py` |

### Executar Pipeline Completo
```bash
cd "C:\Youtube Automatization"
.venv\Scripts\Activate.ps1
run_full_pipeline.bat     # setup + smart_pipeline com auto-resume
# OU
run_smart.bat             # Somente smart_pipeline (assume setup já rodou)
```

---

## 4. Detalhamento dos Scripts (24 arquivos)

---

### 4.1 `script_agent.py` — Fábrica de Roteiros

**Propósito**: Transforma tópico viral (Z-Score ≥ 2.5) do Supabase em roteiro cinematográfico
aprovado (score ≥ 8/10) via pipeline de 3 LLMs em cadeia: Investigador → Roteirista → Crítico.

**Inputs**:
- Supabase `topics` (status=pending, MAX z_score)
- `Top100NoticiasGlobais.md` (base de fontes confiáveis)
- Perplexity sonar-pro (pesquisa web em tempo real)

**Outputs**:
- Supabase `scripts` (status=approved, score, failed_checks)
- `videos/SLUG/02_SCRIPT/script_full.txt`
- `.tmp/script_full.txt`, `.tmp/script_output.json`

**Bibliotecas principais**:
- `anthropic` — Claude Sonnet (roteirista flagship)
- `google-generativeai` — Gemini (investigador fast/pro)
- `supabase-py` — leitura topics, escrita scripts
- `requests` — Perplexity API (raw HTTP, sem SDK oficial)

**Variáveis ENV**:
- `ANTHROPIC_API_KEY`, `GEMINI_API_KEY`, `PERPLEXITY_API_KEY`
- `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`
- `SCRIPT_MODEL_FAST`, `SCRIPT_MODEL_PRO`, `SCRIPT_MODEL_FLAGSHIP`

**Funções principais**:
- `call_llm(model, prompt)` — abstração unificada: rota para Gemini ou Anthropic
- `run_investigator(topic)` → briefing forense (fatos, atores, evidências)
- `run_scriptwriter(briefing, feedback)` → roteiro com blocos VISUAL/AUDIO
- `run_critic(script)` → score 0-10 + failed_checks (4 FAILs automáticos)
- `calculate_z_score(vph_list)` → Z = (VPH - μ) / σ

**CriticAgent — 4 FAILs automáticos** (score=0 se qualquer um falhar):
1. Sem "But, Therefore" em transições → `but_therefore_violation`
2. Uso de "we"/"our"/"us" → `pronoun_we_violation`
3. Cena factual sem `evidence_query` → `missing_evidence_query`
4. Hook sem número concreto + pausa dramática → `hook_template_violation`

**Mandatory Structure do Roteiro (25-35 cenas)**:
- CENA 01: Hook (5-Step: número + contradição + revelação + pausa + promessa)
- CENAS 02-06: Superfície (factos públicos, contexto)
- CENAS 07-18: Conflito Empilhado (But/Therefore obrigatório a cada 45s)
- CENAS 19-28: Profundidade (evidências S-Tier, dossiê)
- CENAS 29-32: Retention Anchor (reviravolta, Wall-Pusher ★)
- CENAS 33-35: CTA + Second Slot

**Como modificar**:
- Mudar número de cenas: `MANDATORY STRUCTURE` no system prompt do Roteirista
- Mudar threshold de aprovação: `CRITIC_PASS_SCORE = 8` no script
- Mudar modelos: variáveis ENV `SCRIPT_MODEL_*`
- Adicionar regras ao CriticAgent: lista `CRITIC_RULES` no system prompt

---

### 4.2 `intelligence_radar.py` — Radar de Vigilância Semanal

**Propósito**: Monitora semanalmente 8+ canais YouTube semente, calcula Z-Score de VPH para
detectar anomalias virais, insere tópicos qualificados (Z > 2.5) na fila Supabase.

**Inputs**:
- Apify YouTube Scraper (API REST)
- Lista de canais semente hardcoded (Veritas + Gold pillar)

**Outputs**:
- Supabase `intelligence_scans` (TODOS os vídeos analisados)
- Supabase `topics` (apenas outliers Z > 2.5, status=pending)
- Telegram alert (quando outliers detectados)

**Bibliotecas**:
- `apify-client` — scraping via Apify (protege IP local)
- `numpy` — cálculo Z-Score (ddof=1)
- `supabase-py` — inserção em lote
- `requests` — Telegram Bot API

**Fórmulas matemáticas**:
```python
VPH   = total_views / max(hours_since_publish, 1)
Z     = (VPH_video - mean_canal) / std_canal      # ddof=1
Viral = Z > 2.5 AND hours_since_publish < 72
```

**Canais semente** (Veritas pillar: geopolítica; Gold pillar: cybersec/tech):
- VisualPolitik EN, Economics Explained, ColdFusion, Geopolitics Simplified...

**Como executar**:
```bash
python execution/intelligence_radar.py
python execution/intelligence_radar.py --dry-run  # sem escrita no Supabase
```

**Como modificar**:
- Adicionar canal: `SEED_CHANNELS` lista no início do script
- Mudar threshold viral: constante `Z_THRESHOLD = 2.5`
- Mudar janela de análise: `VIRAL_WINDOW_HOURS = 72`

---

### 4.3 `evidence_collector.py` — Coletor de Evidências Visuais

**Propósito**: Extrai via Gemini os personagens, empresas e cenas do roteiro, depois baixa
automaticamente rostos (character faces), logos e imagens B-roll usando Serper API
(Google Search) com Playwright como fallback.

**Inputs**:
- `videos/SLUG/02_SCRIPT/script_full.txt` (ou `.tmp/script_full.txt`)
- `videos/SLUG/02_SCRIPT/timed_visual_manifest.json` (para `evidence_count_needed`)
- Gemini API (extração de entidades)
- Serper API (busca de imagens)
- Playwright (fallback quando Serper falha)

**Outputs**:
- `videos/SLUG/manifest.json` (manifesto unificado com ev_file por cena)
- `videos/SLUG/04_EVIDENCE/ev_01.jpg` ... `ev_XX.jpg` (B-roll principal)
- `videos/SLUG/04_EVIDENCE/ev_02_2.jpg`, `ev_02_3.jpg` (extras multi-imagem)
- `videos/SLUG/04_EVIDENCE/characters/` (rostos)
- `videos/SLUG/04_EVIDENCE/logos/` (logos empresas)

**Multi-imagem por cena** (desde Sprint 9):
- 1 imagem se cena < 5s (`evidence_count_needed=1`)
- 2 imagens se cena < 8s (`evidence_count_needed=2`)
- 3 imagens se cena ≥ 8s (`evidence_count_needed=3`)
- Arquivo principal: `ev_02.jpg`; extras: `ev_02_2.jpg`, `ev_02_3.jpg`

**Validação de imagem** (`_is_valid_image()`):
- Tamanho mínimo: 40KB
- Dimensões mínimas: 200×200px
- Não aceita imagens com logo/watermark dominante (análise de bordas)

**Funções principais**:
- `gemini_extract_entities(script)` → lista de personagens, empresas, cenas
- `build_context_anchor(entity)` → "SoftBank Vision Fund fraud photo" (melhora busca)
- `download_face(name, context)` → baixa rosto para `04_EVIDENCE/characters/`
- `download_broll(scene, query, query_alt, count)` → baixa B-roll com retry
- `_is_valid_image(path)` → valida tamanho, dimensão, qualidade
- `validate_manifest(manifest)` → verifica integridade do manifesto final

**Como modificar**:
- Adicionar domínio confiável à whitelist de imagens: `TRUSTED_DOMAINS` no script
- Mudar tamanho mínimo de imagem: `MIN_IMAGE_SIZE_KB = 40`
- Mudar queries alternativas: campos `query_alt`, `query_alt2` no visual_manifest

---

### 4.4 `voice_producer.py` — Motor de Voz

**Propósito**: Traduz roteiro para inglês (via Anthropic), segmenta a narração por cena,
gera áudio via ChatterboxTTS (clonagem de voz local), e aplica normalização LUFS -14 dBTP.

**Inputs**:
- Supabase `scripts` (script aprovado mais recente)
- `reference.wav` (áudio de referência para clonagem de voz, 31.3s, 44100Hz stereo)

**Outputs**:
- `videos/SLUG/03_VOICE/narration_normalized.wav` (áudio master normalizado)
- `videos/SLUG/03_VOICE/voice_timestamps.json` (timestamp por palavra/segmento)
- `.tmp/voice_segments/` (segmentos individuais)

**Bibliotecas**:
- `chatterbox.tts` — `ChatterboxTTS` (clonagem de voz CUDA local)
- `pydub` — processamento de áudio (normalização, concatenação)
- `scipy` — resampling de áudio (44100Hz → 24000Hz)
- `num2words` — expansão de números para TTS ("$19B" → "nineteen billion dollars")
- `anthropic` — tradução PT→EN

**Parâmetros ChatterboxTTS** (DEFINITIVOS):
```python
exaggeration = 0.4      # entonação dramática
cfg_weight   = 0.5      # adherência ao estilo de referência
temperature  = 0.7      # variação natural
SEGMENT_MAX_CHARS = 220 # máx chars por segmento (220 para Chatterbox, 900 para Edge-TTS)
```

**LUFS Compliance (D-006)**:
```
LUFS_TARGET = -14.0    # Integrated Loudness (YouTube broadcast standard)
LUFS_TP     = -1.0     # True Peak ceiling
FFmpeg: loudnorm=I=-14:TP=-1.0:LRA=11
```

**Funções principais**:
- `expand_numbers_for_tts(text)` → converte números/símbolos para texto legível
- `_generate_segment_chatterbox_sync(text, model, ref)` → gera 1 segmento de áudio
- `normalize_lufs(audio_path)` → aplica loudnorm via FFmpeg
- `concatenate_audio(segments)` → junta todos segmentos em narração completa

**Atenção**: Deletar `.tmp/voice_segments/` e `.tmp/narration_normalized.wav` antes de
re-gerar voz para forçar re-processamento.

---

### 4.5 `flux_agent.py` — Gerador de Imagens FLUX

**Propósito**: Gera 60 imagens fotorrealistas (backgrounds cinematic) para as cenas do roteiro
usando FLUX 1.1-pro-Ultra via SiliconFlow API, com 4 variantes visuais (ABCD).

**Inputs**:
- `videos/SLUG/manifest.json`
- Gemini API (geração de prompts visuais detalhados)

**Outputs**:
- `videos/SLUG/05_VISUALS/flux_frames/fx_XX.png` (2752×1536, PNG 16:9)

**Configuração FLUX (DEFINITIVA)**:
```python
URL    = "https://api.siliconflow.com/v1/images/generations"  # .com (não .cn)
MODEL  = "black-forest-labs/FLUX-1.1-pro-Ultra"              # hífens (não pontos)
PARAM  = {"aspect_ratio": "16:9"}                            # gera 2752×1536 nativo
WORKERS = 1                                                   # uma requisição por vez
```

**4 Variantes ABCD**:
- **A** — Macro: close-up detalhe, texture, gritty
- **B** — Wide Aerial: vista ampla, establishing shot, panoramic
- **C** — Geometric: ângulo abstrato, graphic, architectural
- **D** — Atmospheric Fog: névoa, silhouette, moody, chiaroscuro

**FLUX Positive Prompting**: NÃO usar "NO TEXT" ou "NO FACES" — FLUX 2 inverte negativos.
Em vez disso, usar descritores de textura: "abstract financial data stream texture",
"empty boardroom without people", etc.

**`_sanitize_visual_prompt()`**: remove instruções inválidas antes de enviar à API.

**Como modificar**:
- Mudar estilo visual: variável `FLUX_STYLE` no script (sufixo adicionado a todo prompt)
- Adicionar nova variante: expandir lista `VARIANTS` de 4 para N variantes
- Mudar modelo: constante `FLUX_MODEL`

---

### 4.6 `wan_agent.py` — Animador de Hooks

**Propósito**: Anima cada composed frame (cf_XX.png) em um micro-vídeo cinematic (hk_XX.mp4)
aplicando 15 presets de movimento (zoom, parallax, color grading, film grain, vignette)
via FFmpeg local com encode NVENC.

**Inputs**:
- `videos/SLUG/manifest.json`
- `videos/SLUG/05_VISUALS/composed_frames/cf_XX.png`
- Fallback: `videos/SLUG/04_EVIDENCE/ev_XX.jpg` se composed_frames não existir

**Outputs**:
- `videos/SLUG/05_VISUALS/hooks/hk_XX.mp4` (1920×1080, h264_nvenc, 25fps)
- Extras: `hk_XX_2.mp4`, `hk_XX_3.mp4` quando `cf_XX_2.png` existe

**15 Motion Presets**:
1. `zoom_in_slow` — zoompan lento para dentro (0.5%/frame)
2. `zoom_out_dramatic` — zoom para fora com revelation
3. `parallax_left`, `parallax_right` — movimento horizontal simulado
4. `ken_burns_diagonal` — diagonal clássico cinematic
5. `shake_investigation` — leve tremor (documentário investigativo)
6. `pan_up`, `pan_down` — reveal vertical
7. `static_grain` — estático com grain pesado
8. `fade_reveal` — fade de preto para imagem
9. `pulse_zoom` — zoom pulsante (para impacto dramático)
10-15. Variações de color grading (cold, warm, desaturated, high contrast...)

**Fallback de Evidência**:
```python
# CORRETO (04_EVIDENCE, não evidence):
ev_dir = video_dir / "04_EVIDENCE"
```

**Multi-hook por cena** (desde Sprint 9): após loop principal, verifica
`cf_XX_2.png` e `cf_XX_3.png` → gera `hk_XX_2.mp4` e `hk_XX_3.mp4` para variedade visual.

**Como modificar**:
- Mudar duração máxima de hooks: `MAX_SHOT_MS` (em ms)
- Adicionar preset: função `render_motion_preset(preset_name, input, output, duration)`
- Mudar grain/vignette: `apply_dynamic_grain()`, `apply_vignette()`

---

### 4.7 `assembly_agent.py` — Editor Final

**Propósito**: Monta o vídeo final (1920×1080, h264_nvenc) concatenando hooks, abertura,
narração, música de fundo (via Replicate MusicGen), legendas word-level (faster-whisper)
e 22 SFX dinâmicos. É o script mais complexo do sistema.

**Inputs**:
- `videos/SLUG/` (todos os assets gerados pelas etapas anteriores)
- `videos/SLUG/03_VOICE/narration_normalized.wav`
- `videos/SLUG/05_VISUALS/hooks/hk_XX.mp4`
- `videos/SLUG/05_VISUALS/wan_intro/intro_01-03.mp4`
- `assets/registry.json` (SFX, música local)

**Outputs**:
- `videos/SLUG/06_FINAL/final_video.mp4` (h264_nvenc, 25fps, stereo, ~198MB para 13min)
- `videos/SLUG/06_FINAL/subtitles.srt`

**Schedule-Driven Frames** (Sprint 5):
- `compute_subclip_schedule()` → pré-computa 132 sub-clips com timing exato
- 1 frame único por sub-clip (antes: 29 frames repetidos = jitter)
- Ken Burns: `scale=8000:4500` antes do zoompan (elimina jitter FFmpeg #4298)

**Multi-hook por cena** (Sprint 9): `build_timeline()` verifica `hk_XX_2.mp4`, `hk_XX_3.mp4`.
Se existirem, divide `exact_duration_ms` igualmente entre N hooks da cena.

**22 SFX Dinâmicos**: `select_local_sfx(category)` mapeia:
- `"impact"` → boom, tension riser, stinger...
- `"reveal"` → whoosh, evidence ping...
- `"transition"` → swoosh, cut...
- `"wall_pusher"` → impacto máximo para Wall-Pusher ★ scenes

**Remove BG** (rembg migration): rembg NÃO roda no evidence_collector. Roda no
`_apply_rembg_on_demand()` do assembly_agent APENAS quando a imagem vai ser overlay
(logo fade ou face bounce). Cache em `04_EVIDENCE/.rembg_cache/`.

**Flags CLI**:
```bash
python execution/assembly_agent.py
python execution/assembly_agent.py --dry-run        # sem gerar nada
python execution/assembly_agent.py --skip-flux      # Pillow gradiente ao invés de FLUX
python execution/assembly_agent.py --skip-music     # sem música de fundo
python execution/assembly_agent.py --skip-wan       # sem Wan hooks
python execution/assembly_agent.py --skip-whisper   # SRT sintético
python execution/assembly_agent.py --overwrite      # re-gera mesmo com checkpoint
python execution/assembly_agent.py --no-gpu         # libx264 (sem NVENC)
```

**Como modificar**:
- Adicionar novo SFX: `assets/sfx/nome.wav` + entrada em `assets/registry.json`
- Mudar música de fundo: `assets/music/` + categoria no registry
- Mudar qualidade do encode: `FINAL_QUALITY` em `perf_config.py`
- Mudar estilo de legendas: filtro `drawtext` em `generate_subtitles()`

---

### 4.8 `frame_composer.py` — Compositor de Frames

**Propósito**: Compõe frames finais 1920×1080 combinando background (evidência ou FLUX)
com overlay do logo (canto inferior esquerdo) usando PIL/Pillow.

**Inputs**:
- `videos/SLUG/manifest.json` (ev_file, flux_frame por cena)
- `videos/SLUG/04_EVIDENCE/ev_XX.jpg` (backgrounds de evidência)
- `videos/SLUG/05_VISUALS/flux_frames/fx_XX.png` (backgrounds FLUX)
- `assets/logos/` (logo do canal)

**Outputs**:
- `videos/SLUG/05_VISUALS/composed_frames/cf_XX.png` (1920×1080 PNG)
- Extras: `cf_XX_2.png`, `cf_XX_3.png` quando `ev_XX_2.jpg` existe

**Multi-cf por cena** (Sprint 9): `ev_file` no manifest pode ser lista separada por vírgula
(`"ev_02.jpg, ev_02_2.jpg"`). Para cada evidência extra, gera `cf_XX_N.png` correspondente.

**Importante — Overlay JPEG rejeitado**: overlays `.jpg/.jpeg` SEM canal alpha travam
FFmpeg em CPU fallback. `frame_composer.py` só aceita `.png` para overlays.

**Funções principais**:
- `_load_image(path)` → carrega com retry + converte para RGB/RGBA
- `_add_logo_overlay(frame, logo)` → posiciona logo lower-left com alpha
- `_compose_single(cena_num, bg_path, out_path, ...)` → compõe 1 frame
- `compose_all_frames(manifest, video_dir)` → processa todas as cenas

---

### 4.9 `thumbnail_agent.py` — Gerador de Thumbnails

**Propósito**: Gera thumbnail de alta CTR (1280×720): background FLUX cinematic + rosto
do personagem principal sem fundo (rembg) + texto impactante + seta vermelha.

**Inputs**:
- `videos/SLUG/manifest.json` (personagem principal)
- `videos/SLUG/04_EVIDENCE/characters/` (rosto)
- `videos/SLUG/05_VISUALS/flux_frames/` (background)

**Outputs**:
- `videos/SLUG/thumbnail.jpg` (1280×720, JPEG 95%)

**Bibliotecas**:
- `PIL` — composição, texto, efeitos
- `rembg` — remoção de background do rosto (alpha matting)

**Gotcha rembg**: parâmetro de erosão é `alpha_matting_erode_structure_size` (Python API),
NÃO `erode_size` (CLI flag). Misturar causa `TypeError`.

---

### 4.10 `wan_intro_agent.py` — Gerador de Abertura via Veo 2

**Propósito**: Gera 3 clips cinematic de abertura (0-15s) usando Google Veo 2
(text-to-video) via Gemini API com prompts épicos gerados por LLM.

**Inputs**:
- `videos/SLUG/02_SCRIPT/script_full.txt`
- `videos/SLUG/manifest.json`
- Gemini API (Veo 2 text-to-video)

**Outputs**:
- `videos/SLUG/05_VISUALS/wan_intro/intro_01.mp4`, `intro_02.mp4`, `intro_03.mp4`

**Como funciona**: `submit_veo2_request()` → polling `poll_veo2_status()` → download.
Cada clip leva 30-90s para renderizar na nuvem.

---

### 4.11 `opening_agent.py` — Montador de Abertura Local

**Propósito**: Monta a abertura profissional de 15s usando assets locais: intro video
+ flash de evidência + lower-third animado + SFX de impacto.

**Inputs**:
- `videos/SLUG/manifest.json`
- `videos/SLUG/04_EVIDENCE/ev_01.jpg` (primeira cena)
- `assets/registry.json` (SFX de abertura)

**Outputs**:
- `videos/SLUG/05_VISUALS/wan_intro/intro_01.mp4` (montagem local, 15s)

---

### 4.12 `publisher_agent.py` — Upload para YouTube

**Propósito**: Gera metadados SEO (título, descrição, tags) via Claude, faz upload para
YouTube via Data API v3, e registra em Supabase para o Feedback Loop de retenção.

**Inputs**:
- `videos/SLUG/06_FINAL/final_video.mp4`
- `videos/SLUG/thumbnail.jpg`
- Supabase `scripts` (texto do roteiro para geração de metadados)
- YouTube Data API v3

**Outputs**:
- YouTube Video ID
- Supabase `video_uploads` (status=uploaded, video_id, cost_breakdown)
- Supabase `video_performance_base` (base para Feedback Loop futuro)

**Schema de Metadados**:
- Título: ≤ 70 caracteres (D-007)
- Descrição: ≥ 500 caracteres, keywords naturais
- Tags: 15-20 tags, mix broad + specific
- Slot: Terça/Quinta 14h EST (D-007)

---

### 4.13 `smart_pipeline.py` — Orquestrador Inteligente

**Propósito**: Executa o pipeline completo com auto-resume. Verifica qual etapa já completou
(via checkpoint de arquivo) e pula etapas prontas. Continua de onde parou.

**Lógica de Checkpoint**:
```python
CHECKPOINTS = {
    "voice":          lambda: file_size("03_VOICE/narration_normalized.wav") > 100_000,
    "time_master":    lambda: file_exists("02_SCRIPT/timed_visual_manifest.json"),
    "evidence":       lambda: file_size("manifest.json") > 5_000,
    "flux":           lambda: count_files("05_VISUALS/flux_frames/") >= 5,
    "frame_composer": lambda: count_files("05_VISUALS/composed_frames/") >= 1,
    "wan":            lambda: max_size("05_VISUALS/hooks/") >= 10_000,
    "assembly":       lambda: file_size("06_FINAL/final_video.mp4") > 10_000_000,
    ...
}
```

**STEPS** (ordem de execução):
```python
STEPS = [
    ("voice",          "voice_producer.py",    ["--language", "en-US"]),
    ("time_master",    "time_master.py",        []),
    ("video_analyzer", "video_analyzer.py",    []),
    ("evidence",       "evidence_collector.py", []),
    ("flux",           "flux_agent.py",         []),
    ("frame_composer", "frame_composer.py",     []),
    ("wan",            "wan_agent.py",          []),
    ("wan_intro",      "wan_intro_agent.py",    []),
    ("opening",        "opening_agent.py",      []),
    ("assembly",       "assembly_agent.py",     []),
]
```

---

### 4.14 `time_master.py` — Sincronizador de Timing

**Propósito**: "O arquivo mágico". Lê `voice_timestamps.json` + `visual_manifest.json`,
mapeia timestamps reais de narração para cada cena, e gera `timed_visual_manifest.json`
com timing preciso por cena.

**Inputs**:
- `videos/SLUG/03_VOICE/voice_timestamps.json`
- `videos/SLUG/02_SCRIPT/visual_manifest.json`

**Outputs**:
- `videos/SLUG/02_SCRIPT/timed_visual_manifest.json` — superset com timing real
- `videos/SLUG/02_SCRIPT/production_meta.json` — metadados de produção
- `videos/SLUG/manifest.json` — patcheado com `exact_duration_ms`

**Campos gerados por cena**:
```json
{
  "real_start_ms": 45000,
  "real_end_ms": 102000,
  "exact_duration_ms": 57000,
  "word_count": 142,
  "evidence_count_needed": 3,
  "impact_trigger_ms": 67500
}
```

**Cálculo de `evidence_count_needed`**:
```python
if seconds < 5:  return 1
if seconds < 8:  return 2
return 3
```

**`impact_trigger_ms`**: detecta primeiro timestamp na janela da cena com palavra de impacto
(billion, fraud, crash, arrested...) → usado pelo assembly para acionar SFX dramático.

**Fallback pré-voice**: se `exact_duration_ms=0` (voice não rodou ainda), parse do campo
`"duration"` ("40s" → 40000ms) para estimar `evidence_count_needed`.

---

### 4.15 `video_analyzer.py` — Analisador de Vídeo de Referência

**Propósito**: Analisa vídeo de referência YouTube via Gemini 2.0 Flash, gerando queries
visuais contextuais para cada segmento de 30s — melhora a busca de B-roll pelo
evidence_collector.

**Inputs**:
- `.tmp/current_video_url.txt` (URL do vídeo de referência)
- `videos/SLUG/02_SCRIPT/script_full.txt`
- Gemini 2.0 Flash (análise de vídeo multimodal)

**Outputs**:
- `videos/SLUG/video_analysis.json` (query visual por segmento de 30s)

---

### 4.16 `verify_env.py` — Health Check de Ambiente

**Propósito**: Valida TODAS as variáveis ENV obrigatórias + testa conectividade com APIs
(sem chamadas pagas) antes de rodar o pipeline.

```bash
python execution/verify_env.py
# Saída: .tmp/health_report.json
```

Verificações: GEMINI_API_KEY, ANTHROPIC_API_KEY, SERPER_API_KEY, SILICONFLOW_API_KEY,
SUPABASE conectividade, FFmpeg no PATH, NVENC disponível, reference.wav existe.

---

### 4.17 `setup_supabase.py` — Criação de Schema

**Propósito**: Cria as 5 tabelas no Supabase caso não existam. Rodar apenas na primeira
configuração ou após `DROP TABLE` de emergência.

```bash
python execution/setup_supabase.py
```

---

### 4.18 `asset_indexer.py` — Indexador de Assets

**Propósito**: Classifica automaticamente TODOS os assets em `assets/` usando modelos de AI
local — CLIP (imagens) e CLAP (áudio) — e gera `assets/registry.json`.

```bash
python execution/asset_indexer.py
```

Rodar após adicionar novos assets à pasta `assets/`.

---

### 4.19 `asset_selector.py` — Seletor de Assets

**Propósito**: Módulo de consulta ao `assets/registry.json`. Usado pelo assembly_agent para
encontrar SFX e música por categoria, mood e intensidade.

**Funções**:
- `find_sfx(category, mood, intensity)` → Path para SFX
- `find_music(genre, bpm_range)` → Path para música
- `find_overlay(type)` → Path para overlay visual

---

### 4.20 `scene_detect_sync.py` — Detector de Cortes

**Propósito**: Detecta cortes de cena no vídeo intermediário via PySceneDetect
(`ContentDetector`). Retorna timestamps para ancoragem de SFX.

**Retorna**: `[{"time_s": 12.4, "frame": 310, "type": "hard_cut"}, ...]`

---

### 4.21 `render_backend.py` — Interface de Render

**Propósito**: Abstração polimórfica do backend de render. Atualmente: `FFmpegBackend`.
Planejado: `DaVinciResolveBackend` (futuro).

---

### 4.22 `perf_config.py` — Configuração de Hardware

**Propósito**: Detecta hardware disponível e define constantes de performance.
Importado por assembly_agent e wan_agent.

```python
CPU_THREADS         = os.cpu_count()    # i7-12700F: 20 threads
MAX_SLICE_WORKERS   = 3                 # RTX 3050 Ti: máx 3 NVENC simultâneos
MAX_KENBURNS_WORKERS= 2                 # Ken Burns workers (menor que NVENC)
FINAL_QUALITY       = "slow"            # preset h264_nvenc (slow=melhor qualidade)
```

**Como modificar**:
- Mudar workers NVENC: `MAX_SLICE_WORKERS` (máx 3 para RTX 3050 Ti 4GB)
- Mudar qualidade: `FINAL_QUALITY = "medium"` para render mais rápido

---

### 4.23 `setup_pipeline.py` — Inicializador de Pipeline

**Propósito**: Etapa 0 do pipeline. Busca script aprovado no Supabase, cria estrutura de
diretórios `videos/SLUG/`, salva `script_full.txt`, e escreve `.tmp/current_video_dir.txt`.

```bash
python execution/setup_pipeline.py
```

---

### 4.24 `migrate_to_video_folder.py` — Migração Legada

**Propósito**: Migra estrutura antiga `.tmp/evidence/` → `videos/SLUG/04_EVIDENCE/`
com nomenclatura padronizada (`ev_XX.jpg`, `cf_XX.png`, `hk_XX.mp4`).

```bash
python execution/migrate_to_video_folder.py --video-dir videos/SLUG/
```

---

## 5. Directives — As Constituições do Sistema

As directives são SOPs em Markdown que definem **O QUE** fazer (Layer 1).
Vivem em `directives/`. São documentos vivos — atualizar quando aprender novos edge cases.

### D-001: Identidade (intelligence_radar.md)
- Tom: "insider cínico" — jornalismo investigativo, nunca sensacionalismo barato
- Paleta dark: azul-aço, cinza grafite, vermelho sangue
- Assinatura sonora: boom de impacto, tension riser, grain de película

### D-002: Conflict Stacking (script_agent.md)
- Regra dos 45s: toda sequência de 45s deve ter "But" ou "Therefore"
- Estrutura narrativa obrigatória: "But, Therefore" (nunca "And, Then")
- Hooks de retenção a cada ~2 minutos

### D-003: Autoridade Forense (script_agent.md)
- Hierarquia de fontes: S-Tier (documentos primários) → A-Tier (Reuters/AP) → B-Tier → C → D
- "Efeito Dossiê": apresentar evidências como dossier confidencial, não como notícia

### D-004: Detecção Viral (intelligence_radar.md)
- Z-Score ≥ 2.5 para qualificação
- VPH > 500 (Views Per Hour) mínimo
- Janela: publicado há < 72 horas
- μ e σ calculados sobre últimos 30 vídeos do canal

### D-005: System Prompt do Roteirista (script_agent.md)
10 regras obrigatórias:
1. Script em inglês, blocos VISUAL/AUDIO alternados
2. CENA 01 sempre Hook com número + pausa dramática
3. "But, Therefore" obrigatório a cada 45s
4. NUNCA "we", "our", "us" — sempre narrador em 3ª pessoa
5. TODA cena factual precisa de `evidence_query`
6. 25-35 cenas (1 cena ≈ 20-25s de conteúdo)
7. Fontes S-Tier e A-Tier preferenciais
8. Wall-Pusher ★: 2 cenas por vídeo que "empurram a parede" (revelação chocante)
9. Second Slot: penúltima cena promove próximo vídeo da série
10. CTA final: inscrição + notificação + comentário

### D-006: Montagem (assembly_agent.md)
- LUFS Integrated: -14.0 dBFS (YouTube broadcast standard)
- True Peak: ≤ -1.0 dBTP
- Ken Burns obrigatório (scale 8000×4500, zoompan 0.5%/frame)
- Legendas word-level (faster-whisper, burn-in FFmpeg)

### D-007: YouTube SEO (publisher_agent.md)
- Título ≤ 70 caracteres, keyword principal nos primeiros 5 words
- Descrição ≥ 500 caracteres, primeiro parágrafo com keywords
- Publicação: Terça e Quinta, 14h00 EST
- Thumbnail: rosto principal + texto 3-4 palavras + seta vermelha

### D-008: Segurança (verify_env.md)
- Credenciais SOMENTE em `.env` (nunca hardcoded)
- Apify protege IP local (não scraping direto do YouTube)
- `.gitignore` obrigatório: `.env`, `credentials.json`, `token.json`

### D-009: Resiliência (setup_pipeline.md)
- Checkpoints por arquivo (não por banco de dados)
- Retry 3x com backoff exponencial em toda chamada de API
- Toda etapa é idempotente (re-rodar não corrompe output)

### D-010: Glossário (docs/directives.md)
- Hook = cena 01 de impacto (5-Step Hook)
- Hook Visual = `hk_XX.mp4` (vídeo animado pelo wan_agent)
- Evidence = imagem de B-roll/rosto/logo para cena
- Composed Frame = background + logo overlay (cf_XX.png)
- Wall-Pusher ★ = cena de revelação máxima (2 por vídeo)
- Second Slot = penúltima cena com teaser da próxima série

---

## 6. Bibliotecas Python — Catálogo Completo

### LLM / IA Generativa
| Biblioteca | Versão | Uso | Instalar |
|------------|--------|-----|---------|
| `anthropic` | ≥0.28 | Claude Sonnet (roteiro flagship, traduções) | `pip install anthropic` |
| `google-generativeai` | ≥0.7 | Gemini 2.5 Flash/3.1 Pro/2.0 Flash/Veo 2 | `pip install google-generativeai` |
| `replicate` | ≥0.25 | MusicGen (música de fundo) via Replicate API | `pip install replicate` |

### Voz / Áudio
| Biblioteca | Versão | Uso | Instalar |
|------------|--------|-----|---------|
| `chatterbox-tts` | latest | Voice cloning local (ChatterboxTTS, não Turbo) | `pip install chatterbox-tts` |
| `faster-whisper` | ≥1.0 | Transcrição para legendas (CPU int8 mode) | `pip install faster-whisper` |
| `pydub` | ≥0.25 | Manipulação de áudio, normalização, concatenação | `pip install pydub` |
| `scipy` | ≥1.11 | Resampling de áudio (44100Hz → 24000Hz) | `pip install scipy` |
| `num2words` | ≥0.5 | "$19B" → "nineteen billion dollars" para TTS | `pip install num2words` |
| `pyaudio` | — | Input de áudio (só se gravação ao vivo) | `pip install pyaudio` |

### Imagem / Vídeo
| Biblioteca | Versão | Uso | Instalar |
|------------|--------|-----|---------|
| `Pillow` (PIL) | ≥10.0 | Composição de frames, thumbnails, texto | `pip install Pillow` |
| `opencv-python` | ≥4.8 | Processamento de imagem/vídeo, resize | `pip install opencv-python` |
| `rembg` | ≥2.0 | Remoção de background (thumbnails, overlays) | `pip install rembg` |
| `ffmpeg-python` | ≥0.2 | Encode h264_nvenc, LUFS, legendas, Ken Burns | `pip install ffmpeg-python` |
| `scenedetect` | ≥0.6 | Detecção de cortes (PySceneDetect ContentDetector) | `pip install scenedetect` |

### Machine Learning Local
| Biblioteca | Versão | Uso | Instalar |
|------------|--------|-----|---------|
| `torch` | ≥2.0 | Backend para ChatterboxTTS e rembg (CUDA) | `pip install torch` |
| `transformers` | ≥4.40 | CLIP (classificação imagem) e CLAP (áudio) | `pip install transformers` |
| `numpy` | ≥1.24 | DSP, Z-Score, processamento de arrays | `pip install numpy` |

### Banco de Dados / APIs
| Biblioteca | Versão | Uso | Instalar |
|------------|--------|-----|---------|
| `supabase` | ≥2.0 | PostgreSQL gerenciado (checkpoints, scripts, uploads) | `pip install supabase` |
| `apify-client` | ≥1.0 | YouTube scraping via Apify (protege IP) | `pip install apify-client` |
| `requests` | ≥2.31 | HTTP genérico (Serper, SiliconFlow, Perplexity, Telegram) | `pip install requests` |
| `playwright` | ≥1.40 | Fallback scraping quando Serper API falha | `pip install playwright` |
| `python-dotenv` | ≥1.0 | Carrega variáveis do `.env` | `pip install python-dotenv` |

### Utilitários
| Biblioteca | Versão | Uso | Instalar |
|------------|--------|-----|---------|
| `pydantic` | ≥2.0 | Validação de schemas (manifest, entidades) | `pip install pydantic` |
| `tqdm` | ≥4.65 | Barras de progresso em loops longos | `pip install tqdm` |
| `python-slugify` | ≥8.0 | Gera slugs de URL seguros para nomes de pasta | `pip install python-slugify` |
| `pathlib` | stdlib | Manipulação de caminhos (Python 3.9+) | (built-in) |
| `asyncio` | stdlib | Paralelização de downloads/API calls | (built-in) |

---

## 7. Variáveis de Ambiente (.env)

Arquivo: `c:\Youtube Automatization\.env`

```ini
# ═══════════════════════════════════════════════════
# LLMs — Obrigatórios para produção
# ═══════════════════════════════════════════════════
GEMINI_API_KEY=AIza...              # Gemini 2.5 Flash, Gemini 3.1 Pro, Gemini 2.0 Flash, Veo 2
ANTHROPIC_API_KEY=sk-ant-...        # Claude Sonnet 4.6 (roteiro flagship + traduções)
PERPLEXITY_API_KEY=pplx-...         # Sonar Pro (pesquisa web em tempo real no investigador)

# Perfis de modelo (alterar para trocar modelo sem editar código)
SCRIPT_MODEL_FAST=gemini-2.5-flash
SCRIPT_MODEL_PRO=gemini-3.1-pro
SCRIPT_MODEL_FLAGSHIP=claude-sonnet-4-6

# ═══════════════════════════════════════════════════
# Imagens & Vídeo
# ═══════════════════════════════════════════════════
SILICONFLOW_API_KEY=...             # FLUX 1.1-pro-Ultra (backgrounds cinematic)
REPLICATE_API_TOKEN=r8_...          # MusicGen (música de fundo no assembly_agent)

# ═══════════════════════════════════════════════════
# Evidence / Busca de Imagens
# ═══════════════════════════════════════════════════
SERPER_API_KEY=...                  # Serper Google Search API (evidence_collector)

# ═══════════════════════════════════════════════════
# Banco de Dados — Supabase
# ═══════════════════════════════════════════════════
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_KEY=eyJ...                 # anon key (read operations)
SUPABASE_SERVICE_KEY=eyJ...         # service_role key (write operations — GUARDAR COM SEGURANÇA)

# ═══════════════════════════════════════════════════
# YouTube Data API v3
# ═══════════════════════════════════════════════════
YOUTUBE_DATA_API_KEY=AIza...        # Para publisher_agent.py (upload de vídeos)

# ═══════════════════════════════════════════════════
# Voz & Clonagem
# ═══════════════════════════════════════════════════
USE_CHATTERBOX=true                 # true=ChatterboxTTS local, false=Edge-TTS (fallback)
CHATTERBOX_REF_AUDIO=C:/Youtube Automatization/CHANNEL VERITAS&GOLD/reference.wav
VOICE_SPEED=1.0                     # Velocidade de narração (1.0=normal)
HF_TOKEN=hf_...                     # HuggingFace token (para baixar ChatterboxTTS na 1ª vez)

# ═══════════════════════════════════════════════════
# Hardware & Performance
# ═══════════════════════════════════════════════════
MAX_SLICE_WORKERS=3                 # RTX 3050 Ti: NUNCA > 3 (deadlock GPU)
LUFS_TARGET=-14.0                   # YouTube broadcast standard (D-006)
LUFS_TP=-1.0                        # True Peak ceiling (D-006)

# ═══════════════════════════════════════════════════
# Intelligence Radar
# ═══════════════════════════════════════════════════
APIFY_API_TOKEN=apify_api_...       # Apify (scraping YouTube sem expor IP)
TELEGRAM_BOT_TOKEN=...              # Alertas quando outliers virais detectados
TELEGRAM_CHAT_ID=...                # Chat/canal do Telegram para receber alertas
```

---

## 8. Banco de Dados Supabase — 5 Tabelas

### 8.1 `intelligence_scans`
Armazena TODOS os vídeos analisados pelo radar semanalmente.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | UUID | Primary key |
| `channel_id` | text | ID do canal YouTube |
| `video_id` | text | ID do vídeo |
| `title` | text | Título do vídeo |
| `views` | int | Total de views |
| `vph` | float | Views Per Hour calculado |
| `z_score` | float | Z-Score do VPH |
| `published_at` | timestamptz | Data de publicação |
| `scanned_at` | timestamptz | Data do scan |
| `pillar` | text | "veritas" ou "gold" |

### 8.2 `topics`
Tópicos virais qualificados (Z > 2.5) prontos para produção.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | UUID | Primary key |
| `title` | text | Título do tópico viral |
| `video_id` | text | ID do vídeo original |
| `z_score` | float | Z-Score detectado |
| `vph` | float | VPH no momento do scan |
| `pillar` | text | "veritas" ou "gold" |
| `status` | text | pending / scripted / rejected |
| `created_at` | timestamptz | Data de inserção |

**Query para pegar próximo tópico**:
```python
supabase.from_("topics")
    .select("*")
    .eq("status", "pending")
    .order("z_score", desc=True)
    .limit(1)
    .execute()
```

### 8.3 `scripts`
Roteiros gerados e avaliados pelo CriticAgent.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | UUID | Primary key |
| `topic_id` | UUID | FK → topics |
| `status` | text | approved / rejected / pending |
| `score` | float | Score do CriticAgent (0-10) |
| `failed_checks` | text[] | Lista de FAILs automáticos |
| `script_text` | text | Roteiro completo |
| `script_hash` | text | SHA256 do script |
| `system_prompt_version` | text | Versão do prompt usada |
| `model_used` | text | Modelo que gerou o script |
| `created_at` | timestamptz | Data de criação |

### 8.4 `video_uploads`
Histórico de uploads para o YouTube.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | UUID | Primary key |
| `script_id` | UUID | FK → scripts |
| `youtube_video_id` | text | ID do vídeo no YouTube |
| `title` | text | Título do vídeo publicado |
| `status` | text | pending / uploaded / failed |
| `thumbnail_hash` | text | Hash do thumbnail |
| `hook_text` | text | Texto do hook (para correlação futura) |
| `distribution_slot` | text | "tuesday_14h" ou "thursday_14h" |
| `cost_breakdown` | JSONB | Custo por API (FLUX, Wan, LUFS...) |
| `upload_timestamp` | timestamptz | Momento do upload (null até publicar) |
| `retry_count` | int | Número de tentativas |
| `error_message` | text | Erro se status=failed |

### 8.5 `video_performance_base`
Fundação do Feedback Loop de Retenção (meses 4-6).

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | UUID | Primary key |
| `video_id` | UUID | FK → video_uploads |
| `script_hash` | text | Para correlação com roteiro |
| `hook_text_hash` | text | Hash do hook para correlação |
| `retention_30s` | float | % retenção aos 30s (via Analytics) |
| `retention_60s` | float | % retenção aos 60s |
| `ctr_48h` | float | CTR nas primeiras 48h |
| `recorded_at` | timestamptz | Data da coleta (meses depois) |

---

## 9. Hardware & Performance

### RTX 3050 Ti 4GB VRAM — Regras Inegociáveis

| Parâmetro | Valor | Motivo |
|-----------|-------|--------|
| `MAX_SLICE_WORKERS` | **3** (nunca 5+) | Deadlock GPU após ~100 slices com 5 workers |
| FFmpeg timeout | **120s** por slice | Matar processos presos (executor.map bloqueia) |
| Whisper device | **cpu** / `compute_type="int8"` | CUDA DLL issue RTX 3050 Ti |
| NVENC check | Verificar `st_size > 10_000` | Silent failure: exit 0 mas arquivo 48 bytes |

### FFmpeg no Windows — Armadilhas de Path

```python
# CORRETO: single quotes protegem ":" do drive letter
filter_str = f"drawtext=text='Texto':x=50:y=50:fontfile='C\\:/fonts/font.ttf'"

# ERRADO: escape duplo produz C\\: inválido
path.replace(':', '\\\\:')  # → FFmpeg falha silenciosamente, stderr vazio

# CORRETO: apenas forward slashes
str(path.absolute()).replace('\\', '/')
```

### Ken Burns sem Jitter

```
# Problema: zoompan em imagem 1920×1080 → pixels aparecem
# Solução: escalar para 8K ANTES do zoompan
scale=8000:4500,zoompan=z='zoom+0.005':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=125:s=1920x1080
```

### ChatterboxTTS — Limites

| Parâmetro | Valor | Motivo |
|-----------|-------|--------|
| `SEGMENT_MAX_CHARS` | **220** | Acima disso: "alucinação" de sílabas |
| `exaggeration` | 0.4 | Entonação dramática sem exagero |
| `cfg_weight` | 0.5 | Aderência ao estilo de referência |
| `temperature` | 0.7 | Variação natural |
| `reference.wav` | min 31.3s | Mínimo para clonagem de qualidade |

---

## 10. Sprint History — O que Foi Construído

### Sprint 1 — Infraestrutura (Score 10.0/10)
- Criação da arquitetura DOE (3 camadas)
- `intelligence_radar.py`: Z-Score, Apify, Supabase, Telegram
- `script_agent.py`: Investigador → Roteirista → CriticAgent
- Schema Supabase: 5 tabelas
- `.env`, `CLAUDE.md`, `requirements.txt`

### Sprint 2 — Voz
- `voice_producer.py` com Edge-TTS inicial
- Normalização LUFS -14/-1.0dBTP via FFmpeg
- `voice_timestamps.json` com timestamps word-level

### Sprint 3 — Primeiro Vídeo
- `assembly_agent.py`: montagem completa
- **Primeiro vídeo gerado**: 198MB, 13:36 min, h264_nvenc
- Ken Burns, legendas, SFX básicos

### Sprint 4A — Qualidade de Imagem
- FLUX 1.1-pro-Ultra substituiu FLUX.2
- `Wan2.2-T2V-A14B` — modelo correto para hooks
- NO FACES obrigatório nos prompts FLUX
- Fix Supabase: `.select("*")` antes de `.eq()`

### Sprint 4C — Controles de Qualidade
- `MAX_SHOT_MS` (duração máxima de hook)
- `FLUX_STYLE` (sufixo de estilo global)
- Threshold de evidência: 100KB → 40KB mínimo

### Sprint 5 — Overhaul de Qualidade Visual
- **Schedule-driven frames**: 132 sub-clips pré-computados (antes: 29 frames repetidos)
- **4 FLUX variants ABCD**: macro/wide/geometric/fog — 60 imagens (antes: 30)
- **FLUX positive prompting**: sem "NO TEXT" (FLUX 2 inverte negativos)
- **8K upscale Ken Burns**: `scale=8000:4500` elimina jitter #4298
- **22 SFX dinâmicos**: foley por categoria (antes: 3 hardcoded)
- **compose_proof_frame**: FLUX background + lower-third (antes: tela preta + CONFIDENTIAL)
- Removido: listra amarela 75% e watermark "VERITAS & GOLD"

### Sprint 7 — Bugfixes Críticos
- **FIX1 outpoint**: corrige corte prematuro de clips
- **FIX2 music fallback**: quando MusicGen API falha, usa arquivo local
- **FIX3 overlay JPEG**: rejeita `.jpg/.jpeg` em overlays (sem canal alpha → trava FFmpeg)
- **FIX4 voice silence buffer**: padding de silêncio antes/depois da narração
- **FIX5 SFX count**: corrige contagem de SFX em cenas longas
- **FIX6 evidence relevance**: melhora queries para evitar imagens genéricas

### Sprint 7B — Migração para ChatterboxTTS
- ChatterboxTTS (não Turbo) — melhor clonagem de voz
- `reference.wav`: 31.3s, 44100Hz stereo
- Parâmetros definitivos: `exaggeration=0.4, cfg_weight=0.5, temperature=0.7`
- `SEGMENT_MAX_CHARS = 220` (descoberto limite de ChatterboxTTS)
- `expand_numbers_for_tts()` via num2words

### Sprint 8 — Bugs Críticos de Evidence
- **BUG CRÍTICO 1**: `queries_to_try` nunca definido → NameError engolido por asyncio → TODAS cenas sem evidência
- **BUG CRÍTICO 2**: `entity_hint` não definido → falha silenciosa no Circuit Breaker
- **BUG CRÍTICO 3**: `_is_valid_image()` não existia → todos downloads falhavam
- **Migração rembg**: movido do evidence_collector para assembly_agent (`_apply_rembg_on_demand()`)
- **Wall-Pushers**: 2 frases por vídeo marcadas com `[WALL-PUSHER ★]`
- **Headlines categorias**: "wall_pusher" → "YOU DECIDE.", "THE PATTERN SPEAKS."

### Sprint 9 — Retenção & Multi-Evidência
- `retention_anchor`: cena de retorno após desvio dramático
- **Second Slot**: penúltima cena teaser da próxima série
- **5-Step Hook**: número + contradição + revelação + pausa + promessa
- **`time_master.py`** integrado ao pipeline (estava implementado mas nunca chamado!)
- **Multi-evidência por cena**: 1-3 imagens baseado em `exact_duration_ms`
- **Multi-hook por cena**: `hk_XX_2.mp4`, `hk_XX_3.mp4` quando múltiplos frames existem
- **assembly_agent build_timeline()**: divide duração da cena por N hooks
- Fix `frame_composer.py` path: `"evidence/"` → `"04_EVIDENCE/"`
- Fix `wan_agent.py` fallback path: `"evidence"` → `"04_EVIDENCE"`

---

## 11. Guia de Modificação por Componente

### Mudar estilo visual FLUX
**Arquivo**: `execution/flux_agent.py`
**O quê**: Constante `FLUX_STYLE` — sufixo adicionado a todo prompt de imagem
```python
FLUX_STYLE = "cinematic 16mm grain, desaturated palette, high contrast shadows"
```

### Mudar voz do canal
**O quê**: Substituir `reference.wav`
**Onde**: `C:/Youtube Automatization/CHANNEL VERITAS&GOLD/reference.wav`
**Requisitos**: Mínimo 30s, mono ou stereo, 44100Hz, sem música de fundo
**Após substituir**: Deletar `.tmp/voice_segments/` para re-gerar

### Mudar número de cenas por vídeo
**Arquivo**: `execution/script_agent.py`
**O quê**: `MANDATORY STRUCTURE` no system prompt do Roteirista
```
MANDATORY STRUCTURE: 25-35 scenes (1 scene per ~20-25 seconds of content)
```

### Mudar música de fundo
**Onde**: `assets/music/` → adicionar arquivo MP3/WAV
**Depois**: `python execution/asset_indexer.py` para re-indexar
**Como usar**: `find_music(genre="dark_ambient", bpm_range=(60, 90))` em assembly_agent

### Mudar SFX
**Onde**: `assets/sfx/` → adicionar arquivo WAV
**Depois**: `python execution/asset_indexer.py`
**Categorias existentes**: impact, reveal, transition, wall_pusher, foley

### Mudar qualidade do encode (velocidade vs qualidade)
**Arquivo**: `execution/perf_config.py`
```python
FINAL_QUALITY = "medium"   # mais rápido (antes: "slow")
FINAL_QUALITY = "slow"     # padrão — melhor qualidade
```

### Mudar duração máxima de hooks
**Arquivo**: `execution/wan_agent.py`
```python
MAX_SHOT_MS = 8000    # 8 segundos por hook (padrão)
```

### Mudar threshold viral do radar
**Arquivo**: `execution/intelligence_radar.py`
```python
Z_THRESHOLD = 2.5          # Z-Score mínimo para qualificação
VIRAL_WINDOW_HOURS = 72    # Janela de análise (72h)
```

### Adicionar nova fonte de notícias
**Arquivo**: `Top100NoticiasGlobais.md`
Adicionar URL + nome + categoria (Veritas ou Gold)

### Adicionar canal semente ao radar
**Arquivo**: `execution/intelligence_radar.py`
```python
SEED_CHANNELS = [
    {"channel_id": "@NomeDoCanal", "pillar": "gold"},
    ...
]
```

### Mudar slot de publicação
**Arquivo**: `execution/publisher_agent.py`
```python
DISTRIBUTION_SLOTS = ["tuesday_14h_est", "thursday_14h_est"]
```

### Forçar re-processamento de uma etapa específica
Deletar o arquivo de checkpoint da etapa:
```bash
rm videos/SLUG/03_VOICE/narration_normalized.wav     # re-gera voz
rm videos/SLUG/02_SCRIPT/timed_visual_manifest.json  # re-roda time_master
rm videos/SLUG/manifest.json                          # re-coleta evidências
rm -rf videos/SLUG/05_VISUALS/flux_frames/           # re-gera FLUX
rm -rf videos/SLUG/05_VISUALS/composed_frames/       # re-compõe frames
rm -rf videos/SLUG/05_VISUALS/hooks/                 # re-anima hooks
rm videos/SLUG/06_FINAL/final_video.mp4              # re-monta vídeo
```

---

## 12. Bugs Conhecidos & Gotchas (Enciclopédia)

### BUG-001: rembg — parâmetro de erosão
**Sintoma**: `TypeError: remove() got unexpected keyword argument 'erode_size'`
**Causa**: CLI flag `--erode-size` ≠ Python API param `alpha_matting_erode_structure_size`
**Fix**:
```python
# ERRADO:
output = remove(data, erode_size=10)
# CORRETO:
output = remove(data, alpha_matting_erode_structure_size=10)
```

### BUG-002: FLUX model name com pontos
**Sintoma**: API retorna 400 ou 422
**Causa**: SiliconFlow não aceita pontos no nome do modelo
```python
# ERRADO:
"model": "black-forest-labs/FLUX.1.1-pro"
# CORRETO:
"model": "black-forest-labs/FLUX-1.1-pro-Ultra"  # hífens
```

### BUG-003: FLUX — parâmetro `image_size`
**Sintoma**: Imagem gerada em resolução errada
**Causa**: `image_size` não funciona na API da SiliconFlow para FLUX
```python
# ERRADO:
{"image_size": "1920x1080"}
# CORRETO:
{"aspect_ratio": "16:9"}  # gera 2752×1536 nativo
```

### BUG-004: FFmpeg drawtext `alpha=` trava CPU fallback
**Sintoma**: FFmpeg roda indefinidamente sem concluir (CPU 100%, sem output)
**Causa**: Expressão `alpha='if(lt(t,...),0,...)'` em libx264 causa deadlock
```python
# ERRADO:
f"drawtext=...:alpha='if(lt(t,{end}),1,0)'"
# CORRETO:
f"drawtext=...:enable='between(t,{start},{end})'"
```

### BUG-005: NVENC silent failure
**Sintoma**: FFmpeg termina com exit code 0 mas arquivo tem 48 bytes
**Causa**: GPU NVENC falhou silenciosamente (VRAM cheia, sessão inválida)
**Fix**:
```python
if output_path.stat().st_size < 10_000:
    raise RuntimeError(f"NVENC silent failure: {output_path}")
```

### BUG-006: max_workers > 3 no RTX 3050 Ti
**Sintoma**: FFmpeg trava indefinidamente após ~100 slices; GPU deadlock
**Causa**: 4 GB VRAM insuficiente para 4+ sessões NVENC simultâneas
**Fix**: `MAX_SLICE_WORKERS = 3` em `perf_config.py` (NUNCA aumentar)

### BUG-007: executor.map() sem timeout
**Sintoma**: Pipeline para indefinidamente quando 1 slice trava
**Causa**: `executor.map()` bloqueia até o primeiro item completar em ordem
**Fix**: `timeout=120` em toda chamada `run_ffmpeg()` + subprocess kill

### BUG-008: Overlay JPEG sem canal alpha
**Sintoma**: FFmpeg trava ao tentar aplicar transparência em JPEG
**Causa**: JPEG não tem canal alpha → `colorchannelmixer=aa=` causa deadlock em CPU
**Fix**: Rejeitar arquivos `.jpg/.jpeg` em overlays — só aceitar `.png`

### BUG-009: ChatterboxTTS — segmentos longos
**Sintoma**: TTS gera sílabas aleatórias/ruído após ~200 chars
**Causa**: Chatterbox "perde atenção" em textos longos (alucinação de sílabas)
**Fix**: `SEGMENT_MAX_CHARS = 220` (NÃO usar 900+ como Edge-TTS)

### BUG-010: FFmpeg drawtext path Windows
**Sintoma**: FFmpeg falha silenciosamente com stderr vazio + timeout
**Causa**: Escape duplo `C\\:` inválido no path do Windows
```python
# ERRADO:
path.replace(':', '\\\\:')  # → C\\:/path/to/font.ttf (inválido)
# CORRETO:
str(path).replace('\\', '/')  # → C:/path/to/font.ttf
# E usar single quotes na filter_complex para proteger ":"
```

### BUG-011: Scene index offset com intro inválido
**Sintoma**: Cenas ficam dessincronizadas quando clips de intro são inválidos
**Causa**: `len(intro_clips)` conta arquivos inválidos (< 10KB) no índice
**Fix**: Usar `n_intro_valid` (contador incremental de clips válidos) para `scene_idx`

### BUG-012: Hook pool insuficiente
**Sintoma**: assembly_agent tenta usar `hk_34.mp4` mas wan_agent só gerou `hk_11.mp4`
**Causa**: manifest.json pode ter 370+ cenas mas wan_agent gera apenas ~109 hooks
**Fix**: Fallback pool de hooks válidos (size ≥ 10KB) — ciclar em loop se necessário

### BUG-013: `queries_to_try` indefinido no evidence_collector
**Sintoma**: TODAS as cenas ficam sem evidência visual (sem erro visível)
**Causa**: Variável `queries_to_try` nunca inicializada → `NameError` engolido por `asyncio.gather(return_exceptions=True)`
**Fix**: Construir lista explicitamente:
```python
queries_to_try = [q for q in [query, query_news, query_alt, query_alt2] if q]
```

### BUG-014: `_is_valid_image()` inexistente
**Sintoma**: Todos downloads de imagem falham silenciosamente
**Causa**: Função chamada em L745 mas nunca definida → `NameError` silencioso
**Fix**: Definir `_is_valid_image(path)` antes de `download_file()`

### BUG-015: Whisper — CUDA DLL issue RTX 3050 Ti
**Sintoma**: `ImportError: DLL load failed` ao usar Whisper com CUDA
**Causa**: Incompatibilidade de DLL CUDA com RTX 3050 Ti no Windows
**Fix**: Sempre usar `device="cpu", compute_type="int8"` para faster-whisper

### BUG-016: Windows cp1252 encoding
**Sintoma**: `UnicodeEncodeError` ao imprimir caracteres especiais (→, ★, etc.)
**Causa**: Terminal Windows usa cp1252 por padrão
**Fix**: Adicionar no início de todo script:
```python
sys.stdout.reconfigure(encoding='utf-8')
```
E usar `->` (ASCII) em vez de `→` (Unicode) em prints de debug.

### BUG-017: paths `"evidence/"` vs `"04_EVIDENCE/"`
**Sintoma**: Frames compostos ficam pretos (8.4KB = imagem preta)
**Causa**: Scripts usando `video_dir / "evidence"` em vez de `video_dir / "04_EVIDENCE"`
**Arquivos afetados**: `frame_composer.py` (4 ocorrências), `wan_agent.py` (1 ocorrência fallback)
**Fix**: Buscar `"evidence"` nos scripts e substituir por `"04_EVIDENCE"`

---

*Documento gerado em 2026-03-07 | Veritas & Gold YouTube Engine*
*Para atualizar: editar seções relevantes após cada sprint*
