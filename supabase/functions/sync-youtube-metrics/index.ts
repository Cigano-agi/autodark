import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface YouTubeChannelResponse {
  items: Array<{
    id: string;
    snippet?: {
      title: string;
      publishedAt: string;
    };
    statistics: {
      subscriberCount: string;
      viewCount: string;
      videoCount: string;
    };
  }>;
}

interface YouTubeSearchResponse {
  items: Array<{
    id: { videoId: string };
    snippet: { title: string; publishedAt: string };
  }>;
}

interface YouTubeAnalyticsResponse {
  rows?: Array<Array<string | number>>;
}

// ─── Helpers ───────────────────────────────────────────────

function buildSupabaseClients(supabaseUrl: string, serviceKey: string, anonKey: string, authHeader: string) {
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } }
  });
  const serviceClient = createClient(supabaseUrl, serviceKey);
  return { userClient, serviceClient };
}

async function authenticateUser(userClient: ReturnType<typeof createClient>) {
  const { data: { user }, error } = await userClient.auth.getUser();
  if (error || !user) throw new Error('Unauthorized');
  return user;
}

async function refreshAccessToken(
  refreshToken: string,
  supabase: ReturnType<typeof createClient>,
  channelId: string
): Promise<string | null> {
  const clientId = Deno.env.get('GOOGLE_CLIENT_ID');
  const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET');
  if (!clientId || !clientSecret) return null;

  try {
    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    await supabase.from('channels').update({ youtube_access_token: data.access_token }).eq('id', channelId);
    return data.access_token;
  } catch {
    return null;
  }
}

// ─── Action: sync-metrics (existing behavior) ─────────────

async function handleSyncMetrics(
  supabase: ReturnType<typeof createClient>,
  channelId: string,
  userId: string
) {
  const { data: channel, error: channelError } = await supabase
    .from('channels')
    .select('*')
    .eq('id', channelId)
    .eq('user_id', userId)
    .single();

  if (channelError || !channel) throw new Error('Channel not found or not authorized');
  if (!channel.youtube_access_token) throw new Error('YouTube not connected for this channel');

  let accessToken = channel.youtube_access_token;
  if (channel.youtube_refresh_token) {
    const refreshed = await refreshAccessToken(channel.youtube_refresh_token, supabase, channelId);
    if (refreshed) accessToken = refreshed;
  }

  const youtubeChannelId = channel.youtube_channel_id;
  const channelRes = await fetch(
    `https://www.googleapis.com/youtube/v3/channels?part=statistics&id=${youtubeChannelId}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  if (!channelRes.ok) {
    const errorText = await channelRes.text();
    throw new Error(`YouTube API error: ${errorText}`);
  }

  const channelData: YouTubeChannelResponse = await channelRes.json();
  if (!channelData.items?.length) throw new Error('YouTube channel not found');

  const stats = channelData.items[0].statistics;
  const subscribers = parseInt(stats.subscriberCount) || 0;
  const totalViews = parseInt(stats.viewCount) || 0;

  let rpm = 0, watchTimeMinutes = 0, estimatedRevenue = 0, last30DaysViews = 0;

  try {
    const endDate = new Date().toISOString().split('T')[0];
    const startDate = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];
    const analyticsRes = await fetch(
      `https://youtubeanalytics.googleapis.com/v2/reports?ids=channel==${youtubeChannelId}&startDate=${startDate}&endDate=${endDate}&metrics=views,estimatedMinutesWatched,estimatedRevenue,rpm`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    if (analyticsRes.ok) {
      const ad: YouTubeAnalyticsResponse = await analyticsRes.json();
      if (ad.rows?.length) {
        const r = ad.rows[0];
        last30DaysViews = Number(r[0]) || 0;
        watchTimeMinutes = Number(r[1]) || 0;
        estimatedRevenue = Number(r[2]) || 0;
        rpm = Number(r[3]) || 0;
      }
    }
  } catch (e) {
    console.log('Analytics not available:', e);
  }

  await supabase.from('channels').update({
    subscribers,
    monthly_views: last30DaysViews || Math.round(totalViews / 12),
    updated_at: new Date().toISOString(),
  }).eq('id', channelId);

  await supabase.from('channel_metrics').insert({
    channel_id: channelId,
    rpm,
    views: last30DaysViews,
    watch_time_minutes: watchTimeMinutes,
    estimated_revenue: estimatedRevenue,
    recorded_at: new Date().toISOString(),
  });

  return {
    subscribers,
    monthly_views: last30DaysViews || Math.round(totalViews / 12),
    rpm,
    watch_time_minutes: watchTimeMinutes,
    estimated_revenue: estimatedRevenue,
    synced_at: new Date().toISOString(),
  };
}

// ─── Action: sync-competitors ─────────────────────────────

