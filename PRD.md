# PRD — AutoDark Studio: Contexto Técnico Completo

**Data:** 2026-04-02  
**Projeto:** Plataforma SaaS de automação de vídeos YouTube  
**Ambiente:** React 18 + TypeScript + Supabase (Postgres + Edge Functions Deno)

---

## 1. ESTRUTURA DO PROJETO

### Arquitetura
- **Tipo:** SPA (Single Page Application) fullstack
- **Frontend:** React 18 + TypeScript + Vite (sem SSR)
- **Backend:** Supabase (Postgres RLS + 12 Edge Functions Deno)
- **Deploy:** Vite build → CDN (frontend), Supabase managed (backend)

### Estrutura de Pastas
```
src/
├── pages/              # Rotas principais (Production, Channel, Dashboard, etc)
│   ├── Production/     # Wizard de 8 steps (geração de vídeos)
│   ├── Channel/        # Gerenciamento de canais
│   ├── Dashboard/      # Dashboard inicial
│   ├── MediaHub/       # Gestão de mídia
│   ├── Pipeline/       # Orquestração de conteúdo
│   └── Foundation/     # Blueprint da channel
├── components/         # Componentes React reutilizáveis
│   ├── ui/             # Primitivos shadcn/ui (Button, Card, Dialog, etc)
│   ├── layouts/        # AppLayout (header + sidebar)
│   ├── Channel/        # Componentes específicos de channel
│   └── Dashboard/      # Componentes de dashboard
├── hooks/              # Custom hooks (useAuth, useQuery, etc)
├── integrations/
│   └── supabase/       # Cliente Supabase + tipos gerados
├── agents/             # Orquestração de IA (LLM, TTS, imagens)
├── remotion/           # Composições Remotion (preview em-browser)
├── utils/              # Utilitários (errorHandler, videoStorage, etc)
├── lib/                # Funções auxiliares (cn, mock-data)
└── design-system/      # Design tokens (cores, spacing, tipografia)

supabase/
├── migrations/         # 10 migrações SQL (2026-01-07 até 2026-03-31)
└── functions/          # 12 Edge Functions Deno
    ├── chat-completions      # LLM (AI33 + OpenRouter fallback)
    ├── generate-script       # Geração de roteiros
    ├── generate-ideas        # Brainstorm de tópicos
    ├── youtube-generate-audio # TTS (Google Chirp3 + AI33 fallback)
    ├── generate-image        # Imagens (Kie.ai + Pollinations + Canvas)
    └── [8 others]
```

### Linguagem & Frameworks Principais
- **Linguagem:** TypeScript (strict mode)
- **Frontend:** React 18, Vite 5, React Router v6
- **UI:** shadcn/ui + Radix UI + Tailwind CSS
- **State Mgmt:** TanStack Query v5 (RQ)
- **Video:** Remotion 4 (preview), @ffmpeg/ffmpeg 0.12 (montagem WASM)
- **Validação:** Zod (padrão esperado, mas pouco usado em produção)
- **Backend:** Supabase Auth + Postgres + Deno Edge Functions
- **Comunicação:** Fetch API (sem axios/superagent)

---

## 2. PADRÕES DE IMPLEMENTAÇÃO

### Roteamento
**Framework:** React Router v6  
**Estrutura:** `src/App.tsx` centraliza todas as rotas
```tsx
// Padrão: ProtectedRoute + PublicRoute wrappers
<Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
  <Route path="/channel/:id" element={<ChannelView />} />
  <Route path="/channel/:id/production" element={<ProductionWizard />} />
</Route>
```
- **Login:** Supabase Auth (email + senha, OAuth Google)
- **Lazy loading:** Todas as páginas são importadas com `lazy()`
- **Fallback:** `LazyFallback` mostra spinner mientras carrega

### Validação de Dados
**Ferramentas disponíveis:** Zod definido em `package.json`, mas **não está sendo usado em produção atualmente**
- Validação acontece de forma ad-hoc (verificações `if` manuais)
- Exemplo: `if (!idea.trim()) { toast.error(...) }`
- **Tipo esperado:** Schemas Zod deveriam estar em `src/schemas/` ou `src/types/schemas/`

**Responsabilidade de validação:** Frontend valida UX, backend/Edge Functions validam segurança

