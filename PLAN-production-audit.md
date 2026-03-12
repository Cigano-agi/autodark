# PLAN: Auditoria Geral de Produção, QA e SEO

Este plano visa garantir a estabilidade máxima do sistema de criação de vídeos, otimizar a visibilidade para motores de busca (tradicionais e IA) e prevenir regressões técnicas.

## 🎯 Escopo
1. **QA & Estresse:** Validação do pipeline de 6 passos contra falhas de IA.
2. **Orquestração:** Sincronia entre Prompts Customizados e Roteiros.
3. **SEO/GEO:** Otimização de saída da IA para viralização e citações.

---

## 🏗️ Fase 1: Auditoria Técnica (QA Automation)
*Agente: `qa-automation-engineer` | Skill: `webapp-testing`*

### Tarefas
- [ ] **[QA-01] Teste de Resiliência de JSON:**
    - **Entrada:** Resposta da IA com texto sujo antes/depois do JSON.
    - **Saída:** Pipeline continua operando sem erro de parsing.
    - **Verificação:** Rodar teste manual com idea complexa.
- [ ] **[QA-02] Verificação de Estado (Cleanup):**
    - **Entrada:** Iniciar novo vídeo após salvar um anterior.
    - **Saída:** Campos limpos e sem "vazamento" de roteiros antigos.
    - **Verificação:** Reiniciar fluxo e checar campos.
- [ ] **[QA-03] Auditoria de Performance (Build):**
    - **Ação:** `npm run build`
    - **Verificação:** Garantir que o bundle não tenha erros de tipagem ocultos.

---

## 🤖 Fase 2: Orquestração de Prompts
*Agente: `orchestrator` | Skill: `clean-code`*

### Tarefas
- [ ] **[ORC-01] Validação de Prioridade de Prompt:**
    - **Ação:** Criar um prompt "Estilo Documentário" e verificar se o Passo 3 (Roteiro) herda as diretrizes ignorando o padrão.
    - **Verificação:** Comparar saída com e sem prompt selecionado.
- [ ] **[ORC-02] Linkagem Prompts → Dashboard:**
    - **Ação:** Testar link "Prompts" no dashboard e garantir que o ID do canal é passado corretamente na URL.
    - **Verificação:** Navegar entre Canais e checar se os prompts mudam.

---

## 📈 Fase 3: SEO & GEO (Visibilidade)
*Agente: `seo-specialist` | Skill: `seo-fundamentals`*

### Tarefas
- [ ] **[SEO-01] Auditoria de Meta Tags:**
    - **Arquivo:** `index.html` e `src/App.tsx`.
    - **Ação:** Verificar se existem tags básicas (Title, Description, Favicon).
    - **Verificação:** Inspecionar head do site.
- [ ] **[GEO-02] Otimização de Saída IA (GEO):**
    - **Ação:** Ajustar o "System Prompt" do Passo 2 para incluir ganchos que AIs (ChatGPT, Perplexity) gostam de citar (estatísticas, definições claras).
    - **Verificação:** Analisar roteiro gerado sob a ótica de GEO.

---

## ✅ Fase X: Verificação Final
- [ ] Segurança: `python .agent/skills/vulnerability-scanner/scripts/security_scan.py .`
- [ ] UX Audit: `python .agent/skills/frontend-design/scripts/ux_audit.py .`
- [ ] Build Final: `npm run build`

---

## 🏁 Próximos Passos
1. Aprovar este plano.
2. Executar auditoria de QA no pipeline.
3. Aplicar melhorias de SEO/GEO.
