# PLAN: Debug Log System & Roadmap -- AutoDark Studio

**Data:** 2026-04-07 | **Status:** DRAFT | **Tipo:** WEB (SaaS)

---

## Overview

AutoDark pipeline orchestrates 7+ async steps (trends, ideas, script, TTS, visuals, SEO, save) across Supabase Edge Functions, external AI APIs, and client-side processing. Today, failures are invisible: console.log is the only trace, edge function errors go unnoticed (AI33 dead key for weeks), and AI agents waste time rediscovering known bugs.

This plan addresses two needs:
1. **Debug Log System** -- structured, append-only execution traces saved as Markdown (VSCode-native, AI-agent friendly)
2. **Roadmap** -- ordered sprints covering smoke testing, quality (Sprint C), and observability

---

## Success Criteria

| # | Criteria | Measurable |
|---|---------|------------|
| SC-1 | Every pipeline run produces a trace in pipeline_traces DB table | Row count increases after each run |
| SC-2 | Every edge function call logs provider used, latency, success/failure | Response includes _debug object |
| SC-3 | An AI agent can read structured logs and immediately understand failures | Markdown export available, no grep required |
| SC-4 | A full video can be generated E2E (script to audio to images to preview) | Smoke test passes |
| SC-5 | SEO metadata generated for every video | channel_contents.hook contains SEO block |
| SC-6 | TTS fallback chain is hardened (no silent failures) | Trace shows which provider was used and why |

---

## Tech Stack (Existing)

| Layer | Tech | Notes |
|-------|------|-------|
| Frontend | React 18 + TypeScript + Vite + Tailwind + Shadcn UI | Deployed to Vercel |
| Backend | Supabase (Auth, DB, Edge Functions, Storage, Realtime) | Edge Functions = Deno |
| AI/LLM | OpenRouter (GPT-4o-mini), AI33 (fallback dead) | chat-completions edge function |
| TTS | AI33 then OpenAI then Google Chirp cascade | youtube-generate-audio edge function |
| Images | Kie.ai then Pollinations then Canvas fallback | generate-kie-flow edge function |
| Deploy | Vercel (frontend) + Supabase (backend) | https://autodark-olive.vercel.app |
---

## File Structure (New Files Only)

    docs/
      logs/
        pipeline-runs.md      # Exported execution traces (AI-agent friendly)
        edge-function-log.md  # Edge function call log (provider, latency, errors)
        bugs-active.md        # Current active bugs (auto-updated from pipeline failures)
        changelog.md          # What was fixed/deployed and when
    src/
      lib/
        debugLogger.ts        # Core logger: trace entries + persist to DB
        traceContext.ts        # Trace ID generator + context threading per pipeline run
      agents/
        pipelineOrchestrator.ts  # (MODIFY) Instrument with trace logging per step
      hooks/
        useDebugPanel.ts      # (NEW) Hook for optional in-app debug panel
    supabase/
      migrations/
        YYYYMMDD_pipeline_traces.sql  # Table for execution traces

---

## Phase 0: Debug Log System Design

### What Gets Logged

| Event Type | Fields | Example |
|------------|--------|---------|
| **Pipeline Step Start** | traceId, step, timestamp, contentId | TRACE abc123 STEP script_generation START |
| **Pipeline Step End** | traceId, step, timestamp, status, durationMs, details | TRACE abc123 STEP script_generation OK 17200ms |
| **Pipeline Step Fail** | traceId, step, timestamp, error, stackTrace | TRACE abc123 STEP tts FAIL AI33 401 |
| **Edge Function Call** | traceId, function, provider, latencyMs, status, fallback | EDGE youtube-generate-audio provider=ai33 401 fallback=openai |
| **TTS Fallback** | traceId, attemptedProviders, finalProvider, reason | TTS_FALLBACK ai33 to openai reason: 401 |
| **Bug Auto-Detected** | traceId, bugType, details, suggestedFix | BUG_DETECTED type=api_key_expired AI33 401 x3 |

### Where It Lives

