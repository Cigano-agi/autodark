# 🎬 Arquitetura Assíncrona AutoDark (Background Job Queue)

> **Situação Atual:** O orchestrator (`pipelineOrchestrator.ts`) mantém o request aberto no navegador enquanto as Edge Functions são chamadas sequencial ou paralelamente. Isso causa timeouts da Vercel/Supabase (max 150-400s) e perde o progresso se a aba for fechada.
> **Novo Modelo:** O orchestrator salva as tarefas pendentes na tabela de `production_states`. Uma esteira assíncrona baseada em lotes pega um pedaço do trabalho por vez, executa, e salva. O Frontend apenas assina as atualizações via Realtime para mostrar a barra de progresso.

---

## 1. Banco de Dados (Source of Truth)

O AutoDark já possui uma excelente fundação em `useProductionState.ts` e na tabela `production_states`.

Nós vamos garantir que as dependências do vídeo residam como tarefas ali.

### Alteração Necessária
- O campo JSONB `data` (ou `scenes`) da tabela `production_states` rastreará os objetos do tipo `SceneSnapshot`.
- Um script visual deve ser quebrado não mais na RAM do React, mas salvo na tabela. 
- Cada frame a ser desenhado/gerado terá o campo:
  `{ status: "pending" | "processing" | "done" | "error", imageUrl: string, errorCount: number }`

---

## 2. Padrão de Fila com Batch Workers (Server-Side)

### O "Worker" (Nova Edge Function)
Criaremos uma Edge Function chamada `worker-generate-visuals`.

**Escopo e Regras:**
1. Quando chamada, a função lê a tabela `production_states` focando no projeto/video atual.
2. Ela busca: `"Dê-me um máximo de 5 cenas com status='pending' deste projeto"`.
3. Atualiza o banco para `status='processing'` para essas 5 cenas.
4. Faz a comunicação com a API (AI33 SeedDream) e tenta gerar as 5 imagens de forma simultânea (*Promise.all*).
5. Se der erro, atualiza a cena para `status='error'` e incremente `errorCount`. Se falhar muito, vai para `fatal_error`.
6. Se funcionar, salva a imagem, faz o upload no *Supabase Storage*, e atualiza a cena com `status='done'` + URL final.

**Duração:** Processar 5 imagens demora ~2 minutos, garantindo que o `worker-generate-visuals` termine **sempre** dentro do limite seguro de 150s~400s das Edge Functions, e que nunca falhe por esgotamento de tempo.

---

## 3. Gatilho de Processamento Assíncrono

Para que o servidor rode isso "sozinho", nós temos 2 opções. Vamos priorizar a **A** (mais fácil de testar via Frontend) combinada com a **B** (true background):

### Opção A: Ping Orchestrator (Pulseira Eletrônica)
Se não quisermos alterar o banco de dados SQL com crons complexos:
O próprio frontend, logo que salva as cenas como pending, entra num loop leve:
```typescript
while (true) {
  const { data: scenes } = await supabase.from('production_states').select('scenes').eq('channel_id', channelId).single();
  const hasPending = scenes.some(s => s.status === 'pending');
  if (!hasPending) break; // Terminou

  // Aciona o worker do servidor para processar 1 lote por vez.
  await supabase.functions.invoke('worker-generate-visuals', { body: { channel_id: channelId } });
}
```

### Opção B: Agendador pg_cron (True Background)
Se quisermos que isso rode 100% autônomo e permita fechar a aba.
- Adicionar uma extensão `pg_cron` no Supabase via Migration.
- O Cron roda a cada 1 a 2 minutos no Supabase Database, chamando assincronamente a Edge Function `worker-generate-visuals`.

---

## 4. O Fluxo de Estado Modificado (`src/agents/pipelineOrchestrator.ts`)

O Frontend sofre uma grande abstração, dividindo seu gigante `runSemiAuto` em um State Machine Reactiva baseada em `useEffect` e subscrições.

1. **Gerar Roteiros**: Rápido, mantém síncrono.
2. **Extrair Cenas**: Cria placeholders `status='pending'` no DB.
3. **Loop de Processamento**: O Frontend (ou Cron) inicia o "Ping" para a função de Worker.
4. **Subscrição Realtime**: A UI se atualiza automaticamente conforme o banco muda.

---

## 5. Montagem do Vídeo (`useVideoAssembler.ts`)

- Ajustar o `img.onerror` de *Hard Reject* para *"Substituir a url p/ Placeholder"*.
- Garantir que a montagem só ocorra quando `status='done'` para todas as cenas essenciais.
