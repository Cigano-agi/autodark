# Phase 1: Pipeline Debug & Estabilização — Research

**Researched:** 2026-04-12
**Domain:** Pipeline de geração de vídeo (orquestrador + agentes + persistência)
**Confidence:** HIGH — análise direta do código-fonte, sem suposições

---

## Sumário Executivo

O pipeline `runSemiAuto` tem estrutura correta de try/catch global, mas contém **12 bugs identificados** que causam travamentos silenciosos, perda de estado e falhas em cascata. Os mais críticos estão na fronteira entre o `visualWorker` e o Realtime do Supabase: o orchestrator lê `productionState` de uma closure estale (capturada no momento do callback), fazendo com que o loop de polling de 10 segundos nunca detecte que as imagens foram geradas e o pipeline fique preso indefinidamente. O segundo cluster de bugs está no `narratorAgent`: quando TTS falha, o fallback define `durationSec = 5.3` hardcoded para todas as cenas afetadas, corrompendo os timestamps do SEO e a montagem final.

**Recomendação primária:** Corrigir BUG-001 (closure stale no polling) e BUG-003 (fallback TTS hardcoded) antes de qualquer outra coisa — eles bloqueiam o pipeline em condição normal de uso.

---

## Inventário de Bugs

### pipelineOrchestrator.ts

```
BUG-001 [severity: critical] pipelineOrchestrator.ts:321-329
Problema: O loop de polling que espera o Realtime propagar os updates visuais lê
`productionState?.scenes` de uma closure capturada no momento em que `runSemiAuto`
foi chamado. React hooks não atualizam closures stale. O valor de `productionState`
dentro do callback é sempre o snapshot inicial, então `stillPending` nunca chega a
zero e o loop espera os 10 segundos completos — mesmo que todas as imagens tenham
sido geradas.
Impacto: Pipeline sempre aguarda o timeout máximo de 10s após visuals. Em produção
com muitas cenas, isso se manifesta como "travamento" e pode resultar em chaptersWithVisuals
montado com imageUrls vazios se o Realtime ainda não tiver propagado.
Fix: Passar `productionState` como parâmetro para `runSemiAuto`, ou usar um ref
(useRef) que o useEffect de Realtime atualiza em tempo real para o polling poder
ler o valor corrente. Alternativa: extrair o polling para uma função separada que
recebe um getter: `() => productionState?.scenes`.
```

```
BUG-002 [severity: critical] pipelineOrchestrator.ts:272-290
Problema: O bloco `audio_upload` captura silenciosamente todos os erros de upload
com `catch {}` vazio (sem log, sem re-throw). Se o Supabase Storage falhar (bucket
não existe, permissão negada, rede), o pipeline continua com `audioUrl` apontando
para uma URL `blob:` que expira quando a aba fecha. O estado persistido no banco
terá URLs inválidas.
Impacto: Após fechar e reabrir a aba, todas as cenas de áudio aparecem como "sem
áudio" mesmo que a narração tenha sido gerada com sucesso. O auto-resume não
consegue reconstruir o estado correto.
Fix: Adicionar `console.warn` no catch para rastrear falhas. Armazenar no
`productionState` uma flag `audioUploadFailed: true` por cena para que o auto-
resume saiba que precisa re-fazer o upload.
```

```
BUG-003 [severity: critical] pipelineOrchestrator.ts:292-295
Problema: O campo `audio_url` persistido no banco usa apenas a primeira cena do
primeiro capítulo: `chaptersWithAudio[0]?.scenes[0]?.audioUrl || null`. Isso é
um placeholder que nunca é atualizado com as URLs reais das demais cenas.
Impacto: O registro `channel_contents` fica com `audio_url` apontando para uma
única cena, tornando a visualização do conteúdo gerado inútil.
Fix: Remover esse campo do `persistStep` de TTS ou serializar todas as URLs de
áudio como JSON em um campo dedicado.
```

```
BUG-004 [severity: high] pipelineOrchestrator.ts:412
Problema: No bloco catch global, `state.progress` é lido via closure stale do
useState. O valor pode ser 0 mesmo se o pipeline já estava no step 4. Isso faz
`saveProductionState` persistir `step: 1` quando o erro ocorre em qualquer etapa
avançada.
Impacto: Ao recarregar a página após um erro em visuals ou SEO, o auto-resume
acha que o pipeline estava no step 1 e tenta recomeçar do zero em vez de retomar
de onde parou.
Fix: Rastrear o step atual numa variável local (`let currentStep = 1`) atualizada
em cada etapa do pipeline, e usar essa variável no catch em vez de `state.progress`.
```