| Location | Purpose | Format |
|----------|---------|--------|
| DB: pipeline_traces table | Primary storage, queryable | JSONB rows, retain 30 days |
| docs/logs/pipeline-runs.md | AI-agent readable export | Markdown table per run |
| docs/logs/edge-function-log.md | Edge function responses | Markdown table |
| docs/logs/bugs-active.md | Currently open bugs | Markdown list |
| docs/logs/changelog.md | Manual + auto changelog | Reverse-chrono Markdown |

### How AI Agents Consume It

1. Agent opens docs/logs/bugs-active.md -- sees all current bugs with trace IDs
2. Agent opens docs/logs/pipeline-runs.md -- finds trace ID, reads full execution trace
3. Agent opens docs/logs/edge-function-log.md -- finds which provider failed and when
4. No grep needed -- each file is self-contained Markdown with headers and tables

### Log Entry Format (Markdown Export)

    ---
    ### Run: abc123-def4 | 2026-04-07 14:32:01 | Channel: Dark Mysteries PT

    | Step | Status | Duration | Provider | Details |
    |------|--------|----------|----------|---------|
    | trends | OK | 3200ms | -- | pattern: conspiracy_deep_dive |
    | ideas | OK | 8100ms | openrouter/gpt-4o-mini | 5 ideas generated |
    | script | OK | 17200ms | openrouter/gpt-4o-mini | 5 chapters, 4200 words |
    | tts | WARN | 24500ms | openai (fallback) | ai33 returned 401 |
    | visuals | FAIL | 45000ms | kie.ai | timeout after 45s, 3/12 images |
    | seo | SKIP | -- | -- | blocked by visuals failure |

    **Error:** Kie.ai timeout after 45000ms on scene 4/12
    **Recovery:** Content saved as visuals_partial. 3 images uploaded. 9 pending.
---

## Phase 1: Implement Debug Log Infrastructure

### DL-01: Create debugLogger.ts Core Module

- **Agent:** backend-specialist
- **Skills:** TypeScript, Supabase client
- **Priority:** P0 (foundation for everything else)
- **Dependencies:** None
- **INPUT:** Logger API design (above)
- **OUTPUT:** src/lib/debugLogger.ts with functions: startTrace(), logStep(), logEdgeCall(), logBug(), endTrace()
- **VERIFY:** Import in pipelineOrchestrator.ts, call startTrace(), confirm trace object created in memory

**Implementation notes:**
- Browser app: accumulate entries in memory during pipeline run
- At pipeline end (success or failure), persist full trace to pipeline_traces DB table
- Provides exportToMarkdown() that generates Markdown for docs/logs/ files
- Optional: Edge Function save-debug-log that writes to Storage bucket for persistent Markdown

### DL-02: Create traceContext.ts for Trace ID Threading

- **Agent:** backend-specialist
- **Skills:** TypeScript, UUID generation
- **Priority:** P0
- **Dependencies:** None
- **INPUT:** Unique trace ID per pipeline run, threaded through all calls
- **OUTPUT:** src/lib/traceContext.ts with createTraceId(), TraceContext type
- **VERIFY:** Each pipeline run gets unique trace ID visible in logs

### DL-03: Create pipeline_traces DB Table

- **Agent:** database-architect
- **Skills:** Supabase migrations, JSONB
- **Priority:** P0
- **Dependencies:** None
- **INPUT:** Schema for trace storage
- **OUTPUT:** Migration creating pipeline_traces: id, channel_id, content_id, trace_id, started_at, finished_at, status (ok/warn/fail), steps (JSONB array of step entries), error_summary (TEXT)
- **VERIFY:** npm run gen:types succeeds, type includes pipeline_traces

### DL-04: Instrument pipelineOrchestrator.ts with Trace Logging

- **Agent:** backend-specialist
- **Skills:** TypeScript, Supabase client
- **Priority:** P1
- **Dependencies:** DL-01, DL-02, DL-03
- **INPUT:** Current orchestrator (259 lines, 7 pipeline steps, try/catch with console.error)
- **OUTPUT:** Each step wrapped with logStep(traceCtx, stepName, async fn) pattern
- **VERIFY:** Run pipeline, check pipeline_traces table has row with all steps logged

