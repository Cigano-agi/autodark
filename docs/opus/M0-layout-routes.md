# OPUS MISSÃO 0 — Layout Wrapper + Reorganização de Rotas

> Leia este arquivo inteiro antes de escrever uma linha de código.
> Contexto do app: React + TypeScript + Vite + Tailwind + shadcn/ui + Supabase Auth

---

## Estado Atual (o que existe)

```
src/
  App.tsx                        ← rotas + ProtectedRoute/PublicRoute
  pages/
    Dashboard.tsx                ← renderiza seu próprio DashboardHeader
    ChannelView.tsx              ← 837 linhas, renderiza seu próprio DashboardHeader
    ChannelPrompts.tsx           ← renderiza seu próprio DashboardHeader
    LongVideoStudio.tsx          ← renderiza seu próprio DashboardHeader
    Production/Index.tsx         ← renderiza seu próprio DashboardHeader
    Pipeline/Index.tsx           ← renderiza seu próprio DashboardHeader (já tem pt-28)
    Foundation/Index.tsx         ← renderiza seu próprio DashboardHeader
    MediaHub/Index.tsx           ← renderiza seu próprio DashboardHeader
  components/
    ui/dashboard-header.tsx      ← header fixo com logo + nav + signout
```

**Problema:** cada página inclui `<DashboardHeader />` manualmente + seu próprio `pt-28`.

---

## O Que Fazer

### PASSO 1 — Criar `src/components/layouts/AppLayout.tsx`

```tsx
// src/components/layouts/AppLayout.tsx
import { DashboardHeader } from "@/components/ui/dashboard-header";
import { Outlet } from "react-router-dom";

export function AppLayout() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <DashboardHeader />
      {/* pt-28 está em cada página individualmente — NÃO adicionar aqui.
          Cada página controla seu próprio padding top porque algumas usam
          BeamsBackground que precisa ser o wrapper mais externo. */}
      <Outlet />
    </div>
  );
}
```

> **IMPORTANTE:** Não mova o `pt-28` para cá. Páginas com `BeamsBackground` precisam que ele fique dentro delas. O AppLayout serve apenas para eliminar o `<DashboardHeader />` duplicado.

### PASSO 2 — Remover `<DashboardHeader />` de cada página

Depois de criar o AppLayout, remova o import e uso de `<DashboardHeader />` de:
- `src/pages/Dashboard.tsx`
- `src/pages/ChannelView.tsx`
- `src/pages/ChannelPrompts.tsx`
- `src/pages/LongVideoStudio.tsx`
- `src/pages/Production/Index.tsx`
- `src/pages/Pipeline/Index.tsx`
- `src/pages/Foundation/Index.tsx`
- `src/pages/MediaHub/Index.tsx`

### PASSO 3 — Atualizar rotas em `src/App.tsx`

**Rotas atuais:**
```
/production          → ProductionWizard
/channel/:id/studio  → LongVideoStudio
/fix                 → FixAndVerify
/hub                 → MediaHub
```

**Rotas novas:**
```
/channel/:id/production  → ProductionWizard   (scoped por canal)
/channel/:id/studio      → LongVideoStudio    (mantém igual)
/hub                     → MediaHub           (mantém igual)
/fix                     → REMOVER da produção (ou redirecionar para /dashboard)
```

**Estrutura nova do App.tsx:**

```tsx
// src/App.tsx — estrutura das rotas autenticadas

<Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
  <Route path="/dashboard" element={<Dashboard />} />
  <Route path="/channel/:id" element={<ChannelView />} />
  <Route path="/channel/:id/prompts" element={<ChannelPrompts />} />
  <Route path="/channel/:id/studio" element={<LongVideoStudio />} />
  <Route path="/channel/:id/production" element={<ProductionWizard />} />
  <Route path="/channel/:id/foundation" element={<FoundationPage />} />
  <Route path="/pipeline" element={<PipelinePage />} />
  <Route path="/hub" element={<MediaHub />} />
</Route>

// Redirecionar /production → /dashboard (sem canal context, não faz sentido)
<Route path="/production" element={<Navigate to="/dashboard" replace />} />
<Route path="/fix" element={<Navigate to="/dashboard" replace />} />
```

**ATENÇÃO:** A rota de ProtectedRoute agora wraps o AppLayout, não cada rota individualmente.

```tsx
// Novo ProtectedRoute — mais simples
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <LazyFallback />;
  if (!user) return <Navigate to="/" replace />;
  return <>{children}</>;
}
```

### PASSO 4 — Atualizar todas as navegações internas

Buscar no codebase por `navigate('/production'` e substituir por `navigate(`/channel/${channelId}/production`)`.

Arquivos que têm essa navegação:
- `src/pages/ChannelView.tsx` — linha com `navigate('/production', { state: { channelId: id } })`
  → mudar para `navigate(`/channel/${id}/production`)`
- `src/pages/ChannelView.tsx` — tab "Conteúdos" também tem link para production
  → mesma substituição

O `ProductionWizard` receberá o channelId via `useParams()` ao invés de `location.state`:
```tsx
// Dentro de Production/Index.tsx
const { id: channelId } = useParams<{ id: string }>();
// Remover: const [selectedChannelId, setSelectedChannelId] = useState(location.state?.channelId || "");
// O canal é fixo — vem da URL
```

