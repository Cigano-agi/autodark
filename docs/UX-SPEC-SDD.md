# 🏗️ AUTO-DARK: SOFTWARE DESIGN DOCUMENT (SDD)
**Project:** Professional Dark Channel Network Manager
**Version:** 2.0 (The Purge)
**Objective:** Scale to 50+ channels with a stable, professional, and intuitive "Factory" interface.

---

## 1. VISION & TERMINOLOGY (The Shift)
We are moving away from tactical "Dark Ops" jargon to a professional "Channel Network" nomenclature.

| Old Term (Tactical) | New Term (Professional) |
|---------------------|--------------------------|
| Quartel General     | Dashboard / Analytics    |
| Arsenal de Ativos   | Asset Library (MediaHub) |
| Esteira de Produção | Production Factory       |
| Inteligência/Pauta  | Content Strategy         |
| Missão / Operação   | Project / Video          |
| Recruit Unit        | Add Channel              |

---

## 2. ARCHITECTURE OVERVIEW

### 2.1 Scalable Navigation (Global)
- **Persistent Sidebar:** Visible on all screens (Desktop: Sidebar, Mobile: Overlay).
- **Network View:** Dashboard displays channels as **Folders** with status indicators (e.g., "3 producing", "2 awaiting review").
- **Global Search:** Search bar in the header to jump to any channel or specific video.

### 2.2 Channel Hub (5-Tab Structure)
Each channel has a unified hub with exactly 5 tabs:
1. **Analytics:** Performance metrics and growth trends.
2. **Strategy (Intelligence):** Idea generation, approval flow, and competitor research.
3. **Operations (Factory):** The unified production queue (Active, Awaiting Review, Completed).
4. **Library (Media Hub):** Voice settings, image presets, and reusable assets.
5. **Configuration:** Channel identity, RLS policies, and prompt engineering.

---

## 3. THE PRODUCTION FACTORY (Engine v2)

### 3.1 Per-Scene Granularity
- **Atomic State:** A video is no longer a single blob. It is a collection of **Scenes**.
- **Data Model:** `channel_contents` stores the metadata, while `production_states` (new table) stores the scene-by-scene progress.
- **Cinematic Sync:** 
    - Scene duration = Audio duration + Padding.
    - Transitions are mapped to `emotion` tags (e.g., "horror" -> glitch, "mystery" -> fade).

### 3.2 Resilience & Persistence
- **The Bunker Protocol:** Every step of the production (Script -> Audio -> Visuals -> Montage) must be persisted to Supabase.
- **Auto-Resume:** Upon F5 or browser crash, the component detects an active `production_state` and offers to "Resume Production".
- **Background Worker:** Move heavy FFmpeg/Remotion assembly to a **Web Worker** to keep the UI thread at 60fps.

---

## 4. UI/UX STANDARDS (Dark Theme Professional)

### 4.1 Contrast & Accessibility
- **Strict Black Ban:** No `text-black` or `text-neutral-900`. Use `text-white` or `text-foreground`.
- **Primary Color:** Amber/Orange (#f59e0b) for active states and primary CTAs.
- **Glassmorphism:** Use `backdrop-blur-md` and `border-white/10` for panels to create depth without visual noise.

### 4.2 Feedback Loops
- **Progressive Discovery:** Don't show technical status codes. Use a mapping layer:
    - `tts_done` -> "Narration Complete"
    - `visuals_ready` -> "Visuals Rendered"
- **Skeleton States:** Every list and card must have a high-fidelity skeleton loader.

---

## 5. PHASED EXECUTION ROADMAP (For Claude)

### Phase 1: Navigation & Terminology Purge
- Update `MAIN_NAV_ITEMS` and `CHANNEL_NAV_ITEMS`.
- Fix the Sidebar z-index issue.
- Refactor `Channel/Index.tsx` to the 5-tab structure.

### Phase 2: The Persistence Bunker
- Create/Verify `production_states` table.
- Implement the `useProductionState` hook with full snapshotting.
- Update `pipelineOrchestrator.ts` to save progress after **every** scene generation.

### Phase 3: The Modular Factory
- Refactor the 8-step wizard into modular `Narrator`, `Director`, `Editor`, and `Publisher` components.
- Implement "Cinematic Sync" logic in the Montage stage.

### Phase 4: Network Scalability
- Refactor the Dashboard list into a "Channel Explorer" with folders and search.
- Implement bulk actions (e.g., "Approve all ideas").

---

## 6. CRITICAL BUGS TO SOLVE
1. **Header Buttons:** Fix `onNewVideo` and `onStudio` handlers in `ChannelHeaderCard`.
2. **Route Context:** Ensure sub-routes like `/production` keep the sidebar context.
3. **Tab Persistence:** Use `useSearchParams` to ensure F5 doesn't reset the active tab.
