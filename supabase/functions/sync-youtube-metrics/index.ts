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

async function authenticateUser(userClient: ReturnType<typeof createClient>, token: string) {
  const { data: { user }, error } = await userClient.auth.getUser(token);
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

async function syncCompetitorViaYouTubeAPI(
  comp: Record<string, unknown>,
  ytApiKey: string
): Promise<Record<string, unknown> | null> {
  const handle = String(comp.handle || '').replace('@', '');
  if (!handle) return null;

  // 1. Fetch channel info by handle (include topicDetails for niche)
  const channelRes = await fetch(
    `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics,topicDetails&forHandle=${encodeURIComponent(handle)}&key=${ytApiKey}`
  );
  if (!channelRes.ok) return null;
  const channelData = await channelRes.json();
  const item = channelData.items?.[0];
  if (!item) return null;

  const ytChannelId = item.id;
  const subscribers = parseInt(item.statistics?.subscriberCount ?? '0') || 0;

  // Derive niche from topicCategories (e.g. "Entertainment", "Technology", "Gaming")
  const topicCategories: string[] = item.topicDetails?.topicCategories ?? [];
  const nicheMap: Record<string, string> = {
    'Entertainment': 'Entretenimento', 'Gaming': 'Games', 'Music': 'Música',
    'Sports': 'Esportes', 'Technology': 'Tecnologia', 'Science': 'Ciência',
    'Education': 'Educação', 'FilmAnimation': 'Cinema', 'Comedy': 'Comédia',
    'HowtoStyle': 'Tutorial', 'Lifestyle': 'Lifestyle', 'Automotive': 'Automóveis',
    'Travel': 'Viagem', 'Food': 'Culinária', 'News': 'Notícias',
    'Fashion': 'Moda', 'Health': 'Saúde', 'Business': 'Negócios',
  };
  const niche = topicCategories.length > 0
    ? (() => {
        const raw = topicCategories[0].split('/').pop() ?? '';
        const cleaned = raw.replace(/_/g, '');
        return nicheMap[cleaned] ?? raw.replace(/_/g, ' ');
      })()
    : null;

  // 2. Fetch recent videos
  const searchRes = await fetch(
    `https://www.googleapis.com/youtube/v3/search?channelId=${ytChannelId}&order=date&maxResults=5&part=snippet&type=video&key=${ytApiKey}`
  );
  const searchData = searchRes.ok ? await searchRes.json() : { items: [] };
  const videoItems: Array<{ id: { videoId: string }; snippet: { title: string; publishedAt: string } }> = searchData.items ?? [];

  let avgViews = 0;
  let lastVideo = 'N/A';
  let lastVideoDate: string | null = null;

  if (videoItems.length > 0) {
    lastVideo = videoItems[0].snippet.title;
    lastVideoDate = videoItems[0].snippet.publishedAt;

    const videoIds = videoItems.map(v => v.id.videoId).join(',');
    const statsRes = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?id=${videoIds}&part=statistics&key=${ytApiKey}`
    );
    if (statsRes.ok) {
      const statsData = await statsRes.json();
      const viewCounts: number[] = (statsData.items ?? []).map((v: Record<string, Record<string, string>>) =>
        parseInt(v.statistics?.viewCount ?? '0') || 0
      );
      if (viewCounts.length) {
        avgViews = Math.round(viewCounts.reduce((a, b) => a + b, 0) / viewCounts.length);
      }
    }
  }

  // 3. Calculate growth vs previous value
  const prevSubscribers = Number(comp.subscribers) || 0;
  let growth = '+0%';
  if (prevSubscribers > 0 && subscribers !== prevSubscribers) {
    const pct = ((subscribers - prevSubscribers) / prevSubscribers) * 100;
    growth = (pct >= 0 ? '+' : '') + pct.toFixed(1) + '%';
  }

  return {
    subscribers,
    avg_views: avgViews,
    last_video: lastVideo,
    last_video_date: lastVideoDate,
    growth,
    youtube_channel_id: ytChannelId,
    ...(niche ? { niche } : {}),
  };
}

async function handleSyncCompetitors(
  supabase: ReturnType<typeof createClient>,
  channelId: string,
  userId: string
) {
  const { data: channel } = await supabase
    .from('channels')
    .select('id')
    .eq('id', channelId)
    .eq('user_id', userId)
    .single();

  if (!channel) throw new Error('Channel not found or not authorized');

  const { data: competitors, error } = await supabase
    .from('channel_competitors')
    .select('*')
    .eq('channel_id', channelId);

  if (error) throw error;
  if (!competitors?.length) return { updated: 0 };

  const ytApiKey = Deno.env.get('YOUTUBE_API_KEY');
  const apifyToken = Deno.env.get('APIFY_API_TOKEN');

  let updated = 0;

  for (const comp of competitors) {
    try {
      let updateData: Record<string, unknown> | null = null;

      if (ytApiKey) {
        updateData = await syncCompetitorViaYouTubeAPI(comp, ytApiKey);
      } else if (apifyToken) {
        const url = comp.youtube_url || `https://www.youtube.com/@${comp.handle}`;
        const runRes = await fetch(
          `https://api.apify.com/v2/acts/streamers~youtube-scraper/runs?token=${apifyToken}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ startUrls: [{ url }], maxResults: 5, sortingOrder: 'date' }),
          }
        );
        if (!runRes.ok) continue;
        const runData = await runRes.json();
        const runId = runData?.data?.id;
        if (!runId) continue;

        let status = 'RUNNING';
        for (let i = 0; i < 12 && status === 'RUNNING'; i++) {
          await new Promise(r => setTimeout(r, 5000));
          const statusRes = await fetch(`https://api.apify.com/v2/actor-runs/${runId}?token=${apifyToken}`);
          status = (await statusRes.json())?.data?.status;
        }
        if (status !== 'SUCCEEDED') continue;

        const datasetRes = await fetch(`https://api.apify.com/v2/actor-runs/${runId}/dataset/items?token=${apifyToken}`);
        const items = await datasetRes.json();
        if (items?.length > 0) {
          const videoItems = items.filter((i: Record<string, unknown>) => i.type !== 'channel');
          const subText = String(items[0].subscriberCountText || items[0].subscriberCount || '0');
          const subscribers = parseSubscriberCount(subText);
          const totalViews = videoItems.reduce((s: number, v: Record<string, unknown>) => s + (Number(v.viewCount) || 0), 0);
          updateData = {
            subscribers,
            avg_views: videoItems.length ? Math.round(totalViews / videoItems.length) : 0,
            last_video: videoItems[0] ? String(videoItems[0].title || 'N/A') : 'N/A',
            last_video_date: videoItems[0] ? String(videoItems[0].date || '') : null,
          };
        }
      }

      if (updateData && Object.keys(updateData).length > 0) {
        await supabase.from('channel_competitors').update(updateData).eq('id', comp.id);
        updated++;
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

    const token = authHeader.replace('Bearer ', '');
    const { userClient, serviceClient } = buildSupabaseClients(supabaseUrl, serviceKey, anonKey, authHeader);
    const user = await authenticateUser(userClient, token);

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
