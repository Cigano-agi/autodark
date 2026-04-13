# Roadmap — AutoDark

## Milestone 1: Studio Funcional
**Objetivo:** Um operador consegue gerar um vídeo MP4 real de ponta a ponta.

---

### Phase 1 — Pipeline Debug & Estabilização
**Goal:** Identificar e corrigir todos os pontos de falha no pipelineOrchestrator e nas etapas de geração.

Plans:
- 1.1 — Auditar pipelineOrchestrator: mapear onde o pipeline trava ou falha silenciosamente
- 1.2 — Corrigir geração de roteiro (scripterAgent): validar output, tratar erros de API
- 1.3 — Corrigir TTS/narração (narratorAgent): validar upload de áudio, sincronização
- 1.4 — Corrigir geração de imagens (visualAgent/kie.ai): validar upload, fallback se falhar
- 1.5 — Corrigir SEO agent: validar output, tratar edge cases

Deliverable: Pipeline executa do início ao fim sem crash em condição normal.

---

### Phase 2 — Studio Integration
**Goal:** LongVideoStudio recebe output do pipeline e exporta MP4 real.

Plans:
- 2.1 — Conectar LongVideoStudio ao pipelineOrchestrator (passar estado corretamente)
- 2.2 — Validar Remotion Player: preview com áudio sincronizado funcionando
- 2.3 — Validar FFmpeg.wasm export: MP4 H.264 landscape 16:9 com legendas
- 2.4 — Download do arquivo final no browser

Deliverable: Botão "Iniciar Montagem Final" exporta MP4 real e baixável.

---

### Phase 3 — Foundation Blocks C/D/E
**Goal:** Foundation completa — todos os 5 blocos implementados e conectados ao pipeline.

Plans:
- 3.1 — Implementar Bloco C (Performance Stack): APIs, render config, quality settings
- 3.2 — Implementar Bloco D (Radar Viral): seed channels, narrative structure
- 3.3 — Implementar Bloco E (Diferenciação): defensive moat, consistency rules
- 3.4 — Conectar directives geradas ao pipelineOrchestrator (usa foundation como context)

Deliverable: Foundation de 5 blocos completa, directives impactam qualidade do vídeo.

---

### Phase 4 — Review Queue & YouTube Publish
**Goal:** Vídeo gerado entra em fila de revisão, aprovado vai pro YouTube.

Plans:
- 4.1 — Review queue no canal: vídeo gerado aparece com preview + ações (aprovar/rejeitar)
- 4.2 — Integração YouTube API: upload com title/description/tags do SEO
- 4.3 — Status de publicação visível na interface
- 4.4 — Notificação ao operador quando upload concluir

Deliverable: Fluxo completo — tema → vídeo → aprovação → YouTube.

### Phase 5 — Arquitetura Assíncrona (Background Job Queue)
**Goal:** Refatorar o pipelineOrchestrator para modelo async baseado em background jobs — eliminar timeouts e perda de progresso ao fechar a aba.

**Plans:** 5 plans

Plans:
- [ ] 05.1-PLAN.md — Migration DB: formalizar production_states + adicionar errorCount e status "processing" na interface SceneSnapshot
- [ ] 05.2-PLAN.md — Edge Function worker-generate-visuals: busca 5 cenas pending, gera via AI33 SeedDream, salva no Storage, atualiza status com retry logic
- [ ] 05.3-PLAN.md — Frontend ping loop: runVisualWorker() invoca o worker em loop até esvaziar a fila (com testes unitários)
- [ ] 05.4-PLAN.md — Refatorar pipelineOrchestrator: integrar saveScene + runVisualWorker + auto-resume via useEffect
- [ ] 05.5-PLAN.md — Ajustar useVideoAssembler: loadImageWithFallback silencioso + guard de 80% de cenas com imagem

Deliverable: Pipeline roda 100% em background — fechar a aba não perde progresso, UI atualiza via Realtime.

---

## Backlog (pós-Milestone 1)
- Otimização de custo (estimativa antes de gerar)
- Multi-canal batch production
- Analytics de performance (views, CTR)
- Melhoria de qualidade de imagem (estilos customizados por canal)