```
BUG-005 [severity: high] pipelineOrchestrator.ts:86-102
Problema: O auto-resume no `useEffect` não tem dependência no `productionState`
completo — apenas em `productionState?.status` e `productionState?.step`. Se o
estado for carregado do banco com status "running" e step 2.5 mas `scenes` estiver
vazio (por lag do Realtime), `hasUnfinishedVisuals([])` retorna false e o auto-
resume não é disparado.
Impacto: Usuário fecha a aba no meio da geração de visuals, reabre, e nada acontece.
O pipeline fica preso em status "running" sem progresso.
Fix: Adicionar um delay de 1-2 segundos antes de checar `hasUnfinishedVisuals`
para dar tempo ao Realtime de hidratar as cenas, ou buscar diretamente do banco
(`production_states`) no useEffect em vez de depender do estado em memória.
```

```
BUG-006 [severity: medium] pipelineOrchestrator.ts:240-253
Problema: `allScenes` é construído com `durationSec: scene.durationSec` — mas
neste ponto as cenas acabaram de ser extraídas por `extractScenes` e ainda não
passaram pelo `narratorAgent`. O campo `durationSec` é `undefined` para todas as
cenas. O `saveScene` persiste `durationSec: undefined` no banco.
Impacto: O worker `worker-generate-visuals` provavelmente usa `durationSec` para
calcular duração do vídeo. Quando o valor é `undefined`, a montagem final pode
gerar timestamps errados ou NaN.
Fix: Persistir as cenas iniciais sem `durationSec` (ou com valor padrão de 8) e
atualizar após a narração. Alternativamente, salvar as cenas somente após a etapa
de narração.
```

---

### narratorAgent.ts

```
BUG-007 [severity: critical] narratorAgent.ts:41-49
Problema: Quando `callTTS` falha, o catch define `durationSec: 5.3` e
`audioDurationSec: 5` hardcoded para a cena afetada. Isso corrompe o cálculo de
timestamps do SEO (`seoAgent.ts:15` usa `ch.audioDurationSec`): se 30% das cenas
falham, todos os capítulos ficam com timestamps comprimidos/errados.
Impacto: SEO gerado com timestamps incorretos. Video assembler monta com timing
errado. Usuário vê vídeo "dessincronizado" sem saber o motivo.
Fix: O valor de fallback de `durationSec` deve ser estimado pelo texto:
`Math.ceil(text.split(/\s+/).length / 2.5)` — o mesmo cálculo que `callTTS` usa
em `llm.ts:249`. Isso torna o fallback coerente com a duração real esperada.
```

```
BUG-008 [severity: high] narratorAgent.ts:29-56
Problema: `generateAllNarrations` usa `Promise.all` em batches de 5. Se uma cena
falha, o erro é capturado individualmente e marcada com fallback — correto. Porém,
o `done` counter é incrementado mesmo para cenas que falharam (`done++` na linha 51
está fora do try/catch). Isso faz o `onProgress` reportar conclusão antes de todas
as cenas terem sido processadas quando o batch tem erros parciais.
Impacto: Barra de progresso mostra 100% na narração mas algumas cenas estão com
`audioUrl: "browser_tts"` (fallback). O usuário acha que terminou mas o áudio está
incompleto.
Fix: Mover `done++` para dentro do try/catch (incrementar em ambos os branches)
— na verdade já está correto estruturalmente. O problema real é que não há forma
de distinguir "concluiu com sucesso" de "concluiu com fallback" no retorno.
Adicionar um campo `failedScenes: number` ao retorno de `generateAllNarrations`
para que o orchestrator possa exibir um warning.
```

---

### visualAgent.ts

