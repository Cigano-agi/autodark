# 🏭 MISSION: THE PURGE & SCALE
**Status:** 🔄 READY FOR EXECUTION
**Reference:** `docs/UX-SPEC-SDD.md` (Software Design Document v2.0)

## 🎯 Objetivo
Transformar o protótipo tático em uma plataforma profissional de gestão de redes de canais (50+ unidades), focando em estabilidade, clareza e escala industrial.

## 🛠️ Squad de Agentes
- `@ruthless-refactorer`: Dono da limpeza de código e modularização (SOLID).
- `@frontend-specialist`: Implementação da nova UI profissional e Cinematic Sync.
- `@backend-specialist`: Persistência de estado por cena (The Bunker Protocol).
- `@qa-automation-engineer`: Validação de resiliência (Crashes e F5).
- `@codebase_investigator`: Monitor de bugs e integridade de rotas.

## 📋 Backlog de Execução

### Fase 1: Purga Terminológica e Navegação (P0)
- [ ] **[FRONT]** Remover jargão "Dark Ops" de toda a interface.
- [ ] **[FRONT]** Unificar abas do canal para a estrutura de 5 itens (Analytics, Estratégia, Operações, Biblioteca, Configuração).
- [ ] **[ARCH]** Resolver o problema de Z-Index do Sidebar e garantir persistência do layout em sub-rotas.

### Fase 2: Protocolo Bunker (Persistência)
- [ ] **[BACK]** Implementar a tabela `production_states` com suporte a snapshots de cenas.
- [ ] **[FRONT]** Integrar `useProductionState` em todas as fases da Fábrica.
- [ ] **[ARCH]** Implementar o Auto-Resume ao detectar missões interrompidas.

### Fase 3: Fábrica Modular e Cinematic Sync
- [ ] **[FRONT]** Quebrar o wizard monolítico em componentes modulares (`Narrator`, `Director`, `Editor`, `Publisher`).
- [ ] **[FRONT]** Implementar o cálculo dinâmico de duração de cena baseado no áudio real.
- [ ] **[FRONT]** Adicionar transições baseadas em emoção extraída do script.

### Fase 4: Escala de Rede (Dashboard)
- [ ] **[FRONT]** Refatorar lista de canais para visualização em Pastas/Categorias.
- [ ] **[FRONT]** Implementar Busca Global e Ações em Massa (Batch Approval).

## 🏁 Critérios de Sucesso
- Interface profissional sem termos "militares" ou confusos.
- Gerenciamento fluido de dezenas de canais.
- Produção de vídeo que sobrevive a F5 e quedas de conexão.
- Sincronia áudio-visual perfeita sem tempos fixos de slide.
