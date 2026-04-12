# 📑 SPEC: ROUTE HEALING & LAYOUT INTEGRITY
**Status:** DRAFT
**Agent:** `@codebase_investigator`

## 1. AppLayout Persistence
Garantir que o `PremiumSidebar` e o `BeamsBackground` nunca sejam desmontados durante navegações internas.
- **Fix**: Verificar se algum componente filho está usando `fixed inset-0` que possa cobrir o sidebar com um fundo preto opaco.
- **Fix**: No Dashboard, o Sidebar Toggle deve ser visível mesmo com modais abertos (ajuste de `z-index`).

## 2. Broken Buttons (ChannelHeaderCard)
Revisar os handlers em `src/pages/Channel/Index.tsx`:
- `onNewVideo`: Garantir que o ID do canal seja passado corretamente no path.
- `onStudio`: Validar se o componente `LongVideoStudio` está carregando o estado do canal.
- `onHeadAgent`: Adicionar feedback visual (toast) ao iniciar a estratégia.

## 3. Global Queue Mapping
O botão "Revisar" no Dashboard deve levar para a aba **Operations** (`tab=queue`) e não para `tab=conteudos` que não existe.
- **Path**: `/channel/:id?tab=queue`

## 4. Contrast Audit
Substituir todas as ocorrências de `text-black` por `text-white` ou variáveis do shadcn que respeitam o dark mode.
- Alvos principais: `MediaHub`, `LongVideoStudio`, `ReviewQueue`.
