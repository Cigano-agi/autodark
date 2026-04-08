# Plan 1.1 — Auditar pipelineOrchestrator

## Objective
Mapear todos os pontos onde o pipeline pode travar, falhar silenciosamente ou dar erro inútil. Produzir um relatório de bugs priorizados.

## Steps

### 1. Ler pipelineOrchestrator.ts completo
- Mapear o fluxo: `runSemiAuto` → cada `update()` → cada `withTimeout()`
- Identificar: onde erros são silenciados (catch sem rethrow), onde `update()` não é chamado em caso de falha, onde o stage fica preso

### 2. Verificar cada agente
Para cada agente (scripter, narrator, visual, seo):
- O que acontece se a API retorna erro 4xx/5xx?
- O que acontece se o timeout dispara?
- O retorno está sendo validado antes de usar?

### 3. Verificar storage.ts
- `uploadAudio` e `uploadImage` — tratam erros de Supabase Storage?
- Se upload falha, o pipeline continua ou trava?

### 4. Verificar useProductionState.ts
- O estado persiste no localStorage/sessionStorage?
- Refresh do browser perde o progresso? Se sim, como recuperar?

### 5. Produzir lista de bugs
Formato:
```
BUG-001: [arquivo:linha] Descrição do problema → impacto → fix sugerido
```

## Deliverable
`docs/pipeline-audit.md` com lista priorizada de bugs encontrados.

## Acceptance Criteria
- [ ] Todos os 5 agentes auditados
- [ ] storage.ts auditado
- [ ] useProductionState.ts auditado
- [ ] Lista de bugs com severidade (critical/high/medium)
