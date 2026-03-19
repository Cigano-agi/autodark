# Plano: UI/UX Pro Max & TDD Workflow (AutoDark)

## 🎯 Objetivo Principal
Revolucionar a experiência do usuário (UX) e interface (UI) da plataforma AutoDark com base em psicologia cognitiva (Heurística do Afeto, Chunking, Viés do Status Quo e Redução de Fadiga de Decisão), garantindo estabilidade absoluta através de metodologias de testes TDD e End-to-End (E2E).

---

## 🧠 Soluções Cognitivas Aplicadas

### 1. Fadiga de Decisão & Chunking (Dividir para Conquistar)
- **Problema:** A criação de canais e a tela do *Studio Profundo* exigem preenchimento de múltiplos campos de uma vez, paralisando analiticamente o usuário.
- **Solução UX:** Transformar a "Criação de Canal" e o "Processo de Conteúdo" em *Wizards (Passo a Passo)*. Mostrar apenas o essencial no momento certo. Omitir opções avançadas atrás de um botão "Personalizar".

### 2. Viés do Status Quo (O Poder do Padrão)
- **Problema:** Excesso de opções de personalização sem recomendação clara.
- **Solução UX:** Pré-selecionar opções de mais alta conversão/eficiência (Ex: Modelo de IA pré-selecionado, limite ideal de caracteres, voz de narração mais bem avaliada). Adicionar copies curtas explicando o *benefício* daquela escolha ("*Recomendado: Garantia de melhor retenção no YouTube*").

### 3. Heurística do Afeto (Design Emocional)
- **Problema:** Fluxos puramente funcionais e frios.
- **Solução UX:** Criar interações de *Recompensa Visual* (micro-animações de sucesso ao gerar um roteiro), textos motivadores (ex: "Arquitetando um roteiro incrível..." ao invés de "Carregando..."). Humanizar a comunicação para criar apego e reduzir a percepção de espera.

---

## 🛠️ Fases de Implementação & Orquestração

### Fase 1: Fundação Test-Driven (TDD)
**Agent:** `test-engineer`
- Implementar configuração base de testes na aplicação (se não houver).
- Escrever testes E2E (`playwright_runner.py`) para os fluxos felizes atuais antes da refatoração.
- Escrever os testes falhos para os *novos* componentes Wizard (`CreateChannelWizard`, `StudioWizard`).

### Fase 2: Redesign Frontend (Chunking & Status Quo)
**Agent:** `frontend-specialist` + `performance-optimizer`
- Refatorar a criação de canal para multi-steps (Ex: Passo 1: Nome/Nicho → Passo 2: IA Padrão/Customizada).
- Refatorar o `LongVideoStudio.tsx` num fluxo guiado (Passo 1: Ideia → Passo 2: Roteiro → Passo 3: Áudio final).
- Aplicar os preceitos do Design System (`bg-card`, espaçamentos consistentes, tipografia menos genérica).

### Fase 3: Feedback Emocional & Validação
**Agent:** `seo-specialist` + `test-engineer`
- Injetar feedback afetivo nas lógicas (toasts animados, loading states com mensagem contextual).
- Rodar o checklist final (`ux_audit.py`, `playwright_runner.py`) para confirmar as mudanças da Fase 2 e o TDD.

---

## 🚦 Critérios de Aceitação
- [ ] Todo processo de criação novo exige que o usuário tome no máximo **2 decisões cruciais** por tela.
- [ ] As opções que garantem sucesso (Status Quo) estão marcadas como "Recomendado" com pre-selected visual.
- [ ] Testes automatizados estão escritos e passando para as lógicas fundamentais dos *Wizards*.
- [ ] O fluxo emocionalmente satisfaz os princípios da heurística do afeto.
