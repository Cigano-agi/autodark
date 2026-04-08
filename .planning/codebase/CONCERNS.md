# Known Concerns & Technical Debt — AutoDark

**Last Updated:** 2026-04-08  
**Status:** CRITICAL BLOCKER + HIGH PRIORITY  

## CRITICAL (Blocks Production)

### [CRITICAL-01] Silent Error on Script Generation
- **File:** src/pages/Production/Index.tsx + src/agents/pipelineOrchestrator.ts
- **Issue:** User clicks "Gerar Roteiros" but system fails silently with no error feedback
- **Root Cause:** Error handling catches exceptions but doesn't report to UI (no toast, no logging)
- **Impact:** BLOCKS MVP — user cannot proceed past Step 2-3
- **Fix:** Wrap calls in try-catch with toast.error()
- **Timeline:** 20 min total

### [CRITICAL-02] Missing Timeout & Retry Logic
- **File:** src/agents/pipelineOrchestrator.ts
- **Issue:** System hangs indefinitely if API latency spikes
- **Impact:** User experience freezes, appears broken
- **Timeline:** 10 min

### [CRITICAL-03] Exposed API Keys in .env Files
- **Files:** .env, .env.production
- **Issue:** API keys committed to repository (APIFY_API_TOKEN, OPENROUTER_API_KEY, AI33_API_KEY, KIE_API_KEY)
- **Risk:** Attackers can abuse API quota if repo goes public
- **Action:** Rotate all keys immediately, remove from git history
- **Timeline:** 45 min

### [CRITICAL-04] Auth Bypass in Production
- **File:** src/hooks/useAuth.tsx
- **Issue:** Anyone can set localStorage flag (autodark_bypass_auth=true) to bypass authentication
- **Risk:** CRITICAL — unauthenticated access to entire system
- **Action:** Remove bypass logic before production
- **Timeline:** 5 min

### [CRITICAL-05] TypeScript 'any' Types & Type Safety
- **Files:** src/agents/pipelineOrchestrator.ts, src/hooks/useProductionState.ts
- **Issue:** (supabase.from as any), e: any bypass type checking
- **Impact:** Harder to catch bugs, refactoring risks
- **Timeline:** 2-3 hours

## HIGH PRIORITY

### [HIGH-01] Missing Loading UI & User Feedback
- **File:** src/pages/Production/Index.tsx
- **Issue:** No loading spinner during long-running operations
- **Timeline:** 20 min

### [HIGH-02] No Validation Before Step Transitions
- **File:** src/pages/Production/Index.tsx
- **Issue:** User can click buttons before prerequisites met
- **Timeline:** 10 min

### [HIGH-03] Incomplete Foundation Page Blocks
- **File:** src/pages/Foundation/Index.tsx (lines 310-315)
- **Issue:** Only BlockA & BlockB implemented; BlockC, D, E show "Em breve disponível"
- **Impact:** User cannot complete full DNA Optimizer setup
- **Fix:** Implement remaining blocks OR mark as V2
- **Timeline:** 6-8 hours total OR defer to Phase 2

### [HIGH-04] Pipeline Lacks Granular Error Boundaries
- **File:** src/agents/pipelineOrchestrator.ts
- **Issue:** Single catch block for entire pipeline; single failure cancels all
- **Timeline:** 1 hour

### [HIGH-05] Reliance on localStorage for Critical State
- **Files:** Multiple hooks and agents
- **Issue:** Critical data (API defaults, auth flags) in client storage
- **Risk:** Can be cleared; no encryption; inconsistent across tabs
- **Timeline:** 2-3 hours to migrate to DB

### [HIGH-06] Missing Supabase Secrets for Fallback TTS
- **Issue:** OPENAI_API_KEY not configured in Supabase secrets
- **Impact:** If primary TTS fails, narration fails
- **Timeline:** 5 min (manual Supabase setup)

### [HIGH-07] YouTube Data API v3 Not Integrated
- **File:** src/components/Channel/ReviewQueue.tsx:401
- **Issue:** TODO comment only; cannot fetch live data
- **Timeline:** 3-5 hours

## MEDIUM PRIORITY

### [MEDIUM-01] Multiple 'unknown' Type Assertions
- **File:** src/hooks/useProductionState.ts
- **Issue:** script?: unknown, approvedIdea?: unknown
- **Impact:** Type safety lost on deserialization
- **Timeline:** 2 hours

