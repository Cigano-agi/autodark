# AutoDark — Task Tracker

> Controle de tarefas baseado na call de alinhamento + análise técnica do projeto.
> Atualizado em: 2026-03-17

---

## Fase 1 — Blueprint Visual (CONCLUÍDA)

| # | Tarefa | Status |
|---|--------|--------|
| 1.1 | Adicionar campos `persona_prompt`, `target_audience` ao `channel_blueprints` | ✅ |
| 1.2 | Adicionar campos `character_description`, `style_reference_url`, `character_consistency`, `scenes_image_ratio`, `scenes_video_ratio`, `custom_music_url` ao `channel_blueprints` | ✅ |
| 1.3 | Atualizar interface `Blueprint` e `UpdateBlueprintData` em `useBlueprint.tsx` | ✅ |
| 1.4 | Criar opções de `VISUAL_STYLE_OPTIONS` (realistic, cartoon, oil-painting, clay, etc.) | ✅ |
| 1.5 | Adicionar aba "Blueprint" no `ChannelView.tsx` com todos os campos visuais e de persona | ✅ |
| 1.6 | Implementar sliders de composição (imagem vs. vídeo) com shadcn `Slider` | ✅ |
| 1.7 | Implementar toggle `character_consistency` com shadcn `Switch` | ✅ |
| 1.8 | Adicionar seletor de ideias existentes no Step 1 do Production Wizard | ✅ |
| 1.9 | SQL Migration: criar `content_ideas`, adicionar colunas faltantes em `channels`, `channel_blueprints`, `channel_metrics` | ✅ (aplicada manualmente no dashboard) |

---

## Fase 2 — Geração de Vídeos Curtos

| # | Tarefa | Status |
|---|--------|--------|
| 2.1 | Migration: adicionar colunas `scenes`, `video_path`, `thumbnail_path`, `render_status` em `channel_contents` | ✅ |
| 2.2 | Edge function `generate-video-scenes`: recebe ideia, retorna array de cenas com prompt de imagem | ✅ |
| 2.3 | Edge function `generate-scene-images`: chama provedor de imagem (a definir) por cena | ✅ (Placeholder Picsum implementado) |
| 2.4 | Adaptar N8N Workflow 3 para orquestrar render FFmpeg com as cenas geradas | ⬜ |
| 2.5 | UI: botão "Gerar Vídeo Curto" no `ChannelView` / Production com progress steps | ⬜ |

---

## Fase 3 — Geração de Vídeos Longos

| # | Tarefa | Status |
|---|--------|--------|
| 3.1 | Definir estrutura de capítulos/seções para vídeo longo | ⬜ |
| 3.2 | Edge function `generate-long-script`: roteiro completo com narração TTS | ⬜ |
| 3.3 | Pipeline N8N para vídeo longo (múltiplas cenas, capítulos, thumbnail) | ⬜ |
| 3.4 | UI: aba ou seção "Vídeo Longo" com controles específicos | ⬜ |

---

## Fase 4 — Prompts Customizados por Canal

| # | Tarefa | Status |
|---|--------|--------|
| 4.1 | Adicionar campo `custom_script_prompt` na tabela `channel_blueprints` | ✅ |
| 4.2 | Adicionar textarea "Script Personalizado" na aba Blueprint do `ChannelView` | ⬜ |
| 4.3 | Atualizar edge functions `generate-ideas` e `generate-video-scenes` para usar `custom_script_prompt` quando definido, sobrepondo o prompt padrão | ✅ |
| 4.4 | Documentar para o cliente como formatar o script personalizado | ⬜ |

---

## Fase 5 — Infraestrutura e Segredos

| # | Tarefa | Status |
|---|--------|--------|
| 5.1 | Migrar chaves de API para Supabase Secrets: `AI33_API_KEY`, `OPENROUTER_API_KEY`, `APIFY_TOKEN` | ⬜ |
| 5.2 | Verificar e remover hardcode de chaves no código-fonte | ⬜ |
| 5.3 | Configurar `ALLOWED_ORIGIN` no Supabase para o domínio de produção | ⬜ |

---

## Fase 5.5 — Thumbnail no Wizard de Produção

