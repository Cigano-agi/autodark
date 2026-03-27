# 🏭 PLAN: Mass Production Factory & Scalable Engine

**Objetivo:** Transformar o AutoDark de um Wizard Linear em uma linha de montagem automatizada capaz de gerenciar 5+ canais e 50+ vídeos em paralelo.

---

## 🏗️ Milestone 1: Infraestrutura de Escala (Backend & Storage)
*Foco: Sair dos Blobs locais e garantir persistência real.*

- [ ] **Task 1.1: Supabase Bucket Setup.** Criar lógica para que toda imagem gerada pelo Kie.ai/DALL-E seja salva em um bucket `content-assets` organizado por `channel_id/content_id/`.
- [ ] **Task 1.2: Persistent Workflow State.** Adicionar coluna `workflow_state` (JSONB) na tabela `channel_contents` para salvar o progresso exato da produção no banco, não apenas no LocalStorage.
- [ ] **Task 1.3: Real Kie Polling.** Implementar um worker (Edge Function) que faça o polling do Kie.ai e atualize o status do conteúdo para `production_ready` sem exigir que o usuário esteja com a aba aberta.

## 🚀 Milestone 2: Batch Processing UI (Produção em Massa)
*Foco: Permitir que o usuário aprove 10 ideias e a IA faça o trabalho pesado.*

- [ ] **Task 2.1: Multi-Select Ideas.** Refatorar a aba "Ideias AI" para permitir seleção múltipla.
- [ ] **Task 2.2: "Produce Batch" Action.** Botão que dispara a geração de Roteiro + Narração + Cenas para todos os itens selecionados em background.
- [ ] **Task 2.3: Production Dashboard.** Uma nova visão de "Fila de Processamento" com barras de progresso reais para cada vídeo sendo gerado.

## 🎬 Milestone 3: Subtitles Pro & Retention Engine (UX do Editor)
*Foco: Vídeos que prendem a atenção (Estética de Canais Dark de Elite).*

- [ ] **Task 3.1: Keyword Highlighting.** Atualizar o `useVideoAssembler` para suportar tags de cor, ex: `Isso é [SURPREENDENTE]`. O que estiver entre colchetes deve ser renderizado em **Vermelho** ou **Verde**.
- [ ] **Task 3.2: Dynamic Zoom Patterns.** Adicionar suporte a diferentes tipos de movimento (Zoom In, Zoom Out, Pan Left/Right) por cena, em vez de apenas o zoom central fixo.
- [ ] **Task 3.3: Audio Normalization.** Garantir que a narração e a música de fundo (Blueprint) sejam mixadas com níveis de volume profissionais no assembler.

## ☁️ Milestone 4: Server-Side Rendering (Renderização em Nuvem)
*Foco: Tirar o peso do PC do usuário.*

- [ ] **Task 4.1: FFmpeg Edge implementation.** Pesquisar e prototipar a renderização server-side para que o WebM seja gerado no servidor e o usuário apenas receba uma notificação: "Vídeo Pronto".

---

## 🛠️ Atribuição de Agentes (Orchestration)

- `backend-specialist`: Tasks 1.1, 1.3, 4.1
- `frontend-specialist`: Tasks 2.1, 2.2, 2.3, 3.1, 3.2
- `orchestrator`: Coordenação de estados do banco e fluxo de fallback.
- `test-engineer`: Verificação de integridade de buckets e mixagem de áudio.