### DL-05: Instrument Edge Functions with Provider Logging

- **Agent:** backend-specialist
- **Skills:** Deno, Supabase Edge Functions
- **Priority:** P1
- **Dependencies:** DL-03
- **Files:**
  - supabase/functions/chat-completions/index.ts
  - supabase/functions/youtube-generate-audio/index.ts
  - supabase/functions/generate-kie-flow/index.ts
- **INPUT:** Edge functions currently log to console only
- **OUTPUT:** Each edge function returns result plus _debug object with provider, latencyMs, fallbackUsed, attempts
- **VERIFY:** Call chat-completions, response includes _debug object

### DL-06: Create bugs-active.md Auto-Detection

- **Agent:** backend-specialist
- **Skills:** Pattern matching, error classification
- **Priority:** P2
- **Dependencies:** DL-04
- **INPUT:** Trace data from pipeline runs
- **OUTPUT:** Logic in debugLogger.ts detecting recurring errors (same error 3+ times), writes to bugs-active.md
- **VERIFY:** After 3 consecutive TTS failures with same error, bugs-active.md gets new entry

### DL-07: Create changelog.md Template + Convention

- **Agent:** backend-specialist
- **Skills:** Documentation
- **Priority:** P2
- **Dependencies:** None
- **INPUT:** Need changelog convention
- **OUTPUT:** docs/logs/changelog.md with format and initial entries (AI33 fallback, pipeline persistence, Storage uploads)
- **VERIFY:** File exists with initial entries

### DL-08: Optional In-App Debug Panel (useDebugPanel)

- **Agent:** frontend-specialist
- **Skills:** React hooks, Shadcn UI
- **Priority:** P3 (nice-to-have)
- **Dependencies:** DL-04
- **INPUT:** pipeline_traces table data
- **OUTPUT:** src/hooks/useDebugPanel.ts + collapsible panel showing last 5 traces
- **VERIFY:** Panel visible in dev mode, shows trace steps with color-coded status
---

## Phase 2: E2E Smoke Test Sprint

### SM-01: Audit Current Mock Data and Hardcoded Values

- **Agent:** backend-specialist
- **Skills:** Codebase analysis
- **Priority:** P0
- **Dependencies:** None
- **INPUT:** Codebase scan for: mock, fake, hardcoded, TODO, FIXME, Unsplash placeholders, w3schools URLs
- **OUTPUT:** List of all mock/hardcoded values with file:line references
- **VERIFY:** Each item categorized as remove, replace, or keep-for-dev

**Known mocks from DEBUG-REPORT.md:**
- generate-kie-flow was in MOCK MODE (BUG-002) -- verify fixed
- Channel card shows YOUTUBE AUTOMATION hardcoded (BUG-009)

### SM-02: Verify API Key Status and Fallback Chain

- **Agent:** backend-specialist
- **Skills:** Supabase Edge Functions, API testing
- **Priority:** P0
- **Dependencies:** None
- **INPUT:** Current edge function env vars
- **OUTPUT:** Confirmed status of each key (AI33, OpenAI, Google TTS, Kie.ai, OpenRouter)
- **VERIFY:** Each key tested; dead keys documented; fallback chain confirmed working

### SM-03: Run Full Pipeline E2E (Manual Smoke Test)

- **Agent:** test-engineer
- **Skills:** Manual testing, Gherkin scenarios
- **Priority:** P0
- **Dependencies:** SM-01, SM-02
- **INPUT:** Deployed app or localhost
- **OUTPUT:** Completed checklist