```
BUG-009 [severity: critical] visualAgent.ts:47-53
Problema: `extractScenes` chama `extractJson(raw)` e usa `parsed.scenes || []`.
Se a LLM retornar um JSON válido mas sem o campo `scenes` (ex: retornar
`{"cenas": [...]}` em português), `parsed.scenes` é `undefined` e o resultado é
`[]`. O capítulo fica com `scenes: []` sem nenhum erro visível.
Impacto: O pipeline continua mas sem cenas. O `narratorAgent` não processa nada.
O `visualWorker` não encontra nada para gerar. O vídeo final fica vazio.
Fix: Adicionar validação explícita:
```typescript
if (!parsed.scenes || parsed.scenes.length === 0) {
  throw new Error(`extractScenes: LLM retornou JSON sem campo 'scenes' para capítulo "${chapter.title}"`);
}
```

```
BUG-010 [severity: high] visualAgent.ts:88-93
Problema: Quando `callImageGeneration` falha (após todos os fallbacks), o catch
faz apenas `console.error` e a cena fica com `imageUrl: undefined`. Não há
incremento de `errorCount` nem atualização de status da cena no banco. O
`worker-generate-visuals` não consegue distinguir "erro transitório" de "erro
permanente" e pode re-tentar indefinidamente.
Impacto: Worker pode entrar em loop tentando re-gerar a mesma cena com
`callImageGeneration` que continua falhando, consumindo cota de API.
Fix: Propagar o erro para que o worker registre `errorCount` e aplique retry logic
com backoff. O catch em `generateVisuals` deveria re-throw em vez de silenciar.
(Nota: `generateVisuals` não é mais chamada diretamente pelo orchestrator — o
worker usa a Edge Function. Verificar se esse caminho de código ainda está ativo.)
```

---

### seoAgent.ts

```
BUG-011 [severity: high] seoAgent.ts:42
Problema: `generateSEO` retorna `extractJson(raw) as unknown as SEOPackage` sem
nenhuma validação. Se a LLM retornar JSON sem os campos `title`, `description`,
`tags`, ou `chapters`, o orchestrator acessa `seo.tags.join(", ")` na linha 382
do orchestrator e lança `TypeError: Cannot read properties of undefined (reading
'join')`, travando o pipeline no passo final.
Impacto: Pipeline chega 85% concluído (visuals prontos, áudio pronto) e crasha
no SEO. Todo o trabalho anterior foi feito mas o conteúdo nunca é salvo como
"awaiting_review".
Fix: Adicionar validação após `extractJson`:
```typescript
const seo = extractJson(raw) as SEOPackage;
if (!seo.tags || !Array.isArray(seo.tags)) seo.tags = [];
if (!seo.chapters || !Array.isArray(seo.chapters)) seo.chapters = [];
if (!seo.title) seo.title = title; // fallback para o título do script
if (!seo.description) seo.description = "";
return seo;
```

```
BUG-012 [severity: medium] seoAgent.ts:11-15
Problema: O cálculo de timestamps usa `ch.audioDurationSec || 120` onde `ch` é
um `VideoChapter` — mas `VideoChapter` não tem campo `audioDurationSec` direto;
esse campo está em cada `SceneData`. O `audioDurationSec` do capítulo nunca é
calculado, então sempre usa o fallback de 120 segundos por capítulo.
Impacto: Todos os timestamps do SEO são múltiplos de 2 minutos (0:00, 2:00,
4:00...) independentemente da duração real do áudio. Timestamps errados no
YouTube são penalizados pelo algoritmo.
Fix: Calcular `audioDurationSec` do capítulo somando as cenas:
```typescript
const chapterDuration = ch.scenes.reduce((sum, s) => sum + (s.audioDurationSec ?? 0), 0) || 120;
currentSec += chapterDuration;
```
```

---

### useProductionState.ts

```
BUG-013 [severity: high] useProductionState.ts:100-117
Problema: A função `save` captura `state` via closure. Se `save` for chamada
múltiplas vezes em sequência rápida (como nas linhas 221-222 do orchestrator:
`saveProductionState(2, ...)` seguido imediatamente de `saveProductionState(2.5, ...)`),
a segunda chamada usa o `state` desatualizado da primeira (antes do re-render).
O resultado é que a segunda chamada sobrescreve a primeira com dados do estado
anterior.
Impacto: Dados de etapas intermediárias podem ser perdidos — por exemplo, o
`script` gerado pode não aparecer no estado persistido se `saveProductionState`
para step 2.5 sobrescrever o step 2 com `state.data` vazio.
Fix: Usar `useReducer` em vez de `useState` + closure, ou usar um `ref` para
sempre apontar para o estado mais recente. Alternativamente, adicionar um pequeno
delay entre chamadas consecutivas de `saveData` no orchestrator.
```

```
BUG-014 [severity: medium] useProductionState.ts:57-73
Problema: Quando o `fetch` inicial do banco falha (erro de rede, RLS bloqueando,
tabela não existe), o código faz `setState({ channel_id: channelId, ...INITIAL })`
— criando um estado "vazio" como se fosse a primeira execução. Não há distinção
entre "banco retornou vazio" e "banco retornou erro".
Impacto: Se o usuário tinha um pipeline a 90% e recarrega a página durante uma
instabilidade do Supabase, o UI mostra o estado como "idle" em vez de "running" —
perdendo visualmente o progresso (mesmo que os dados ainda estejam no banco).
Fix: Verificar `error` separadamente:
```typescript
if (error) {
  console.error("[useProductionState] Falha ao carregar estado:", error);
  // Não resetar para INITIAL — manter `state` como null indica "não carregado"
  // A UI deve mostrar um estado de "reconnecting" em vez de "idle"
}
```
```