### PASSO 5 — Quebrar ChannelView.tsx em sub-componentes

O arquivo atual tem 837 linhas com todas as tabs inline. Objetivo: `ChannelView.tsx` com < 150 linhas.

**Estrutura de arquivos a criar:**
```
src/pages/Channel/
  Index.tsx               ← renomear/mover ChannelView.tsx para cá
  tabs/
    DashboardTab.tsx      ← extrai TabsContent value="dashboard"
    IdeasTab.tsx          ← extrai TabsContent value="ideas"
    ContentsTab.tsx       ← extrai TabsContent value="videos"
    PipelineTab.tsx       ← extrai TabsContent value="pipeline"
    CompetitorsTab.tsx    ← extrai TabsContent value="competitors"
    BlueprintTab.tsx      ← extrai TabsContent value="blueprint"
    SettingsTab.tsx       ← extrai TabsContent value="settings"
```

**Interface de cada tab component:**
```tsx
// Cada tab recebe o channelId como prop mínima
// Dados específicos ficam dentro de cada tab usando os hooks necessários

// DashboardTab.tsx
interface DashboardTabProps {
  channelId: string;
  channel: Channel;
}
export function DashboardTab({ channelId, channel }: DashboardTabProps) { ... }

// IdeasTab.tsx
interface IdeasTabProps {
  channelId: string;
  isAiLoading: boolean;
  onGenerateStrategy: () => void;
}
export function IdeasTab({ channelId, isAiLoading, onGenerateStrategy }: IdeasTabProps) { ... }

// BlueprintTab.tsx — tem o maior estado local (bp*), manter estado dentro dele
interface BlueprintTabProps {
  channelId: string;
}
export function BlueprintTab({ channelId }: BlueprintTabProps) {
  // Move todo o estado bp* e handleSaveBlueprint para cá
  const { blueprint, updateBlueprint } = useBlueprint(channelId);
  // ... resto do estado local
}
```

**Channel/Index.tsx final (estrutura):**
```tsx
export default function ChannelView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { channels } = useChannels();
  const channel = channels?.find(c => c.id === id);
  const { generateStrategy, isLoading: isAiLoading } = useHeadAgent();
  const { connectWithApify, syncMetrics } = useYouTubeMetrics();
  const [isConnectModalOpen, setIsConnectModalOpen] = useState(false);

  if (!channel) return null;

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Breadcrumb — já implementado pelo Sonnet */}

      {/* Channel Header Card */}
      <ChannelHeaderCard channel={channel} onConnect={...} onSync={...} onNewVideo={...} />

      {/* Tabs */}
      <Tabs defaultValue="dashboard" onValueChange={(v) => v === "prompts" && navigate(`/channel/${id}/prompts`)}>
        <TabsList>...</TabsList>
        <TabsContent value="dashboard"><DashboardTab channelId={id} channel={channel} /></TabsContent>
        <TabsContent value="ideas"><IdeasTab channelId={id} isAiLoading={isAiLoading} onGenerateStrategy={() => generateStrategy(id)} /></TabsContent>
        <TabsContent value="videos"><ContentsTab channelId={id} /></TabsContent>
        <TabsContent value="pipeline"><ContentPipeline channelId={id} /></TabsContent>
        <TabsContent value="competitors"><CompetitorsTab channelId={id} /></TabsContent>
        <TabsContent value="blueprint"><BlueprintTab channelId={id} /></TabsContent>
        <TabsContent value="settings"><SettingsTab channel={channel} /></TabsContent>
      </Tabs>
    </div>
  );
}
```

Também extrair o Channel Header (banner + avatar + stats + botões) para:
```
src/pages/Channel/components/ChannelHeaderCard.tsx
```

---

## Critério de Conclusão

- [ ] `AppLayout.tsx` existe e funciona com Outlet
- [ ] Zero `<DashboardHeader />` imports nas páginas (verificar com grep)
- [ ] `/production` redireciona para `/dashboard`
- [ ] `/channel/:id/production` funciona e recebe channelId via useParams
- [ ] `ChannelView.tsx` (ou `Channel/Index.tsx`) tem < 150 linhas
- [ ] Cada tab é um componente separado em `Channel/tabs/`
- [ ] Nenhuma rota quebrada (testar todas as navegações)
- [ ] Nenhum `console.error` de import quebrado

---

## Armadilhas Conhecidas

1. **BeamsBackground precisa ser wrapper externo** — algumas páginas têm `<BeamsBackground className="bg-background">` como elemento raiz. Não interfira nisso.

2. **useAuth está no AuthProvider** — que está dentro do BrowserRouter. O AppLayout não pode estar fora do AuthProvider. A estrutura atual é:
   ```
   QueryClientProvider → BrowserRouter → AuthProvider → AppRoutes
   ```
   Mantenha essa hierarquia.

3. **ChannelView tem estado local pesado** — ao extrair tabs, cada tab que tinha estado local (como BlueprintTab com 11 estados bp*) deve internalizar esse estado, não tentar passar 11 props para cima.

4. **LongVideoStudio tem overlap com ProductionWizard** — não merge por agora. Deixe os dois separados. Missão 1 trata isso.
