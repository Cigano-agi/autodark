# Directory Structure

## src/ Layout

```
src/
├── App.tsx                          # Root router: ProtectedRoute/PublicRoute, lazy-loaded pages
├── main.tsx                         # React root render
│
├── agents/                          # AI pipeline orchestration
│   ├── pipelineOrchestrator.ts      # usePipelineOrchestrator: state machine, step persistence
│   ├── headAgent.ts                 # generateIdeasBatch: idea generation
│   ├── scripterAgent.ts             # generateFullScript: script/chapter generation
│   ├── narratorAgent.ts             # generateAllNarrations: TTS synthesis
│   ├── visualAgent.ts               # generateVisuals, extractScenes: image generation
│   ├── seoAgent.ts                  # generateSEO: metadata generation
│   ├── trendAgent.ts                # analyzeTrends: competitor analysis
│   ├── llm.ts                       # callClaude: Claude API wrapper
│   └── types.ts                     # Pipeline types: VideoChapter, SceneData, PipelineState, etc.
│
├── components/
│   ├── layout/                      # Shell layout components
│   │   ├── AppLayout.tsx            # Main authenticated layout with sidebar
│   │   └── PremiumSidebar.tsx       # Sidebar navigation (open/close toggle)
│   │
│   ├── ui/                          # Shadcn/Radix UI primitives (~50 files)
│   │   ├── button.tsx, card.tsx, dialog.tsx, input.tsx, etc.
│   │   └── beams-background.tsx     # Background animation component
│   │
│   ├── Factory/                     # Production wizard context & factory
│   │   └── FactoryContext.tsx       # useFactory: manages production state + orchestration
│   │
│   ├── Channel/                     # Channel-specific components
│   │   └── ChannelSetupBanner.tsx   # Setup progress: foundation/blueprint/hub
│   │
│   ├── Dashboard/                   # Dashboard-specific components
│   │   └── GlobalQueueSection.tsx   # Queue visualization
│   │
│   ├── Strategy/                    # Strategy components (competitor, blueprint)
│   ├── YouTube/                     # YouTube integration UI
│   │   └── ConnectYouTubeModal.tsx  # Channel connection modal
│   │
│   ├── ContentPipeline.tsx          # Reusable pipeline UI component
│   ├── PipelineProgress.tsx         # Progress visualization
│   ├── GenerationDebugConsole.tsx   # Real-time logs from pipeline
│   └── ErrorBoundary.tsx            # Error fallback
│
├── pages/
│   ├── Login.tsx                    # Public login page
│   ├── Dashboard.tsx                # Dashboard: channel list, creation modal
│   ├── Channel/
│   │   ├── Index.tsx                # Main channel view with tabs
│   │   └── tabs/
│   │       ├── DashboardTab.tsx
│   │       ├── IdeasTab.tsx
│   │       ├── QueueTab.tsx
│   │       ├── CompetitorsTab.tsx
│   │       ├── ConfigTab.tsx
│   │       ├── BlueprintTab.tsx
│   │       └── others...
│   ├── Production/
│   │   └── Index.tsx                # ProductionWizard: semi-auto pipeline launcher
│   ├── Foundation/
│   │   └── Index.tsx                # Channel DNA setup
│   ├── Pipeline/
│   │   └── Index.tsx                # Global queue view
│   ├── MediaHub/
│   │   └── Index.tsx                # Asset hub
│   ├── LongVideoStudio.tsx          # Video editor (Remotion)
│   ├── ChannelPrompts.tsx           # Prompt management
│   └── NotFound.tsx                 # 404 page
│
├── hooks/
│   ├── useAuth.tsx
│   ├── useChannels.tsx
│   ├── useContents.tsx
│   ├── useContentIdeas.tsx
│   ├── useBlueprint.tsx
│   ├── useChannelFoundation.tsx
│   ├── useHeadAgent.tsx
│   ├── usePipeline.tsx
│   ├── useGlobalQueue.tsx
│   ├── useYouTubeMetrics.tsx
│   └── others...
│
├── remotion/
│   ├── RemotionPreview.tsx
│   ├── compositions/
│   │   ├── TitleCard.tsx
│   │   ├── SlideShow.tsx
│   │   └── SlideScene.tsx
│   └── overlays/
│       ├── CaptionOverlay.tsx
│       └── KenBurns.tsx
│
├── integrations/supabase/
│   └── client.ts                    # Supabase JS client
│
├── lib/
│   ├── utils.ts                     # Utilities (cn, formatNumber, etc.)
│   ├── storage.ts                   # Upload functions
│   ├── traceContext.ts              # Execution tracing
│   └── debugLogger.ts               # Debug logging
│
├── design-system/
│   ├── components/                  # Design system components
│   └── tokens/                      # Design tokens (colors, spacing, etc.)
│
├── constants/
│   └── navigation.ts                # Nav items config
│
└── index.css                        # Global styles
```

