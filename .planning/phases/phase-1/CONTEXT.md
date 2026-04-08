# Phase 1 Context — Pipeline Debug & Estabilização

## Goal
Identificar e corrigir todos os pontos de falha no pipelineOrchestrator e nas etapas de geração, para que o pipeline execute de ponta a ponta sem crash.

## Key Files
- `src/agents/pipelineOrchestrator.ts` — orquestrador principal (runSemiAuto)
- `src/agents/scripterAgent.ts` — geração de roteiro via OpenRouter
- `src/agents/narratorAgent.ts` — TTS via AI-33
- `src/agents/visualAgent.ts` — imagens via Kie.ai
- `src/agents/seoAgent.ts` — SEO metadata
- `src/hooks/useProductionState.ts` — persistência de estado
- `src/lib/storage.ts` — upload de áudio/imagem para Supabase Storage
- `src/pages/Production/Index.tsx` — UI de produção

## Known Issues (from CONCERNS.md)
- Pipeline trava silenciosamente — sem feedback de erro útil ao usuário
- Estado não persiste no reload (refresh perde progresso)
- Foundation Blocos C/D/E são stubs — pipeline não tem context completo
- `withTimeout` existe mas erros podem engolir stack trace
- `Artefato ${done}/${total}` ainda aparece internamente (log string militar)

## Success Criteria
- Operador insere tema → pipeline roda → chega em `stage: "done"` sem crash
- Cada etapa exibe progresso real e mensagens de erro úteis
- Erro de API (ex: Kie.ai down) não trava a UI — mostra mensagem e permite retry
