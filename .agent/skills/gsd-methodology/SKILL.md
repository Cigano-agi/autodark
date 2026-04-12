---
name: gsd-methodology
description: Implementa o framework "Get Shit Done" (GSD) para desenvolvimento de alta velocidade orientado a especificações.
---

# GSD: Get Shit Done Methodology

## Mandatos Principais
- **Engenharia de Contexto:** Você DEVE manter a janela de contexto enxuta. Use sub-agentes ou sessões limpas para implementação para evitar a "podridão do contexto".
- **Execução Baseada em Especificações (Spec-Driven):** Nunca faça "vibecoding". Cada mudança deve ser mapeada para um requisito e um plano verificado.
- **Commits Atômicos:** Cada tarefa atômica DEVE resultar em um único commit git cirúrgico.
- **Sem "Teatro Corporativo":** Evite processos pelo simples prazer de processar. Foque em entregas técnicas, não em "cerimônias" (Sprints, Story Points, etc).

## Fluxo de Trabalho Passo a Passo

### 1. Pesquisa (Mapeamento de Codebase)
- **Ação:** Use `grep_search` e `glob` para mapear o estado atual.
- **Objetivo:** Identificar arquitetura, convenções e possíveis armadilhas antes de planejar.
- **Regra:** Se o codebase já existe (brownfield), você DEVE rodar uma análise abrangente primeiro.

### 2. Estratégia (Contexto e Planejamento)
- **Discussão:** Faça perguntas direcionadas para revelar "áreas cinzentas" (densidade da UI, tratamento de erros de API, casos de borda).
- **Contexto:** Documente estas decisões em um artefato `CONTEXT.md` ou similar.
- **Planejamento:** Divida a fase em 2-3 planos de tarefas atômicas usando estruturas similares a XML.
- **Verificação:** Valide que os planos cobrem todos os requisitos antes de passar para a execução.

### 3. Execução (Implementação em Ondas)
- **Ondas:** Agrupe tarefas em "ondas".
    - **Paralelo:** Funcionalidades independentes (ex: dois componentes de UI diferentes).
    - **Sequencial:** Funcionalidades dependentes (ex: endpoint de API antes da UI que o consome).
- **Isolamento:** Cada tarefa deve, idealmente, ser executada em um contexto fresco para garantir a máxima inteligência do modelo.

### 4. Validação (UAT e Diagnóstico)
- **Automatizada:** Rode testes e linting imediatamente após cada tarefa.
- **UAT Manual:** Apresente entregas testáveis ao usuário.
- **Diagnóstico:** Se uma funcionalidade falhar, não depure manualmente. Gere uma sub-tarefa de "debugger" para diagnosticar e criar um plano de correção verificado.

## Estilo de Comunicação
- **Tom:** Profissional, direto e cínico em relação ao inchaço (bloat).
- **Intake:** Seja Socrático. Se um requisito for vago, PARE e peça esclarecimentos.
- **Relatórios:** Foque no "o que mudou" e "por que está verificado". Sem enchimento conversacional.

## A "Regra de 3" do GSD
1. **3 Planos Atômicos:** Nunca planeje mais de 3 tarefas principais de uma vez para evitar o inchaço do contexto.
2. **Verificação de 3 Vias:** Verifique via (1) Testes Automatizados, (2) Auditoria de Código e (3) Aceitação do Usuário (UAT).
3. **3 Linhas de Texto:** Mantenha as atualizações de status em 3 linhas ou menos, a menos que esteja fornecendo especificações técnicas.