## Key Files (Top 10 Most Critical)

| File | Purpose |
|------|---------|
| src/App.tsx | Routes definition, ProtectedRoute/PublicRoute wrappers, lazy-loaded pages |
| src/agents/pipelineOrchestrator.ts | State machine orchestrating production pipeline, step persistence |
| src/components/layout/AppLayout.tsx | Main shell layout (sidebar + outlet) |
| src/pages/Production/Index.tsx | Semi-auto production UI: input → launch pipeline |
| src/pages/Channel/Index.tsx | Channel view hub with tabbed UI |
| src/hooks/useAuth.tsx | Authentication context, session management |
| src/hooks/useChannels.tsx | Channel CRUD operations |
| src/agents/headAgent.ts | AI idea generation agent |
| src/hooks/usePipeline.tsx | Pipeline state queries and mutations |
| src/pages/Dashboard.tsx | Dashboard: channel list, creation, global queue |

## Pages → Routes Mapping

| Page File | Route | Purpose |
|-----------|-------|---------|
| Dashboard.tsx | /dashboard | Channel list, creation, global queue |
| Channel/Index.tsx | /channel/:id | Channel overview with tabbed interface |
| ChannelPrompts.tsx | /channel/:id/prompts | Manage AI prompts |
| LongVideoStudio.tsx | /channel/:id/studio | Remotion-based video editor |
| Production/Index.tsx | /channel/:id/production | Semi-auto pipeline launcher |
| Foundation/Index.tsx | /channel/:id/foundation | Channel DNA definition |
| Pipeline/Index.tsx | /pipeline | Global production queue |
| MediaHub/Index.tsx | /hub | Asset hub: voices, models, defaults |
| Login.tsx | / | Public login page |
| NotFound.tsx | * | 404 fallback |

## Hooks Inventory

| Hook | Purpose |
|------|---------|
| useAuth | Authentication context: user, session, signIn/signUp/signOut |
| useChannels | Fetch all channels, create, update, delete |
| useContents | Fetch channel contents, create/update/delete items |
| useContentIdeas | Fetch ideas per channel, create ideas |
| useBlueprint | Fetch/update channel blueprint (persona, visual style, voice) |
| useChannelFoundation | Fetch/update channel DNA (niche, audience, personality) |
| useHeadAgent | Trigger idea generation workflow |
| useCompetitors | Fetch competitor data |
| useYouTubeMetrics | YouTube integration: connect, sync metrics |
| useChannelMetrics | Channel stats and performance |
| usePipeline | Query/mutate pipeline topics, scripts, uploads |
| useGlobalQueue | Fetch global production queue |
| useContentPipeline | Content pipeline state and operations |
| useVideoAssembler | Video composition assembly |
| useFFmpegExport | FFmpeg-based export utilities |
| useProductionPersistence | Save/load production state from localStorage |
| useMobile | Detect mobile breakpoint (< 1024px) |
| useToast | Toast notification (Sonner) |

## Design System

- **UI Components:** Shadcn/Radix primitives (50+ components)
- **Design Tokens:** Colors, spacing, breakpoints, typography
- **Custom Components:** Button, Card, Layout, Typography wrappers
- **Styling:** Tailwind CSS v3.4 + custom animations
- **Background:** BeamsBackground animated effect
