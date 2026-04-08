# Requirements — AutoDark

## Goal
Um operador entra na plataforma, escolhe um canal, insere um tema, e **sai com um vídeo MP4 real** pronto para aprovação e publicação no YouTube. Zero bugs bloqueantes no caminho.

---

## Milestone 1 — Pipeline Funcional (MVP do Studio)

### R1 — Production Factory end-to-end
- [ ] Operador insere tema → pipeline executa roteiro → narração → imagens → SEO sem crash
- [ ] Cada etapa tem feedback visual de progresso claro (não trava em loading infinito)
- [ ] Erros são capturados e exibidos com mensagem útil (não "undefined")
- [ ] Estado de produção persiste (refresh não perde progresso)

### R2 — Studio integrado
- [ ] `/channel/:id/studio` está conectado ao pipeline (recebe output do pipelineOrchestrator)
- [ ] Preview do vídeo funciona no Remotion Player com áudio sincronizado
- [ ] Botão "Iniciar Montagem Final" exporta MP4 real via FFmpeg.wasm
- [ ] Download do MP4 funciona no browser

### R3 — Foundation completa
- [ ] Blocos A e B: funcionam (já implementados — validar)
- [ ] Blocos C, D, E: implementados (atualmente são stubs com "Em breve disponível")
- [ ] "Gerar Diretrizes" executa e salva directives no Supabase
- [ ] Directives são usadas pelo pipelineOrchestrator na geração do roteiro

### R4 — Qualidade do vídeo gerado
- [ ] Roteiro em inglês/espanhol com estrutura correta (hook + capítulos + CTA)
- [ ] Narração TTS com a voz configurada no canal (Hub defaults)
- [ ] Imagens geradas no estilo configurado (dark art, Tim Burton-ish)
- [ ] Duração alvo respeitada (8/15/20 min)

### R5 — Aprovação e Publicação
- [ ] Vídeo gerado aparece na fila de revisão do canal
- [ ] Operador pode aprovar ou rejeitar com feedback
- [ ] Upload para YouTube (API) com título, descrição, tags do SEO gerado
- [ ] Status do upload visível na interface

---

## Non-Goals (explicitamente fora)
- Multi-usuário / workspaces separados
- Billing / limites de uso
- Mobile / PWA
- Analytics de canal (views, CTR)
- Edição manual do roteiro ou imagens
- Agendamento automático sem aprovação humana