### Tratamento de Erros
**Padrão:** Centralizador em `src/utils/errorHandler.ts`
```typescript
// getFriendlyErrorMessage(error, context)
// Traduz erros técnicos → português amigável para toast
// Sempre loga erro bruto no console para dev debug
```

**Resposta de erro:**
- **Frontend:** `toast.error(msg)` com `getFriendlyErrorMessage()`
- **Edge Functions:** Retornam `{ error: "..." }` JSON com status apropriado
- **Supabase RLS:** Retorna erro 42501 (Row Level Security) se não autorizado

**Exemplo de fluxo:**
```typescript
try {
  const result = await supabase.from('table').select();
} catch (e) {
  const friendlyMsg = getFriendlyErrorMessage(e, "ao carregar dados");
  toast.error(friendlyMsg);
}
```

### Autenticação & Autorização
**Provedor:** Supabase Auth
**Fluxo:**
1. `AuthProvider` em `src/hooks/useAuth.tsx` gerencia contexto global
2. `useAuth()` hook fornece: `{ user, session, loading, signInWithEmail, signOut }`
3. Proteção de rota: `ProtectedRoute` verifica `user` em `App.tsx`

**Storage:** `localStorage` (Supabase gerencia chaves com prefixo `sb-`)

**RLS (Row Level Security):** Habilitado em TODAS as tabelas
- Tabelas checam `auth.uid()` automaticamente
- Migrations definem policies (`USING auth.uid() = user_id`)
- Edge Functions usam `Authorization: Bearer {jwt}` para autenticar

**Autorização por tabela:**
- `channels`: Usuário só vê/edita seus próprios canais
- `channel_blueprints`: Acesso vinculado ao channel
- `video_generations`: Acesso vinculado ao channel

### Nomenclatura de Arquivos
- **Componentes React:** `PascalCase.tsx` (ex: `ChannelView.tsx`)
- **Custom Hooks:** `useXxx.tsx` ou `useXxx.ts` (ex: `useAuth.tsx`)
- **Utilitários:** `camelCase.ts` (ex: `errorHandler.ts`)
- **Edge Functions:** `kebab-case/` com `index.ts` (ex: `chat-completions/index.ts`)
- **Migrações:** `timestamp_description.sql` (ex: `20260331000000_competitors_last_video_date.sql`)

---

## 3. BANCO DE DADOS

### ORM/Cliente
- **Cliente:** `@supabase/supabase-js` v2.98
- **Tipo:** Query builder dinâmico (não é ORM tradicional)
- **Geração de tipos:** TypeScript types auto-gerados em `src/integrations/supabase/types.ts`

### Estrutura de Migrations & Models
**Diretório:** `supabase/migrations/`  
**Padrão de nome:** `YYYYMMDDhhmmss_description.sql`  
**Histórico:**
```
20260107234323 - Criação inicial (channels, blueprints, metrics, contents)
20260108012656 - Expansão schemas
20260119023111 - Ajustes adicionais
20260314175652 - Refactoring estrutural
20260317000000 - Add missing columns
20260319000000 - RLS para channel_foundation
20260320000000 - Video_generations table
20260331000000 - Competitors last_video_date
```

### Entidades Principais
**1. Channels** (com 1:1 relationship)
- `id UUID`, `user_id UUID`, `name TEXT`, `niche TEXT`, `subscribers INT`, `monthly_views INT`
- Relacionamento: `channel → channel_blueprints` (1:1)
- RLS: Usuário só vê seus próprios canais

**2. Channel Blueprints** (1:1 com channels)
- `id UUID`, `channel_id UUID`, `topic TEXT`, `voice_id TEXT`, `script_rules TEXT`
- UNIQUE constraint em `channel_id`

**3. Channel Contents** (conteúdo gerado)
- `id UUID`, `channel_id UUID`, `title TEXT`, `status TEXT`, `scheduled_date DATE`
- Status: 'draft' | 'queued' | 'publishing' | 'published'

**4. Channel Metrics** (históricas)
- `id UUID`, `channel_id UUID`, `rpm DECIMAL`, `last_video_views INT`, `recorded_at TIMESTAMP`
- Sem FK cascade (dados históricos)

**5. Video Generations** (restauro de gerações)
- `id UUID`, `channel_id UUID`, `generation_data JSONB`
- Rastreia histórico de tentativas para recuperação

**6. Channel Foundation** (base de conhecimento)
- `id UUID`, `channel_id UUID`, `content JSONB`
- Armazena personality, tone, visual style, target audience

