# PLAN UI Overhaul & YouTube Publish integration

## Goal
Elevar radicalmente o contraste UI/Aesthetics das páginas internas (Foundation, Production Pipeline) baseado no App Paper e finalizar o Workflow de Revisão + Publicação YouTube (GSD Phase 4 real).

## Tasks
- [ ] Task 1: Refatorar o Design System e Tokens de Contraste → Verify: `index.css` reflete os estilos do Paper.
- [ ] Task 2: Polimento Visual do Channel Header e Tabs → Verify: UI interna do `ChannelView.tsx` com contraste Premium (Neon, Glassmorphism fix).
- [ ] Task 3: Overhaul das telas `Production/Index.tsx` e `Foundation/Index.tsx` → Verify: Inputs form, states, skeletons todos renderizando consistentes (sem backgrounds invisíveis).
- [ ] Task 4: UI de Fila de Revisão (QueueTab) → Verify: Clicks de "Aprovar Vídeo" disponíveis e bonitos.
- [ ] Task 5: Integração com API YouTube (Phase 4 do ROADMAP) → Verify: O vídeo exportado pelo FFmpeg dispara trigger de upload na API v3 (status: publicado).

## Done When
- [ ] Todas as páginas secundárias estão visualmente premium (nível do Dashboard).
- [ ] O fluxo do Pipeline conecta legitimamente no YouTube e joga o vídeo na infra de publicação.
