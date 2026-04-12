# PLAN: PURGE & SCALE — AutoDark Studio v2.0

**Data:** 2026-04-07  
**Versão:** SDD v2.0  
**Objetivo:** Escalar para 50+ canais com interface profissional, terminologia limpa e Auto-Resume de cena granular.

---

## STATUS POR FASE

| Fase | Descrição | Status |
|------|-----------|--------|
| 1 | Navigation & Terminology Purge | ✅ COMPLETO |
| 2 | The Persistence Bunker | ✅ COMPLETO |
| 3 | The Modular Factory | 🔄 EM ANDAMENTO |
| 4 | Network Scalability | 🔜 PENDENTE |

---

## FASE 1 — Navigation & Terminology Purge ✅

### Concluído
- [x] `Channel/Index.tsx` — 5-tab structure (Analytics, Estratégia, Fábrica, Concorrentes, Configuração)
- [x] `Dashboard.tsx` — "Rede de Canais · Ativa", "Adicionar Canal", busca global
- [x] Tab persistence via `useSearchParams` (F5-safe)
- [x] Sidebar z-index — BeamsBackground movido para `fixed inset-0 pointer-events-none`
- [x] Breadcrumb "Quartel General" → "Dashboard"
- [x] Jargão tático removido de `pipelineOrchestrator.ts` e `llm.ts`

### Bugs Resolvidos
- BUG-010: Sidebar desaparecia em modais → FIXED (AppLayout stacking context)
- BUG-011: Header buttons → NOT A BUG (handlers corretos)
- BUG-012: Route context loss → FIXED (mesma root cause BUG-010)
- BUG-013: Black text → NOT PRESENT (codebase limpo)

---

## FASE 2 — The Persistence Bunker ✅

### Concluído
- [x] Tabela `production_states` — UNIQUE(channel_id), step, status, data JSONB
- [x] Colunas de cena adicionadas: `scenes JSONB`, `total_scenes INTEGER`, `completed_scenes INTEGER`
- [x] Hook `useProductionState` — load inicial, Realtime subscription, upsert
- [x] Funções: `save()`, `saveData()`, `saveScene()`, `reset()`
- [x] `pipelineOrchestrator.ts` — `saveProductionState()` após cada step (1, 2, 2.5, 3, 4, 4.5, 6)
- [x] `QueueTab.tsx` — Auto-Resume banner quando status é 'running'/'paused'
- [x] Edge function `generate-ideas` — deployada com fallback AI33 → OpenRouter

### Tabela `production_states`
```sql
-- Colunas existentes
id UUID, channel_id UUID (UNIQUE), user_id UUID
step NUMERIC, status TEXT, data JSONB
-- Adicionadas em 2026-04-07
scenes JSONB DEFAULT '[]'
total_scenes INTEGER DEFAULT 0
completed_scenes INTEGER DEFAULT 0
updated_at TIMESTAMPTZ
```

### `SceneSnapshot` Interface
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

---

## FASE 3 — The Modular Factory 🔄

### Concluído
- [x] `src/components/factory/SceneCard.tsx` — card de cena individual (thumbnail 16:9, áudio, status)
- [x] `src/components/factory/index.ts` — barrel export

### Pendente
- [ ] `src/components/factory/Narrator.tsx` — step de narração isolado com preview de áudio
- [ ] `src/components/factory/Director.tsx` — step de geração visual com galeria de imagens
- [ ] `src/components/factory/Editor.tsx` — montagem e timeline de cenas
- [ ] `src/components/factory/Publisher.tsx` — SEO, thumbnail, publicação
- [ ] Integrar `saveScene()` no orchestrator — chamar após cada cena processada
- [ ] Auto-Resume no `Production/Index.tsx` — detectar `production_states` ao montar e oferecer "Retomar"
- [ ] Cinematic Sync — duração de cena = duração de áudio + padding, transições por `emotion`

### Integração `saveScene()` no Pipeline (próximo passo)
Em `pipelineOrchestrator.ts`, após `generateAllNarrations()`, para cada cena:
```typescript
await saveScene({
  chapterIndex: ci,
  sceneIndex: si,
  status: "audio_done",
  audioUrl: scene.audioUrl,
  durationSec: scene.durationSec,
}, totalScenes);
```

---

## FASE 4 — Network Scalability 🔜

- [ ] Dashboard "Channel Explorer" — folders por nicho/status com indicadores ("3 produzindo")
- [ ] Ações em lote — "Aprovar todas as ideias", "Gerar batch de vídeos"
- [ ] Global search — header com jump para qualquer canal ou vídeo específico
- [ ] `PipelineProgress.tsx` — floating badge com progresso ativo (criado, integrar no AppLayout)

---

## EDGE FUNCTIONS — STATUS DE DEPLOY

| Função | Status | Versão |
|--------|--------|--------|
| `chat-completions` | ✅ ATIVO | v2 (AI33 → OpenRouter) |
| `youtube-generate-audio` | ✅ ATIVO | v1 (AI33 → OpenAI TTS) |
| `generate-kie-flow` | ✅ ATIVO | v1 (Kie.ai → Pollinations) |
| `generate-ideas` | ✅ ATIVO | v1 (AI33 → OpenRouter) |
| `generate-script` | ⚠️ LOCAL | Precisa deploy |
| `process-content-audio` | ⚠️ LOCAL | Precisa deploy |

---

## PENDÊNCIAS CRÍTICAS

| Item | Prioridade | Responsável |
|------|-----------|-------------|
| OPENAI_API_KEY no Supabase secrets (TTS fallback) | 🔴 ALTA | Usuário (manual) |
| Integrar `saveScene()` no orchestrator por cena | 🔴 ALTA | backend-specialist |
| Auto-Resume em `Production/Index.tsx` | 🟡 MÉDIA | frontend-specialist |
| Deploy `generate-script` edge function | 🟡 MÉDIA | backend-specialist |
| Narrator/Director/Editor/Publisher components | 🟡 MÉDIA | frontend-specialist |
| Smoke test E2E completo (login → vídeo) | 🟡 MÉDIA | qa-automation-engineer |
| Channel Explorer com folders | 🟢 BAIXA | frontend-specialist |

---

## CONFIGURAÇÃO DO SUPABASE_ACCESS_TOKEN (Ação Manual Necessária)

Para ativar o fallback TTS:
1. Acessar: https://app.supabase.com/project/mldbflihdejmddmapwnz/settings/functions
2. Adicionar secret: `OPENAI_API_KEY` = sua chave OpenAI
3. O edge function `youtube-generate-audio` já tem o código de fallback implementado