async function handleSyncCompetitors(
  supabase: ReturnType<typeof createClient>,
  channelId: string,
  userId: string
) {
  // Verify channel ownership
  const { data: channel } = await supabase
    .from('channels')
    .select('id')
    .eq('id', channelId)
    .eq('user_id', userId)
    .single();

  if (!channel) throw new Error('Channel not found or not authorized');

  // Get all competitors
  const { data: competitors, error } = await supabase
    .from('channel_competitors')
    .select('*')
    .eq('channel_id', channelId);

  if (error) throw error;
  if (!competitors?.length) return { updated: 0 };

  // We use the Apify scraper approach (same as scrape-youtube-channel) for public data
  const apifyToken = Deno.env.get('APIFY_API_TOKEN');
  
  let updated = 0;

  for (const comp of competitors) {
    try {
      const url = comp.youtube_url || `https://www.youtube.com/@${comp.handle}`;
      
      if (apifyToken) {
        // Use Apify scraper for public data
        const runRes = await fetch(
          `https://api.apify.com/v2/acts/streamers~youtube-scraper/runs?token=${apifyToken}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              startUrls: [{ url }],
              maxResults: 3,
              sortingOrder: 'date',
            }),
          }
        );

        if (!runRes.ok) {
          console.error(`Apify run failed for ${comp.handle}:`, await runRes.text());
          continue;
        }

        const runData = await runRes.json();
        const runId = runData?.data?.id;
        if (!runId) continue;

        // Wait for completion (max 60s)
        let status = 'RUNNING';
        for (let i = 0; i < 12 && status === 'RUNNING'; i++) {
          await new Promise(r => setTimeout(r, 5000));
          const statusRes = await fetch(
            `https://api.apify.com/v2/actor-runs/${runId}?token=${apifyToken}`
          );
          const statusData = await statusRes.json();
          status = statusData?.data?.status;
        }

        if (status !== 'SUCCEEDED') {
          console.error(`Apify run ${runId} ended with status ${status}`);
          continue;
        }

        // Get results
        const datasetRes = await fetch(
          `https://api.apify.com/v2/actor-runs/${runId}/dataset/items?token=${apifyToken}`
        );
        const items = await datasetRes.json();

        if (items?.length > 0) {
          const channelItem = items.find((i: Record<string, unknown>) => i.type === 'channel') || items[0];
          const videoItems = items.filter((i: Record<string, unknown>) => i.type === 'video');

          const updateData: Record<string, unknown> = {};

          if (channelItem.subscriberCountText || channelItem.subscriberCount) {
            const subText = String(channelItem.subscriberCountText || channelItem.subscriberCount);
            const subNum = parseSubscriberCount(subText);
            if (subNum > 0) updateData.subscribers = subNum;
          }

          if (videoItems.length > 0) {
            const totalViews = videoItems.reduce((sum: number, v: Record<string, unknown>) => sum + (Number(v.viewCount) || 0), 0);
            updateData.avg_views = Math.round(totalViews / videoItems.length);
            updateData.last_video = String(videoItems[0].title || 'N/A');
          }

          if (Object.keys(updateData).length > 0) {
            await supabase
              .from('channel_competitors')
              .update(updateData)
              .eq('id', comp.id);
            updated++;
          }
        }
      }
    } catch (err) {
      console.error(`Error syncing competitor ${comp.handle}:`, err);
    }
  }

  return { updated, total: competitors.length };
}

function parseSubscriberCount(text: string): number {
  const cleaned = text.replace(/[^\d.,kKmMbB]/g, '').trim();
  const lower = cleaned.toLowerCase();
  
  if (lower.includes('k')) return Math.round(parseFloat(lower) * 1000);
  if (lower.includes('m')) return Math.round(parseFloat(lower) * 1000000);
  if (lower.includes('b')) return Math.round(parseFloat(lower) * 1000000000);
  
  return parseInt(cleaned.replace(/[.,]/g, '')) || 0;
}

// ─── Main handler ─────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { userClient, serviceClient } = buildSupabaseClients(supabaseUrl, serviceKey, anonKey, authHeader);
    const user = await authenticateUser(userClient);

    const { channel_id, action = 'sync-metrics' } = await req.json();
    if (!channel_id) {
      return new Response(JSON.stringify({ error: 'channel_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    let result;
    switch (action) {
      case 'sync-competitors':
        result = await handleSyncCompetitors(serviceClient, channel_id, user.id);
        break;
      case 'sync-metrics':
      default:
        result = await handleSyncMetrics(serviceClient, channel_id, user.id);
        break;
    }

    return new Response(
      JSON.stringify({ success: true, data: result }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Sync error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    const status = message === 'Unauthorized' ? 401 : message.includes('not found') ? 404 : 500;
    return new Response(
      JSON.stringify({ error: message }),
      { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
