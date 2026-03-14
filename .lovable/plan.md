

## Problem

The `channel_competitors` table doesn't exist in the database. The `useCompetitors` hook tries to query it, causing the error shown in the screenshot.

## Plan

### Step 1: Create `channel_competitors` table via migration

```sql
CREATE TABLE public.channel_competitors (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    channel_id uuid REFERENCES public.channels(id) ON DELETE CASCADE NOT NULL,
    name text NOT NULL,
    handle text NOT NULL,
    youtube_url text,
    niche text,
    subscribers integer DEFAULT 0,
    avg_views integer DEFAULT 0,
    upload_frequency text DEFAULT '?',
    last_video text DEFAULT 'Buscando...',
    growth text DEFAULT '+0%',
    tracking boolean DEFAULT true,
    created_at timestamptz DEFAULT now()
);

ALTER TABLE public.channel_competitors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own competitors"
ON public.channel_competitors
FOR ALL
USING (owns_channel(channel_id))
WITH CHECK (owns_channel(channel_id));
```

### Step 2: Expand `sync-youtube-metrics` edge function

Add an `action` parameter to the request body. When `action = "sync-competitors"`, the function will:
1. Fetch all competitors for the given `channel_id` from `channel_competitors`
2. For each competitor with a `handle`, call YouTube Data API (public, no OAuth needed — uses API key) to get their latest stats (subscribers, views, recent video)
3. Update each competitor row with fresh data

The request body becomes:
```json
{ "channel_id": "...", "action": "sync-metrics" }    // existing behavior (default)
{ "channel_id": "...", "action": "sync-competitors" } // new: refresh competitor stats
```

This keeps everything in one edge function as requested. The YouTube Data API public endpoints (`channels?part=statistics,snippet&forHandle=@handle`) work with an API key, so no OAuth is needed for competitor channels.

### Step 3: Update `useCompetitors` hook

Remove the `as any` type casts now that the table exists in the schema. Optionally add a `syncCompetitors` mutation that calls `sync-youtube-metrics` with `action: "sync-competitors"`.

### Step 4: Update types

The types file will be auto-regenerated after the migration, adding `channel_competitors` to the schema.

### Note on API key

The YouTube Data API v3 requires an API key for public data. We'll need to check if `GOOGLE_CLIENT_ID` is sufficient or if a separate `YOUTUBE_API_KEY` secret is needed. If needed, we'll request it from the user.