| # | Tarefa | Status |
|---|--------|--------|
| 5.5.1 | Gerar prompt de imagem via IA (Claude) e exibir a imagem resultante no Step 3 em vez do texto | ✅ (Pollinations.ai como provedor temporário) |
| 5.5.2 | Substituir Pollinations por provedor definitivo após decisão D1 (Replicate/Leonardo/etc.) | ⬜ |
| 5.5.3 | Salvar URL da thumbnail gerada em `channel_contents.thumbnail_path` ao finalizar produção | ⬜ |

---

## Fase 6 — Melhorias de UX

| # | Tarefa | Status |
|---|--------|--------|
| 6.1 | Feedback visual na geração de ideias (loading state, toast de sucesso/erro) | ⬜ |
| 6.2 | Paginação ou scroll infinito na lista de vídeos/ideias | ⬜ |
| 6.3 | Filtro de status na aba de conteúdos do canal | ⬜ |
| 6.4 | Preview de thumbnail na lista de conteúdos | ⬜ |

---

## Fase 7 — Concorrentes e Análise

| # | Tarefa | Status |
|---|--------|--------|
| 7.1 | Exibir lista de canais concorrentes na aba "Concorrentes" do `ChannelView` | ⬜ |
| 7.2 | Buscar métricas dos concorrentes via Apify scraper | ⬜ |
| 7.3 | Comparativo de métricas próprias vs. concorrentes | ⬜ |

---

## Bugs

| ID | Descrição | Status |
|----|-----------|--------|
| B1 | `scrape-youtube-channel` retornava 400 por `last_scraped_at` e colunas de vídeo faltantes em `channels`/`channel_metrics` | ✅ Resolvido (migration aplicada) |
| B2 | `content_ideas` com 404 — tabela não existia no projeto correto | ✅ Resolvido (SQL criado e aplicado) |
| B3 | App apontava pro projeto Supabase errado (`yyaysbsqunumitluleey`) | ✅ Resolvido (.env, .mcp.json, config.toml atualizados) |
| B4 | MCP Supabase retornando "Forbidden resource" para escrita | ⚠️ Workaround: usuário executa SQL manualmente no dashboard |
| B5 | `channel_blueprints` sem `persona_prompt` e `target_audience` | ✅ Resolvido (migration) |
| B6 | `channel_metrics` sem `video_title`, `video_url`, `video_thumbnail` | ✅ Resolvido (migration) |
| B7 | `generate-ideas` crashando no módulo por `throw` fora do `Deno.serve()` quando `AI33_API_KEY` não está configurada | ✅ Resolvido (check movido para dentro do handler + fallback OPENROUTER) |

---

## Decisões Pendentes

| ID | Decisão | Opções |
|----|---------|--------|
| D1 | Provedor de imagens para geração de cenas | Midjourney API / Replicate (Flux) / Leonardo.ai |
| D2 | Onde roda o FFmpeg | N8N self-hosted / Lambda / Fly.io |
| D3 | Acesso à API VO3 (Google) para voz | Aguardando liberação do acesso |
| D4 | Biblioteca de músicas | Epidemic Sound / Artlist / upload próprio |
| D5 | Confirmar secrets configurados no Supabase | `AI33_API_KEY`, `OPENROUTER_API_KEY`, `APIFY_TOKEN` |

---

## Próximos Passos Imediatos

1. **Configurar `AI33_API_KEY` ou `OPENROUTER_API_KEY`** nas secrets do projeto `bwitfpvqruwikpuaiurc` no Supabase → vai resolver o erro "Erro ao gerar ideias"
2. Iniciar Fase 2.1: migration para colunas de vídeo em `channel_contents`
3. Definir decisão D1 (provedor de imagens) para desbloquear Fase 2.3
4. Implementar Fase 4 (prompts customizados) após Blueprint estar estável

---

## Cronograma Sugerido

| Semana | Foco |
|--------|------|
| Sem 1 (atual) | Fase 1 ✅ + correções de bugs + configurar secrets |
| Sem 2 | Fase 2: vídeos curtos (geração de cenas + imagens) |
| Sem 3 | Fase 2 cont. + Fase 4 (prompts customizados) |
| Sem 4 | Fase 3: vídeos longos |
| Sem 5+ | Fases 5-7: infra, UX, concorrentes |
