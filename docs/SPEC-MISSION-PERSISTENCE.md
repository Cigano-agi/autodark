# 📑 SPEC: MISSION PERSISTENCE (Turbo Pilot Recovery)
**Status:** DRAFT
**Agent:** `@backend-specialist`

## 1. Data Model
A tabela `production_states` deve persistir o snapshot completo da memória da aba.
- `id`: UUID (Primary Key)
- `channel_id`: UUID (Foreign Key para channels)
- `step`: INT (1 a 8)
- `status`: TEXT (running, paused, done, error)
- `data`: JSONB (Contendo: title, hook, chapters, thumbPrompt, imagesUrls, audioUrls, videoUrl)
- `updated_at`: TIMESTAMP

## 2. Recovery Logic
Ao carregar `Production/Index.tsx`, o sistema deve:
1. Consultar `production_states` filtrando por `channel_id` e `status='running'`.
2. Se houver um estado, perguntar ao usuário: "Missão em andamento detectada. Retomar?".
3. Se aceito, hidratar todos os estados do React com o conteúdo do JSONB.

## 3. Atomic Updates
Cada etapa concluída no wizard (`runAutoPilot`) deve chamar `saveData` para garantir que uma queda de energia ou fechamento de aba não resulte em perda de progresso da IA.