**Gherkin scenarios:**

    @smoke @e2e
    Feature: Full Video Generation E2E

      Background:
        Given a logged-in user with a configured channel
        And the channel has a blueprint with niche dark mysteries
        And hub settings have voice=ai33, voiceId=onyx, slidesImage=kie_flux

      Scenario: Generate a complete short video from idea to review
        When user navigates to the channel Ideas tab
        And clicks Generate Ideas
        Then at least 3 ideas should appear within 30 seconds
        When user approves the first idea and clicks Produce
        Then the pipeline should start with status generating_script
        And a trace should be created in pipeline_traces table
        When script generation completes
        Then channel_contents should have status script_generated
        And script field should contain at least 3 chapters
        When TTS generation completes
        Then channel_contents should have status tts_done
        And audio_url should point to Supabase Storage (not blob:)
        And trace should show which TTS provider was used
        When image generation completes
        Then channel_contents should have status visuals_done
        And scenes JSON should have imageUrl for each scene
        When SEO generation completes
        Then channel_contents should have status awaiting_review

      Scenario: Pipeline recovers from TTS provider failure
        Given AI33_API_KEY is invalid in edge function secrets
        When pipeline reaches TTS step
        Then trace should log ai33 FAIL with error details
        And pipeline should automatically try OpenAI TTS
        And channel_contents status should be tts_done (not failed)

      Scenario: Pipeline saves partial state on crash
        Given pipeline is at step generating_visuals with 5 of 12 images done
        When the browser tab is closed and user reopens the channel
        Then channel_contents should show last persisted status
        And uploaded images should be in Supabase Storage
        And there should be option to Resume production

- **VERIFY:** Video content record in channel_contents with status awaiting_review and all assets in Storage

### SM-04: Fix Blocking Issues Found in SM-03

- **Agent:** backend-specialist + frontend-specialist
- **Skills:** Debugging, Supabase
- **Priority:** P0
- **Dependencies:** SM-03
- **INPUT:** Failures from smoke test
- **OUTPUT:** Fixes applied, smoke test re-run passes
- **VERIFY:** Full pipeline completes without manual intervention
---

## Phase 3: Sprint C -- Quality (SEO, Thumbnails, Review)

*From PLAN-pipeline-e2e.md Sprint C, refined with current state.*

### QA-01: TTS-1-HD as Premium Option

- **Agent:** backend-specialist
- **Skills:** Supabase Edge Functions, OpenAI API
- **Priority:** P1
- **Dependencies:** DL-05 (provider logging)
- **Files:** supabase/functions/youtube-generate-audio/index.ts, hub settings
- **INPUT:** When hub setting = openai_hd, use model tts-1-hd instead of tts-1
- **OUTPUT:** Edge function supports model parameter, defaults to tts-1, accepts tts-1-hd
- **VERIFY:** Call with model=tts-1-hd, audio quality noticeably better

### QA-02: Audio-Slide Synchronization

- **Agent:** frontend-specialist
- **Skills:** React, Remotion, audio timing
- **Priority:** P1
- **Dependencies:** SM-03
- **Files:** narratorAgent.ts, RemotionPreview.tsx
- **INPUT:** durationSec per scene is imprecise, slides drift from audio
- **OUTPUT:** durationSec = (chapter audio duration) / (scenes in chapter), using actual audio duration
- **VERIFY:** Preview: slides transition in sync with narration

### QA-03: SEO Metadata Enhancement

- **Agent:** backend-specialist
- **Skills:** YouTube SEO, LLM prompting
- **Priority:** P1
- **Dependencies:** None
- **Files:** seoAgent.ts
- **INPUT:** Current SEO generates title, tags, timestamps. Needs: description with keywords, hashtags
- **OUTPUT:** Enhanced SEO: title (60 chars max), description (5000 chars with timestamps), 15 tags, 3 hashtags
- **VERIFY:** Generated SEO passes YouTube character limits

### QA-04: Thumbnail Generation

- **Agent:** frontend-specialist + backend-specialist
- **Skills:** Image generation, Canvas API
- **Priority:** P2
- **Dependencies:** QA-02
- **INPUT:** Videos need thumbnails (text overlay + dramatic image)
- **OUTPUT:** Pipeline step: best scene image + title text overlay (large, bold, contrasting)
- **VERIFY:** Thumbnail saved to Storage, 1280x720

### QA-05: Review Flow UI

- **Agent:** frontend-specialist
- **Skills:** React, Shadcn UI
- **Priority:** P2
- **Dependencies:** SM-03, QA-03
- **Files:** New src/pages/Review/Index.tsx
- **INPUT:** Content with status awaiting_review needs review screen
- **OUTPUT:** Review page: video preview, editable SEO metadata, thumbnail, approve/reject buttons
- **VERIFY:** User can edit title/description, approve or reject