### [MEDIUM-02] Scene Persistence Not Integrated
- **File:** src/agents/pipelineOrchestrator.ts
- **Issue:** saveScene() hook exists but NOT called in pipeline
- **Impact:** Cannot auto-resume individual scenes
- **Timeline:** 2-3 hours

### [MEDIUM-03] No Logging Strategy
- **Issue:** console.log only; no server-side logs
- **Impact:** Debugging production issues nearly impossible
- **Timeline:** 4-6 hours

### [MEDIUM-04] No Rate Limiting or Quota Management
- **Issue:** Direct API calls without usage tracking
- **Risk:** Accidental quota overruns
- **Timeline:** 3 hours

## SECURITY NOTES

### S1: API Key Exposure — CRITICAL
- Immediate rotation required
- Remove from git history with bfg-repo-cleaner

### S2: Auth Bypass Mechanism — CRITICAL
- Remove before production deployment

### S3: localStorage Trust Violation — HIGH
- Users can spoof authentication

### S4: No Input Validation on User Content
- Prompt injection risk
- Timeline: 2 hours

### S5: Supabase RLS Not Verified
- Risk: User A could access User B's data
- Timeline: 30 min audit + 1 hour fixes

## PERFORMANCE NOTES

### PERF-01: No Caching Strategy
- Unnecessary API costs, slow UX
- Timeline: 2 hours

### PERF-02: Image Upload Bottleneck
- Sequential uploads (no parallelization)
- Timeline: 1-2 hours

### PERF-03: No CDN Integration
- Images slow in non-SG regions
- Timeline: 3-5 hours

## INCOMPLETE FEATURES

### IF1: DNA Optimizer (Foundation Page)
- Status: 40% Complete (BlockA & BlockB only)
- Missing: BlockC, D, E
- Timeline: 6-8 hours OR defer to V2

### IF2: Auto-Resume on Crash
- Status: 50% Complete (schema ready, NOT integrated)
- Timeline: 3-4 hours

### IF3: YouTube Content Integration
- Status: 0% (TODO only)
- Timeline: 5 hours

### IF4: Onboarding Tour
- Status: 0% (not implemented)
- Priority: P2
- Timeline: 2 hours

## KNOWN BUGS (from docs)

### BUG-010: Sidebar Disappears on Dashboard Modals
- Status: Supposedly FIXED
- Need Verification: Confirm in current code

### BUG-011: Broken Header Buttons
- Status: "NOT A BUG" per documentation
- Need Verification: Test click handlers

### BUG-012: Route Context Loss
- Status: Supposedly FIXED
- Need Verification: Test navigation

### BUG-013: Black Text Readability
- Status: "NOT PRESENT"
- Need Verification: Visual audit

## TECHNICAL DEBT SUMMARY

| Category | Count | Effort | Priority |
|----------|-------|--------|----------|
| Critical Blockers | 5 | 2h | P0 |
| High Priority | 7 | 12h | P1 |
| Medium Priority | 4 | 10h | P2 |
| Security Issues | 5 | 6h | P0-P1 |
| TOTAL | 21 | ~40h | — |

## RECOMMENDED ACTION PLAN

### Phase 0: Unblock MVP (2-3 hours)
1. Fix CRITICAL-01: Silent error handling (20 min)
2. Fix CRITICAL-02: Add timeouts (10 min)
3. Fix CRITICAL-03: Rotate API keys (30 min)
4. Fix CRITICAL-04: Remove auth bypass (5 min)
5. Fix HIGH-01: Add loading UI (20 min)
6. Fix HIGH-02: Add validation (10 min)

### Phase 1: Security Hardening (2-3 hours)
1. Implement proper TypeScript types (CRITICAL-05)
2. Audit & implement RLS policies (S5)
3. Add input validation (S4)
4. Move state to database (HIGH-05)

### Phase 2: Complete Features (6-8 hours)
1. Implement BlockC/D/E Foundation (HIGH-03)
2. Integrate scene auto-resume (IF2)
3. Add YouTube API integration (HIGH-07)

### Phase 3: Production Polish (4+ hours)
1. Comprehensive error logging (MEDIUM-03)
2. Performance optimization
3. Onboarding tour (IF4)

---

**Next Step:** Systematic audit on all P0 items before MVP release.
