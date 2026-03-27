# Plano de Melhoria de Debug e Geração de Vídeos (Orquestração)

## Problema Relatado
O processo de geração de vídeos é uma "caixa preta" e o vídeo final "não existe de fato" na plataforma após ser gerado (o usuário não consegue assistir ao vídeo gerado posteriormente, apenas fazer o download do blob local). Além disso, falhas no meio do caminho (geração de áudio, geração de imagens, renderização) são difíceis de debugar, exigindo que o usuário reinicie todo o processo longo de geração.

## Arquitetura da Solução

Vamos abordar o problema dividindo-o em 3 agentes em paralelo (Fase 2 da Orquestração):

### 1. `database-architect` & `backend-specialist` (Fundação e Dados)
**Objetivo:** Garantir persistência do vídeo gerado e logs detalhados de cada etapa.
- **Armazenamento (Storage):** Criar um bucket no Supabase Storage (`videos` e/ou `media`) para salvar os arquivos de vídeo renderizados e áudios gerados.
- **Banco de Dados:**
  - Adicionar a coluna `video_url` (text) na tabela `video_generations`.
  - Criar a tabela `generation_logs` (id, generation_id, step_name, status, message, error_details, created_at) para salvar um "rastro" (trace) de cada passo da geração.
- **Edge Functions / Backend:** Qualquer geração via Web ou Edge Function (ex: "youtube-long-engine", "youtube-generate-audio") deve relatar o seu status na tabela `generation_logs`.

### 2. `frontend-specialist` (UI/UX e Controle)
**Objetivo:** Mostrar o vídeo real e fornecer interface de debug.
- **Upload Automático:** Modificar o `LongVideoStudio.tsx` (especificamente o método `handleRenderVideo`) para que, ao finalizar a renderização do Canvas (.webm), o arquivo seja feito upload para o Supabase Storage e o link salvo em `video_url` na tabela `video_generations`.
- **Modo Debug (Terminal UI):** Criar um componente de Logs (ex: `GenerationDebugConsole.tsx`) no painel do Studio que escuta as mudanças da tabela `generation_logs` em tempo real, mostrando visualmente se a etapa atual é TTS, Imagem, Script ou Renderização, e exibindo os erros exatos (ex: "Falha na API da OpenAI ao gerar voz").
- **Histórico Real de Vídeos:** Atualizar o componente `VideoGenerationHistory.tsx` para apresentar um Player de Vídeo caso o `video_url` exista, permitindo que o usuário dê um "play" verdadeiro no vídeo que gerou no passado, e não apenas veja os metadados.

### 3. `test-engineer` & `debugger` (Garantia e Resiliência)
**Objetivo:** Certificar que falhas parciais não quebrem tudo.
- Implementar mecanismos de *Retry* (Tentar Novamente) na UI. Se a cena 4 falhar ao gerar imagem, permitir que o usuário refaça apenas a cena 4 sem perder o progresso das outras 29 cenas.
- Validar as permissões RLS do Storage e tabelas de log para o usuário.

## Ordem de Execução (Fase 2)
1. **Migrations & Storage:** Criaremos a tabela de logs e bucket de arquivos.
2. **Atualização do Frontend (Studio):** O frontend gravará logs a cada passo (Iniciou roteiro -> Gerou Áudios -> Gerou Imagens -> Renderizou -> Upload).
3. **Página de Histórico:** O componente de histórico passará a ler o vídeo salvo.

## Plano de Verificação (Automático e Manual)
- **Manual:** Iniciar uma geração parcial, forçar uma falha de rede ou API key inválida. Verificar se o erro exato aparece no painel de debug.
- **Manual:** Concluir uma renderização completa, verificar no painel do Supabase se o WebM foi pro Storage e acessar o painel de Histórico para dar Play no vídeo na nuvem.
- **Automático:** Rodar script `schema_validator.py` (se aplicável) e checagem de tipos.