### QA-06: Word-by-Word Captions (Karaoke Style)

- **Agent:** frontend-specialist
- **Skills:** React, animation, Remotion
- **Priority:** P3
- **Dependencies:** QA-02
- **Files:** CaptionOverlay.tsx
- **INPUT:** Current captions show full sentence
- **OUTPUT:** Word-by-word highlight synced to audio via WPM timing
- **VERIFY:** Karaoke-style highlighting tracks narration

### QA-07: Background Music Bed

- **Agent:** frontend-specialist
- **Skills:** Audio mixing, Remotion
- **Priority:** P3
- **Dependencies:** QA-02
- **INPUT:** Videos need subtle ambient music
- **OUTPUT:** Music at 15-20% volume, looped, fades in/out
- **VERIFY:** Background music does not overpower narration
---

## Phase 4: Observability and Monitoring

### OB-01: Edge Function Health Check Endpoint

- **Agent:** backend-specialist
- **Skills:** Supabase Edge Functions, Deno
- **Priority:** P1
- **Dependencies:** None
- **INPUT:** Detect dead API keys before users hit them
- **OUTPUT:** New edge function health-check/index.ts testing each provider
- **VERIFY:** Returns JSON with status per provider (ok/dead)

### OB-02: Daily Health Check (Cron or Manual)

- **Agent:** backend-specialist
- **Skills:** Supabase cron
- **Priority:** P2
- **Dependencies:** OB-01
- **INPUT:** Health check should run daily or on-demand
- **OUTPUT:** pg_cron job or Check API Status button in app
- **VERIFY:** Status visible; dead keys flagged

### OB-03: Pipeline Success Rate Dashboard Widget

- **Agent:** frontend-specialist
- **Skills:** React, Supabase queries
- **Priority:** P2
- **Dependencies:** DL-03
- **INPUT:** pipeline_traces table data
- **OUTPUT:** Widget: total runs, success rate, avg duration, most common failure step
- **VERIFY:** Widget renders with real data

### OB-04: Error Alert System (In-App)

- **Agent:** frontend-specialist + backend-specialist
- **Skills:** Supabase Realtime, React toast
- **Priority:** P3
- **Dependencies:** DL-04, OB-01
- **INPUT:** Pipeline failure or dead key detection
- **OUTPUT:** Toast on failure; persistent banner for dead keys
- **VERIFY:** Kill key, health check runs, banner appears

### OB-05: Cleanup Hardcoded Values and Dead Code

- **Agent:** backend-specialist
- **Skills:** Codebase cleanup
- **Priority:** P1
- **Dependencies:** SM-01
- **INPUT:** Audit list from SM-01
- **OUTPUT:** Each item removed/replaced:
  - loadHubDefaults() reads from localStorage (should be DB -- task A1)
  - w3schools / Unsplash placeholder URLs
  - ALLOWED_ORIGIN hardcoded localhost:5173 (BUG-004)
  - YOUTUBE AUTOMATION hardcoded (BUG-009)
- **VERIFY:** grep for w3schools, mock, placeholder, YOUTUBE AUTOMATION returns zero

---

## Execution Order and Dependencies

    Week 1: Debug Infrastructure + Smoke Test

      DL-01 --+
      DL-02 --+ (parallel, no deps)
      DL-03 --+
               |
               v
      DL-04 (instrument orchestrator) --> DL-05 (instrument edge functions)
               |                               |
               v                               v
      DL-06 (auto-detect bugs)           DL-07 (changelog)
               |
      SM-01 + SM-02 (parallel: audit mocks + verify keys)
               |
               v
      SM-03 (full E2E smoke test)
               |
               v
      SM-04 (fix blocking issues)

    Week 2: Quality Sprint (Sprint C)

      QA-01 (TTS-HD) ----------------+
      QA-03 (SEO enhancement) -------+ (parallel)
      OB-01 (health check) ----------+
               |
               v
      QA-02 (audio-slide sync) --> QA-06 (karaoke captions)
               |                   QA-07 (background music)
               v
      QA-04 (thumbnails)
               |
               v
      QA-05 (review flow UI)

    Week 3: Observability + Polish

      OB-02 (health cron) --> OB-04 (error alerts)
      OB-03 (dashboard widget)
      OB-05 (cleanup hardcoded values)
      DL-08 (debug panel -- if time)
