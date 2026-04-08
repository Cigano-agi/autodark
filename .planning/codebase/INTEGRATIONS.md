# External Integrations

## AI/LLM Services

### AI33 (Primary LLM)
- **Service Name**: AI33.pro
- **Purpose**: Text generation for scripts, ideas, SEO, strategy, and general prompts
- **Base URL**: https://api.ai33.pro/v1/chat/completions
- **Where Used**: 
  - `src/agents/llm.ts` → `callClaude()` function (first call attempt)
  - `src/agents/scripterAgent.ts` → Script generation
  - `src/agents/headAgent.ts` → Idea generation
  - `src/agents/seoAgent.ts` → SEO optimization
  - `supabase/functions/chat-completions/index.ts` → Edge function handler
  - `supabase/functions/generate-ideas/index.ts`
  - `supabase/functions/generate-script/index.ts`
  - `supabase/functions/generate-strategy/index.ts`
- **Auth**: 
  - Frontend: `VITE_AI33_API_KEY`
  - Backend: `AI33_API_KEY`

### OpenRouter (LLM Fallback)
- **Service Name**: OpenRouter.ai
- **Purpose**: Text generation fallback when AI33 unavailable
- **Base URL**: https://openrouter.ai/api/v1/chat/completions
- **Where Used**: 
  - `supabase/functions/chat-completions/index.ts` → Fallback for text
- **Auth**: 
  - Frontend: `VITE_OPENROUTER_API_KEY`
  - Backend: `OPENROUTER_API_KEY`

### Kie.ai (Image Generation - Flux)
- **Service Name**: Kie.ai
- **Purpose**: High-quality image generation using Flux model
- **Where Used**: 
  - `src/agents/llm.ts` → `callImageGeneration()` function (first attempt)
  - `src/agents/visualAgent.ts` → Visual asset generation
  - `supabase/functions/generate-kie-flow/index.ts` → Async polling pattern
- **Auth**: 
  - Frontend: `VITE_KIE_API_KEY`
  - Backend: `KIE_API_KEY`

### Pollinations.ai (Image & Text)
- **Service Name**: Pollinations.ai
- **Purpose**: Open-source image/text generation fallback
- **Where Used**: 
  - `src/agents/llm.ts` → Image and text generation fallback
  - `vite.config.ts` → Proxy at `/api-pollinations`
- **Auth**: None (free, no key required)

### StreamElements TTS
- **Service Name**: StreamElements Kappa v2 API
- **Purpose**: Free TTS with Amazon Polly voices (Portuguese BR Vitoria)
- **Where Used**: 
  - `src/agents/tts.ts` → `fetchStreamElementsTTS()` (primary fallback)
  - `vite.config.ts` → Proxy at `/api-streamelements`
- **Auth**: None (free, no API key)

### Google Translate TTS
- **Service Name**: Google Translate TTS
- **Purpose**: Secondary TTS fallback
- **Where Used**: 
  - `src/agents/tts.ts` → `fetchGoogleTTS()`
  - `vite.config.ts` → Proxy at `/api-tts`
- **Auth**: None (free, no API key)

### Web Speech API (Browser TTS)
- **Service Name**: Browser Web Speech API
- **Purpose**: Tertiary fallback, zero-latency native TTS
- **Where Used**: 
  - `src/agents/narratorAgent.ts` → When voice="browser"
- **Auth**: None (browser native)

### Google Cloud TTS / AI33 TTS (Edge)
- **Service Name**: Google Cloud TTS Chirp3-HD or AI33 TTS
- **Purpose**: Server-side TTS via edge functions
- **Where Used**: 
  - `supabase/functions/youtube-generate-audio/index.ts`
- **Auth**: `GOOGLE_TTS_API_KEY` or `AI33_API_KEY`

## Video & Media

### Remotion
- **Service Name**: Remotion
- **Purpose**: Programmatic video composition with React
- **Where Used**: `src/components/Factory/Director.tsx`
- **Auth**: None (local npm package)

### FFmpeg.js
- **Service Name**: FFmpeg (JavaScript/WASM)
- **Purpose**: Browser-based video processing and encoding
- **Where Used**: Video post-processing in Factory
- **Auth**: None (local library)

## Data & Storage

### Supabase
- **Service Name**: Supabase (PostgreSQL + Auth + Storage + Edge Functions)
- **Where Used**: 
  - `src/integrations/supabase/client.ts` → Client initialization
  - All agents for database operations
  - Edge Functions for serverless operations
- **Auth**: 
  - Frontend: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`
  - Backend: `SUPABASE_URL`, `SUPABASE_ANON_KEY`

## YouTube & Content

### YouTube API (Public)
- **Service Name**: YouTube
- **Purpose**: Channel metrics, competitor analysis
- **Where Used**: 
  - `supabase/functions/scrape-youtube-channel/index.ts`
  - `supabase/functions/sync-youtube-metrics/index.ts`
  - `src/agents/trendAgent.ts`
- **Auth**: None (public data)

### Apify
- **Service Name**: Apify Web Scraping
- **Purpose**: Scalable scraping and data extraction
- **Where Used**: Backend scraping tasks
- **Auth**: `APIFY_API_TOKEN`

### Unsplash
- **Service Name**: Unsplash Image Library
- **Purpose**: Stock photography and fallback images
- **Where Used**: `vite.config.ts` proxy → `/api-unsplash`
- **Auth**: None (free tier)

## Deployment

### Vercel
- **Service Name**: Vercel
- **Purpose**: Frontend hosting and CI/CD
- **Auth**: `VERCEL_OIDC_TOKEN`

### Supabase CLI
- **Service Name**: Supabase (local development)
- **Purpose**: Local database emulation and migrations
- **Config**: `supabase/config.toml`

## Environment Variables

Frontend:
- `VITE_AI33_API_KEY`
- `VITE_OPENROUTER_API_KEY`
- `VITE_KIE_API_KEY`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_SUPABASE_PROJECT_ID`

Backend/Edge Functions:
- `AI33_API_KEY`
- `OPENROUTER_API_KEY`
- `KIE_API_KEY`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `GOOGLE_TTS_API_KEY`
- `OPENAI_API_KEY`
- `APIFY_API_TOKEN`

Deployment:
- `VERCEL_OIDC_TOKEN`

