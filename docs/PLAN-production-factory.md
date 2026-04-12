# 🏭 MISSION-SYNC: PRODUCTION FACTORY (AutoDark)
**Status:** 🔄 PLANNING
**Task Slug:** `production-factory`

## 🎯 Objetivo Principal
Transformar o AutoDark em uma verdadeira fábrica de conteúdo automatizada, com persistência de estado à prova de falhas e uma interface de "Mission Control" que utiliza a metáfora de uma esteira de produção.

## 🛠️ Agentes Envolvidos
- `@orchestrator`: Coordenação global e sincronização de estado.
- `@product-owner`: Governança de requisitos e critérios de aceitação.
- `@codebase_investigator`: Mapeamento de rotas e botões quebrados.
- `@backend-specialist`: Implementação da persistência `production_states` no Supabase.
- `@frontend-specialist`: UI/UX Factory, Estética Premium, Correção de Contraste.
- `@qa-automation-engineer`: Testes E2E de cabo a rabo (Playwright).

## 📋 Task Breakdown

### Fase 1: Fundação e Persistência (Back-end)
- [ ] **[BACK]** Criar/Validar tabela `production_states` no Supabase.
- [ ] **[BACK]** Implementar RLS para garantir que um canal só tenha 1 estado ativo.
- [ ] **[FRONT]** Integrar o hook `useProductionState` em todas as etapas do wizard.

### Fase 2: Visual Factory & Design System (Front-end)
- [ ] **[FRONT]** Refatorar `Production/Index.tsx` para a metáfora da **Esteira de Vidro**.
- [ ] **[FRONT]** Implementar efeito `faded-text` com suporte a Markdown para headlines geradas em tempo real.
- [ ] **[FRONT]** Correção de Contraste: Eliminar `text-black` e substituir por `text-white` ou `text-muted-foreground`.
- [ ] **[FRONT]** Tradução e Localização: Trocar termos técnicos em inglês por terminologia de "Dark Channels" (Ex: "Mission" -> "Operação", "Unit" -> "Canal").

### Fase 3: Rota e Navegação (Arquitetura)
- [ ] **[INVESTIGATOR]** Mapear por que o Sidebar some em modais do Dashboard.
- [ ] **[FRONT]** Unificar todas as telas sob o `AppLayout` sem perda de contexto.
- [ ] **[FRONT]** Corrigir botões zumbis: Conectar YouTube, Novo Vídeo, Studio Longo.

### Fase 4: Validação Total (QA)
- [ ] **[QA]** Script Playwright: Login -> Criar Canal -> Gerar Vídeo -> F5 (Persistência) -> Finalizar.
- [ ] **[QA]** Script Playwright: Dashboard -> Global Queue -> Revisar -> Aprovar Vídeo.

## 📄 Especificações Técnicas (Specs)
- `docs/SPEC-FACTORY-VISUAL.md`
- `docs/SPEC-MISSION-PERSISTENCE.md`
- `docs/SPEC-ROUTE-HEALING.md`

## 🏁 Critérios de Aceite
- O progresso da IA não é perdido ao fechar a aba ou navegar.
- A produção é visualmente acompanhável como uma esteira de fábrica.
- Todos os botões do cabeçalho do canal executam suas funções.
- O app é 100% legível em Dark Mode (sem texto preto em fundo preto).