---

## Agent Assignments Summary

| Agent | Tasks | Focus |
|-------|-------|-------|
| **database-architect** | DL-03 | Pipeline traces table migration |
| **backend-specialist** | DL-01, DL-02, DL-04, DL-05, DL-06, DL-07, SM-01, SM-02, SM-04, QA-01, QA-03, OB-01, OB-02, OB-05 | Core infra, edge functions, API hardening |
| **frontend-specialist** | DL-08, QA-02, QA-04, QA-05, QA-06, QA-07, OB-03, OB-04 | UI, Remotion, review flow |
| **test-engineer** | SM-03 | E2E smoke test execution |

---

## Known Bugs to Resolve (from DEBUG-REPORT.md)

| Bug | Status | Sprint Task |
|-----|--------|------------|
| BUG-001: AI33 API 401 | Partially fixed (fallback added) | SM-02, OB-01 |
| BUG-002: generate-kie-flow MOCK MODE | Needs verification | SM-01 |
| BUG-003: TTS no fallback | Fixed (cascade added) | SM-02, DL-05 |
| BUG-004: CORS hardcoded 5173 | Open | OB-05 |
| BUG-005: Blueprint not auto-created | Open | SM-04 |
| BUG-006: Ideas in wrong table | Needs verification | SM-01 |
| BUG-009: YOUTUBE AUTOMATION hardcoded | Open | OB-05 |
| BUG-010: Wizard no state persistence | Fixed (DB persistence) | SM-03 |

---

## Phase X: Verification Checklist

### After Phase 1 (Debug Log System)
- [ ] pipeline_traces table exists with RLS policies
- [ ] Running pipeline creates trace row with all steps
- [ ] Edge function responses include _debug metadata
- [ ] docs/logs/changelog.md exists with initial entries
- [ ] npm run gen:types passes after migration

### After Phase 2 (Smoke Test)
- [ ] Full pipeline: idea to awaiting_review without errors
- [ ] All assets in Supabase Storage (no blob: URLs)
- [ ] TTS fallback works (test by invalidating AI33 key)
- [ ] No mock data in production path
- [ ] Trace log captures full run

### After Phase 3 (Quality)
- [ ] SEO: title under 100 chars, desc under 5000, 15 tags
- [ ] Audio-slide sync within 0.5s accuracy
- [ ] Thumbnail at 1280x720
- [ ] Review flow: edit + approve/reject
- [ ] npm run build clean

### After Phase 4 (Observability)
- [ ] Health check returns status for all providers
- [ ] Dead API key triggers visible alert
- [ ] Dashboard widget shows success rate
- [ ] All hardcoded values resolved
- [ ] npm run lint passes
- [ ] npm run build succeeds
- [ ] npm run gen:types succeeds

---

## ADR-08: Debug Log as Markdown + DB (Hybrid)

**Context:** Logs could live only in DB or also as Markdown files.

**Decision:** Hybrid. Primary = DB (queryable, dashboard-friendly). Secondary = Markdown export (AI-agent friendly, VSCode-native).

**Rationale:**
- AI agents read Markdown directly without DB access
- Developers browse logs in VSCode without Supabase dashboard
- DB provides queryability for dashboards and metrics
- Markdown can be committed to git for history

**Consequence:** Two write targets, but massively better DX for AI-assisted debugging.

---

## ADR-09: Trace Context Threading

**Context:** Pipeline calls multiple agents and edge functions. When step 4 fails, need to know steps 1-3.

**Decision:** Generate traceId (UUID) at pipeline start. Thread through every call. Store all steps in single pipeline_traces row as JSONB array.

**Consequence:** One query gives complete execution history. TraceId appears in every log entry for cross-referencing.
