

## Problem

Line 77 in `src/hooks/useChannels.tsx` inserts `requires_review` into the `channels` table, but this column doesn't exist in the database schema.

## Plan

### Step 1: Add missing column via migration
```sql
ALTER TABLE public.channels ADD COLUMN IF NOT EXISTS requires_review boolean DEFAULT false;
```

### Step 2: Remove `requires_review` from insert if not needed
Alternatively, simply remove `requires_review` from the insert object on line 77 since it's not a core feature. This is the simpler fix.

**Recommended approach:** Do both — add the column for future use, and keep the insert clean. But the quickest fix is just removing line 77's `requires_review` reference.

### Backend connectivity
Yes, the backend and edge functions are connected. The error itself proves connectivity — the app successfully reached the database, which then rejected the query due to the missing column. Edge functions are deployed on project `yyaysbsqunumitluleey`.

