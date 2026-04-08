# Architecture

## Overview

**AutoDark** is a AI-powered content production platform for YouTube creators. It automates the entire video creation workflow: from generating video ideas based on trends, to writing scripts, generating narrations with AI voices, creating visuals, and assembling final videos. The system uses a modular agent-based architecture with a React frontend and Supabase backend, orchestrated by a pipeline that guides content through multiple production stages.

## Data Flow

**Main Content Pipeline:**
1. **Idea Generation** → User creates or approves AI-generated video ideas based on channel trends (headAgent)
2. **Script Generation** → Ideas are expanded into full scripts with chapters and scenes (scripterAgent)
3. **Narration & Audio** → Scripts are converted to speech with TTS (narratorAgent + tts)
4. **Visual Generation** → Scenes receive AI-generated images based on prompts (visualAgent)
5. **Assembly** → Scenes are combined into final video composition (videoAssembler)
6. **SEO Metadata** → Titles, descriptions, tags, and chapters generated (seoAgent)
7. **Storage & Publishing** → Final assets uploaded, content marked ready (persistStep + Supabase)

**Blueprint Customization:**
- Each channel has a **Blueprint** (persona_prompt, script_rules, visual_style, voice_id)
- Blueprints control tone, character, aesthetics across all generated content
- Foundation defines channel DNA (niche, target audience, brand voice)

## Route Structure

| Route | Component | Purpose |
|-------|-----------|---------|
| `/` | Login | Public auth entry point |
| `/dashboard` | Dashboard | Main hub: browse channels, create new channels, view global queue |
| `/channel/:id` | ChannelView | Channel overview with tabs (dashboard, ideas, queue, competitors, config) |
| `/channel/:id/foundation` | FoundationPage | Define channel DNA: niche, personality, target audience |
| `/channel/:id/production` | ProductionWizard | Semi-auto pipeline UI: input idea → launch production |
| `/channel/:id/studio` | LongVideoStudio | Manual video editor (Remotion-based) with composition tools |
| `/channel/:id/prompts` | ChannelPrompts | Manage AI prompts for content generation |
| `/pipeline` | PipelinePage | Global queue: monitor all production jobs across channels |
| `/hub` | MediaHub | Asset library: voices, image models, TTS settings, defaults |

**Route Protection:**
- **ProtectedRoute:** Requires valid user session; redirects to `/` if not logged in
- **PublicRoute:** Redirects to `/dashboard` if already logged in
- All authenticated routes wrap with `AppLayout` (sidebar + Outlet)

## Auth Model

**Supabase Auth:**
- Email/password and OAuth (Google) authentication
- User session persisted in AuthContext
- Emergency bypass: localStorage keys for dev/demo users (`autodark_bypass_auth`, `autodark_bypass_email`)

**useAuth Hook:**
- Provides `user`, `session`, `loading`, `userName`
- Manages signIn, signUp, signOut, OAuth flows
- Singleton AuthProvider wraps entire app at root

## AI Pipeline

**Agents & Roles:**
1. **headAgent** (generateIdeasBatch) → Analyzes trends, generates 10+ video ideas with scores
2. **scripterAgent** (generateFullScript) → Converts idea into multi-chapter script with narration
3. **narratorAgent** (generateAllNarrations) → TTS synthesis for each scene (voice: ai33, vivoV2, etc.)
4. **visualAgent** (generateVisuals, extractScenes) → Creates image prompts, generates images (Flux, DALL-E)
5. **seoAgent** (generateSEO) → Titles, descriptions, tags, chapter markers
6. **trendAgent** (analyzeTrends) → Analyzes competitor titles, suggests angles, patterns
7. **llm** (callClaude) → Core LLM interface wrapping Claude API calls

**Orchestrator:**
- `usePipelineOrchestrator` → State machine managing pipeline stages (idle → analyzing_trends → generating_ideas → waiting_approval → generating_script → generating_audio → extracting_scenes → generating_visuals → assembling → generating_seo → saving → done)
- Persists progress to Supabase `channel_contents` table
- Supports save/load of ProductionState to localStorage
- Each step emits `logStep()` for debug console

**Hub Defaults:**
- Stored in localStorage as `autodark_hub_defaults_v2`
- Per-channel: voice (ai33/vivoV2), voiceId, slidesImage model, thumbImage model, videoModel
- Falls back to global defaults if channel-specific not set

**Trace Context & Debug:**
- `createTraceContext()` → Captures execution flow
- `traceToMarkdown()` → Renders trace as readable report
- GenerationDebugConsole displays real-time logs from each step
