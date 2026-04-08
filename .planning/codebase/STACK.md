# Tech Stack

## Frontend
- **Framework**: React 18.3.1
- **Routing**: React Router DOM 6.30.1
- **UI Component Library**: Radix UI (extensive: accordion, alert-dialog, avatar, checkbox, dialog, dropdown-menu, tabs, tooltip, etc.)
- **UI Kit**: shadcn/ui (built on Radix UI)
- **Styling**: Tailwind CSS 3.4.17
- **Styling Utilities**: Tailwind Merge, Class Variance Authority, CLSX
- **Animations**: Framer Motion 12.35.2, Tailwind CSS Animate
- **Form Management**: React Hook Form 7.71.2
- **Schema Validation**: Zod 3.25.76
- **State Management**: TanStack React Query 5.83.0
- **Build Tool**: Vite 5.4.19 with React SWC plugin
- **Theme Management**: Next Themes 0.3.0
- **Icons**: Lucide React 0.462.0
- **Data Visualization**: Recharts 2.15.4
- **Markdown Rendering**: React Markdown 10.1.0
- **Toast Notifications**: Sonner 1.7.4

## Video/Media
- **Video Composition**: Remotion 4.0.437 (@remotion/core, @remotion/player)
- **Video Editing**: FFmpeg.js (@ffmpeg/ffmpeg 0.12.15, @ffmpeg/core 0.12.10, @ffmpeg/util 0.12.2)
- **Carousel**: Embla Carousel React 8.6.0
- **Resizable Panels**: React Resizable Panels 4.7.3
- **Audio Handling**: Native Web Audio API, MediaRecorder
- **Archive Creation**: JSZip 3.10.1

## Backend/BaaS
- **Backend as a Service**: Supabase
- **Supabase Client**: @supabase/supabase-js 2.98.0
- **Database**: PostgreSQL (via Supabase)
- **Real-time**: Supabase Realtime
- **Authentication**: Supabase Auth
- **Storage**: Supabase Storage

## Edge Functions (Serverless)
- **Deployment**: Supabase Edge Functions (Deno-based)
- **Functions**:
  1. `chat-completions` - LLM text generation (AI33, OpenRouter fallback)
  2. `generate-kie-flow` - Image generation via Kie.ai
  3. `generate-ideas` - Video idea generation
  4. `generate-script` - Script writing
  5. `generate-strategy` - Content strategy
  6. `generate-directives` - Director instructions
  7. `generate-video-scenes` - Scene extraction
  8. `generate-scene-images` - Batch image generation
  9. `youtube-generate-audio` - TTS audio generation
  10. `youtube-long-engine` - Long-form video pipeline
  11. `process-content-audio` - Audio processing
  12. `scrape-youtube-channel` - YouTube data scraping
  13. `sync-youtube-metrics` - Metrics synchronization

## AI / LLM Providers
- **Primary Text LLM**: AI33 (api.ai33.pro)
  - Used for: Script writing, idea generation, SEO optimization, content strategy
  - Alternative: OpenRouter API (openrouter.ai)
  
- **Image Generation**:
  - Primary: Kie.ai (Flux model) - via edge function generate-kie-flow
  - Fallback: Pollinations.ai (open-source image generation)
  - Canvas Fallback: Browser-generated placeholder images
  
- **Text-to-Speech (TTS)**:
  - Primary: StreamElements API (free, Amazon Polly voices, pt-BR Vitória voice)
  - Fallback 1: Google Translate TTS endpoint (via proxy)
  - Fallback 2: Browser Web Speech API (native)
  - Alternative (edge): AI33 TTS, Google Cloud TTS (with API key)

- **LLM Streaming**:
  - Service: Pollinations.ai (text.pollinations.ai endpoint)
  - Use case: Fallback for Claude-like text generation when edge functions unavailable

## External Integrations
- **YouTube API**: 
  - Scraping: youtube-generate-audio function
  - Metrics: sync-youtube-metrics function
  
- **Unsplash API**: Image sourcing (via proxy endpoint `/api-unsplash`)

- **Apify**: Web scraping service (APIFY_API_TOKEN)

## Key Dependencies
1. **@supabase/supabase-js** (2.98.0) - Database, Auth, Storage, Edge Functions
2. **react** (18.3.1) - UI library
3. **react-router-dom** (6.30.1) - Client-side routing
4. **@radix-ui/*** - Accessible UI primitives
5. **tailwindcss** (3.4.17) - Utility-first CSS
6. **framer-motion** (12.35.2) - Declarative animations
7. **recharts** (2.15.4) - Data visualization
8. **remotion** (4.0.437) - Programmatic video creation
9. **@ffmpeg/ffmpeg** (0.12.15) - Video processing in browser
10. **react-hook-form** (7.71.2) - Efficient form state management

## Development Tools
- **Language**: TypeScript 5.8.3
- **Linting**: ESLint 9.32.0
- **Testing**: Playwright 1.59.1
- **Build Optimization**: Vite chunk splitting (vendor-react, vendor-ui, vendor-supabase, vendor-charts, vendor-remotion, vendor-ffmpeg)
- **Environment**: Node.js modules (JSR/npm compatible)

## Architecture Patterns
- **Agents**: Modular LLM-driven agents (head, narrator, scripter, visual, trend, SEO)
- **Pipeline Orchestrator**: Coordinates multi-stage content generation
- **Multi-layer Fallbacks**: Each service has 2-3 fallback providers
- **TypeScript Types**: Generated from Supabase schema
- **Responsive Design**: Tailwind breakpoints, mobile-first approach
