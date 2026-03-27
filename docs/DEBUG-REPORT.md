# 🔍 AutoDark — Debug Report & Issues Encontrados

> **Data:** 2026-03-18 | **Metodologia:** Systematic Debugging (4-Phase)

---

## 🔴 CRÍTICOS (Bloqueiam funcionalidade)

### BUG-001: AI33 API retorna 401 Unauthorized
- **Sintoma:** Console mostra `401 Unauthorized` em `/api-ai/v1/chat/completions`
- **Impacto:** Title generation no Production wizard falha via AI33
- **Workaround atual:** Frontend faz fallback para OpenRouter (funciona)
- **Root Cause:** A chave `VITE_AI33_API_KEY` no `.env` está expirada ou inválida
- **Fix:** Renovar chave em ai33.pro ou remover e usar apenas OpenRouter
- **Arquivos:** `vite.config.ts` (proxy `/api-ai`), Production/Index.tsx

### BUG-002: `generate-kie-flow` está em MOCK MODE
- **Sintoma:** Edge Function retorna dados fake (Unsplash images, w3schools MP4)
- **Impacto:** O botão "Automação End-to-End (Kie.ai)" no wizard não gera conteúdo real
- **Root Cause:** A implementação real da API Kie.ai está comentada (linhas 77-96)
- **Fix:** Implementar chamada real usando `KIE_API_KEY`
- **Arquivo:** `supabase/functions/generate-kie-flow/index.ts`

### BUG-003: `youtube-generate-audio` sem fallback
- **Sintoma:** Se AI33 cair, TTS não funciona (sem fallback server-side)
- **Impacto:** Step 3 do wizard pode falhar, leaving user stuck
- **Root Cause:** Usa apenas `AI33_API_KEY`, sem cadeia de fallback
- **Fix:** Adicionar fallback para OpenAI TTS ou ElevenLabs
- **Arquivo:** `supabase/functions/youtube-generate-audio/index.ts`

---

## 🟡 MÉDIOS (Degradam experiência)

### BUG-004: CORS restrito no `youtube-long-engine`
- **Sintoma:** `ALLOWED_ORIGIN` hardcoded como `http://localhost:5173`
- **Impacto:** Studio Longo pode falhar se Vite usar outra porta (5174, 5177, 5179...)
- **Root Cause:** Usa env var `ALLOWED_ORIGIN` com default `5173`, mas não `*`
- **Fix:** Usar `"*"` no CORS (como as outras Edge Functions fazem) ou listar todas as portas
- **Arquivo:** `supabase/functions/youtube-long-engine/index.ts:4`

### BUG-005: Blueprint não criado automaticamente para novos canais
- **Sintoma:** Canal "Canal Teste Video" não tem blueprint → todas as queries retornam null
- **Impacto:** Todas as edge functions usam `blueprint?.field || default` — funciona mas sem personalização
- **Root Cause:** `Dashboard.tsx:handleAddChannel` cria canal mas NÃO cria blueprint automaticamente
- **Fix:** Ao criar canal, também inserir um `channel_blueprints` row com defaults
- **Arquivo:** `src/pages/Dashboard.tsx:65-91`

### BUG-006: `generate-ideas` usa `channel_contents` em vez de `content_ideas`
- **Sintoma:** Ideias geradas gravam em `channel_contents` (status "idea_generated")
- **Impacto:** Tab "Ideias AI" no ChannelView puxa de `content_ideas` (hook separado!) → mostra vazio
- **Root Cause:** Dois sistemas paralelos: `content_ideas` (tabla separada) vs `channel_contents` com status
- **Fix:** Decidir qual usar. O `generate-ideas` grava em `channel_contents`, mas `useContentIdeas` puxa de `content_ideas`
- **Arquivos:** `supabase/functions/generate-ideas/index.ts:146-161`, `src/hooks/useContentIdeas.tsx`

### BUG-007: `useAuth` `(channel as any)` type assertions
- **Sintoma:** TypeScript usando `(channel as any)` em `ChannelView.tsx`
- **Impacto:** Sem type safety, pode causar runtime errors silenciosos
- **Root Cause:** Types Supabase desatualizados — não incluem campos como `last_scraped_at`
- **Fix:** Regenerar types com `supabase gen types typescript` e atualizar interface
- **Arquivo:** `src/pages/ChannelView.tsx:100,109,113,163`

---

## 🟢 MENORES (Cosméticos / DX)

### BUG-008: Cabeçalho sticky sobrepõe conteúdo
- **Sintoma:** Ao scrollar no ChannelView, o header fica fixo mas as tabs ficam abaixo do fold
- **Impacto:** Usuário precisa scrollar muito para ver o conteúdo de cada tab
- **Fix:** Reduzir padding ou usar sticky tabs

### BUG-009: Channel card mostra "YOUTUBE AUTOMATION" hardcoded
- **Sintoma:** Dashboard ChannelFolder mostra "YOUTUBE AUTOMATION" em vez do niche real
- **Impacto:** Minor UX confusion
- **Root Cause:** O componente `ChannelFolder` pode não estar recebendo niche como prop
- **Fix:** Passar `channel.niche` como prop para o ChannelFolder

### BUG-010: Production wizard não preserva state ao recarregar
- **Sintoma:** Refresh da página perde todo o progresso do wizard
- **Impacto:** Usuário perde roteiro, imagens, tudo
- **Fix:** Salvar state em localStorage ou como draft no Supabase

---

## 📊 Matriz de Risco

| Bug | Severidade | Probabilidade | Prioridade |
|-----|-----------|---------------|------------|
| BUG-001 | Alta | 100% (já acontece) | 🔴 P0 |
| BUG-002 | Alta | 100% (mock mode) | 🔴 P0 |
| BUG-006 | Alta | 100% (dados em tabelas erradas) | 🔴 P0 |
| BUG-005 | Média | Alta (todo canal novo) | 🟡 P1 |
| BUG-003 | Alta | Condicional (se AI33 cair) | 🟡 P1 |
| BUG-004 | Média | Alta (porta dinâmica) | 🟡 P1 |
| BUG-007 | Baixa | Baixa (TS only) | 🟢 P2 |
| BUG-008 | Baixa | 100% | 🟢 P2 |
| BUG-009 | Baixa | 100% | 🟢 P2 |
| BUG-010 | Média | Alta | 🟡 P1 |

---

## ✅ Coisas que FUNCIONAM corretamente

- [x] Login com email/senha via Supabase Auth
- [x] Dashboard carrega canais reais do banco
- [x] ChannelView com 8 tabs navegáveis
- [x] Blueprint form salva corretamente
- [x] Wizard de Produção: Steps 1-3 (Ideia → Roteiro → Narração)
- [x] Title generation via IA (com fallback)
- [x] Script generation via IA (com fallback)
- [x] Studio Longo: Ideação → Refinamento → Renderização
- [x] Video assembly no browser (canvas + MediaRecorder)
- [x] Ken Burns effect (zoom 8%)
- [x] Yellow subtitles com black stroke
- [x] Concorrentes tab renderiza corretamente
- [x] Prompts CRUD funcional