### Padrões SQL
- **Timestamps:** `created_at TIMESTAMP WITH TIME ZONE DEFAULT now()`
- **Primary Keys:** `UUID PRIMARY KEY DEFAULT gen_random_uuid()`
- **Foreign Keys:** `ON DELETE CASCADE` (exceto channel_metrics)
- **RLS:** `ALTER TABLE ... ENABLE ROW LEVEL SECURITY`

---

## 4. TESTES

**Estado:** Não identificado estrutura de testes de projeto próprio
- Nenhum arquivo `.test.ts`, `.spec.ts` na pasta `/src`
- Dependências de teste (Jest, Vitest, etc) não estão no `package.json`
- **Nota:** Apenas testes de dependências externas (node_modules/@radix-ui, @remotion) presentes

**Recomendação para novas features:** Framework sugerido: Vitest + React Testing Library (compatível com Vite)

---

## 5. DEPENDÊNCIAS RELEVANTES

### Principais (package.json)
| Pacote | Versão | Propósito |
|--------|--------|----------|
| **React** | 18.3.1 | Renderização UI |
| **Vite** | 5.4.19 | Build tool e dev server |
| **TypeScript** | 5.8.3 | Type safety |
| **React Router** | 6.30.1 | Roteamento |
| **@supabase/supabase-js** | 2.98.0 | Client Postgres + Auth |
| **@tanstack/react-query** | 5.83.0 | State management & caching |
| **@remotion/core** | 1.0.0-y.46 | Preview de vídeo |
| **@remotion/player** | 4.0.437 | Reprodutor Remotion |
| **remotion** | 4.0.437 | Framework de vídeo |
| **@ffmpeg/ffmpeg** | 0.12.15 | Montagem WASM |
| **@ffmpeg/core** | 0.12.10 | Core FFmpeg WASM |
| **Tailwind CSS** | 3.4.17 | Styling |
| **shadcn/ui** | (múltiplos) | Componentes primários |
| **@radix-ui/*** | (v1.2-1.3) | Primitivos acessíveis |
| **Sonner** | 1.7.4 | Toast notifications |
| **React Hook Form** | 7.71.2 | Gerenciamento de formulários |
| **Zod** | 3.25.76 | Validação de schemas |
| **Lucide React** | 0.462.0 | Ícones |
| **next-themes** | 0.3.0 | Dark/light mode |
| **Framer Motion** | 12.35.2 | Animações |
| **jszip** | 3.10.1 | Compressão de ZIP (para exports) |
| **Recharts** | 2.15.4 | Gráficos |

### Edge Functions (Deno)
- **Runtime:** Supabase Edge Functions (Deno)
- **Imports:** `jsr:@supabase/functions-js/edge-runtime.d.ts`
- **Environment vars:** `AI33_API_KEY`, `OPENROUTER_API_KEY`, `KIE_API_KEY`, `APIFY_API_TOKEN`
- **Padrão:** CORS headers obrigatórios + JSON I/O

---

## 6. CONVENÇÕES IDENTIFICADAS

### 1. **Perseverança de Estado**
- **localStorage:** Wizard de Production (8 steps) persiste em localStorage
- **Padrão:** `localStorage.getItem(key)` → parse JSON → `useState()`
- **Restauro:** Ao abrir página, tenta restaurar estado do passo anterior

### 2. **Padrão de Query Builder Supabase**
```typescript
// Padrão: .select(), .insert(), .update(), .delete()
const { data, error } = await supabase
  .from('table')
  .select('*')
  .eq('channel_id', channelId)
  .single();

// Com tipos auto-gerados
const { data } = await supabase
  .from('channels')
  .select<'*', Database['public']['Tables']['channels']['Row']>()
```

### 3. **Toast Notifications**
```typescript
// Sucesso
toast.success(`Roteiro do capítulo "${chapter.title}" gerado!`);

// Erro (com getFriendlyErrorMessage)
toast.error(getFriendlyErrorMessage(e, "ao gerar roteiro"));

// Aviso
toast.info("Operação em andamento...");
```

### 4. **Error Handling Uniforme**
```typescript
try {
  // operação
} catch (e) {
  const msg = getFriendlyErrorMessage(e, "ao [ação]");
  toast.error(msg);
}
```

### 5. **Comunicação com Edge Functions**
```typescript
const response = await fetch('/.netlify/functions/chat-completions', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ systemPrompt, userPrompt, temperature })
});

if (!response.ok) {
  throw new Error(`API failed: ${response.status}`);
}

const data = await response.json();
```

### 6. **Custom Hooks para Data Fetching**
Padrão: `useXxx() → useState + useEffect + useQuery`
- `useChannelMetrics()` — busca métricas do channel
- `useGenerationLogger()` — rastreia logs de geração
- `useFFmpegExport()` — orquestra exportação WASM

### 7. **Composição de Componentes**
- Props tipadas com TypeScript
- Padrão: `interface ComponentProps { prop: Type }` + `export const Component: React.FC<ComponentProps>`
- Reutilização via composição, não herança

### 8. **Agents (Orquestração de IA)**
Diretório: `src/agents/`
- `narratorAgent.ts` — gera roteiros
- `ttsAgent.ts` → `youtube-generate-audio` Edge Function
- `visualAgent.ts` — coordena imagens
- Padrão: Agents chamam Edge Functions e formatam respostas

### 9. **Produção Wizard (8 Steps)**
**Arquivo:** `src/pages/Production/Index.tsx`
1. Tópico + sumário automático
2. Aprovação de capítulos
3. Geração de roteiros (BUG ATIVO)
4. Áudio/TTS por capítulo
5. Extração de cenas
6. Imagens por cena
7. Montagem FFmpeg WASM
8. SEO (título, tags)

**Estado:** Persiste em localStorage (`production-wizard-state`)

### 10. **TypeScript Strict**
- Sem `any` implícitos
- Tipos gerados automaticamente do banco: `src/integrations/supabase/types.ts`
- Arquivo é auto-gerado (não editar manualmente)

---

## 7. BUGS CONHECIDOS (P0 - Bloqueadores)

| Prioridade | Descrição | Localização | Impacto |
|------------|-----------|-------------|---------|
| **P0** | Geração de roteiros falha silenciosamente | `Production/Index.tsx:~535` | Bloqueia wizard step 3 |
| **P0** | Áudio blob: URLs quebram preview Remotion | `useFFmpegExport()` | Preview sem seekbar |
| **P0** | Download WebM vazio por canvas "tainted" | `FFmpeg export logic` | Export não funciona |

---

## 8. SECRETS & CONFIGURAÇÃO

### Variáveis de Ambiente (Frontend)
```env
VITE_SUPABASE_URL=https://bwitfpvqruwikpuaiurc.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sbp_d97d2fb2e131bdf0a0238936f0830360713dcd75
```

### Secrets (Edge Functions - Supabase)
```
AI33_API_KEY          # LLM primário
OPENROUTER_API_KEY    # LLM fallback
KIE_API_KEY           # Geração de imagens (Kie.ai)
APIFY_API_TOKEN       # Web scraping (YouTube competitors)
```

---

## 9. COMANDOS PRINCIPAIS

```bash
# Desenvolvimento
npm run dev              # Vite dev server (localhost:5173)
npm run build           # Build for production
npm run lint            # ESLint

# Supabase (local)
supabase start          # Inicia containers Docker local
supabase migrations up  # Aplica migrations
supabase functions deploy [name] # Deploy função
```

---

## 10. CONVENÇÕES DE GIT

**Branch strategy:** main (simples, sem feature branches complexas)  
**Commit messages:** Português descritivo  
**Git user:** Cigano-agi  
**Remote:** https://github.com/Cigano-agi/autodark.git

---

## 11. RESUMO EXECUTIVO

**Stack:** React 18 + TypeScript + Supabase + Edge Functions (Deno)  
**Componentização:** shadcn/ui + Tailwind  
**State Management:** TanStack Query v5  
**Validação:** Zod disponível, uso ad-hoc  
**Autenticação:** Supabase Auth com RLS  
**Testes:** Não estruturado  
**Padrão de erro:** Centralizador em `errorHandler.ts` → Toast  
**Banco:** Postgres com 6 entidades principais + 10 migrations  

**Próximas features devem:**
1. Respeitar padrão de error handling (`getFriendlyErrorMessage`)
2. Usar RLS para segurança em novas tabelas
3. Implementar testes (Vitest) se task é crítica
4. Adicionar tipos TypeScript rigorosamente
5. Considerar Zod para validação de edge cases