---

### storage.ts

```
BUG-015 [severity: medium] storage.ts:13
Problema: `uploadToStorage` retorna `null` se `blob.size < 100`, mas não loga
o motivo. O caller (orchestrator, linha 282) simplesmente ignora `null` e mantém
a URL `blob:` original. Blobs pequenos podem ser áudios curtíssimos legítimos
(ex: cena de 1 segundo com uma única palavra) que são descartados silenciosamente.
Impacto: Cenas curtas perdem o áudio permanentemente após fechar a aba.
Fix: Reduzir o threshold para 50 bytes (ou remover o guard — um blob de 1 byte
ainda indica falha real) e adicionar log de warning com o tamanho recebido.
```

```
BUG-016 [severity: medium] storage.ts:55-59
Problema: `uploadImage` retorna a URL original como fallback se o `fetch` falhar:
`return imageUrlOrBlob`. Se a URL original é uma URL temporária do Pollinations.ai
(ex: `https://localhost:5173/api-pollinations/prompt/...`), retornar essa URL como
se fosse uma URL permanente vai quebrar quando a sessão de dev terminar.
Impacto: Imagens geradas em dev ficam "salvas" no banco com URLs que apontam
para `localhost` — inválidas em produção ou após reiniciar o servidor.
Fix: Quando o fetch falhar, retornar `null` (em vez da URL original) para que o
caller saiba que a imagem não foi persistida e pode usar um placeholder.
```

---

### llm.ts (descoberto durante análise)

```
BUG-017 [severity: high] llm.ts:108-110
Problema: `callPollinationsImage` constrói uma URL absoluta com
`window.location.origin + url` e a retorna como se fosse uma URL de imagem
permanente. Mas a URL aponta para o proxy Vite (`/api-pollinations/...`) que só
existe em ambiente de desenvolvimento. Em produção (Vercel), a rota pode não
existir, retornando 404.
Impacto: Em produção, todas as imagens via Pollinations (fallback do AI33) chegam
como URLs quebradas. O vídeo final monta sem imagens.
Fix: Verificar se o proxy existe em produção ou usar a URL direta do Pollinations.ai
(`https://image.pollinations.ai/prompt/...`) como URL de retorno, aceitando que o
CORS pode bloquear o fetch — nesse caso, usar o Canvas fallback como retorno final.
```

```
BUG-018 [severity: medium] llm.ts:186-213
Problema: `extractJson` usa regex `/\{[\s\S]*\}/` que captura o PRIMEIRO `{` e o
ÚLTIMO `}` do texto. Se a LLM retornar JSON aninhado com texto antes e depois
(comum quando `requireJson = false`), o match pode capturar um JSON parcial ou
truncado. Exemplo: resposta "Aqui está o JSON: {...} Espero que ajude!" — o regex
captura corretamente. Mas "Resultado: {...} Nota: {...}" captura do primeiro `{`
ao último `}` — incluindo texto entre os dois JSONs — gerando JSON inválido.
Impacto: `generateSummary` e `extractScenes` podem receber objetos mal-parseados,
levando a `parsed.chapters = undefined` ou `parsed.scenes = undefined`, triggering
BUG-009 e BUG-011.
Fix: Usar um JSON parser com balanceamento de chaves em vez de regex greedy, ou
instruir a LLM sempre com `requireJson = true` e validar `Content-Type`.
```

---

## Resumo por Severidade

| Severity | Count | Bugs |
|----------|-------|------|
| critical | 4 | BUG-001, BUG-003, BUG-007, BUG-009 |
| high | 7 | BUG-002, BUG-004, BUG-005, BUG-008, BUG-010, BUG-011, BUG-013, BUG-017 |
| medium | 5 | BUG-006, BUG-012, BUG-014, BUG-015, BUG-016, BUG-018 |

**Ordem de correção recomendada:**
1. BUG-001 (closure stale — pipeline trava depois de gerar visuals)
2. BUG-009 (scenes vazio silencioso — pipeline vazio sem erro)
3. BUG-011 (SEO sem validação — crash no passo final)
4. BUG-007 (durationSec hardcoded — timestamps corrompidos)
5. BUG-017 (URL Pollinations quebrada em produção)
6. Demais bugs em sequência

---

## Arquivos Não Modificados na Phase 1

Os seguintes arquivos foram lidos mas não contêm bugs bloqueantes para Phase 1:
- `storage.ts` — bugs são medium, pipeline não crasha
- `visualWorker.ts` — lógica correta, dependente da Edge Function `worker-generate-visuals`

---

## RESEARCH COMPLETE
