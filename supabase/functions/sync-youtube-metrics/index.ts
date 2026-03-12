import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const ALLOWED_ORIGIN = Deno.env.get('ALLOWED_ORIGIN') || 'http://localhost:5173'

const corsHeaders = {
  'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface YouTubeChannelResponse {
  items: Array<{
    id: string;
    statistics: {
      subscriberCount: string;
      viewCount: string;
      videoCount: string;
    };
  }>;
}

interface YouTubeAnalyticsResponse {
  rows?: Array<Array<string | number>>;
  columnHeaders?: Array<{ name: string }>;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // Get auth header from request
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create client with user's token to verify identity
    const supabaseUser = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const { channel_id } = await req.json();
    if (!channel_id) {
      return new Response(
        JSON.stringify({ error: 'channel_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use service role client for database operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get channel data with YouTube tokens
    const { data: channel, error: channelError } = await supabase
      .from('channels')
      .select('*')
      .eq('id', channel_id)
      .eq('user_id', user.id)
      .single();

    if (channelError || !channel) {
      return new Response(
        JSON.stringify({ error: 'Channel not found or not authorized' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!channel.youtube_access_token) {
      return new Response(
        JSON.stringify({ error: 'YouTube not connected for this channel' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let accessToken = channel.youtube_access_token;

    // Try to refresh token if we have a refresh token
    if (channel.youtube_refresh_token) {
      const googleClientId = Deno.env.get('GOOGLE_CLIENT_ID');
      const googleClientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET');
      
      if (googleClientId && googleClientSecret) {
        try {
          const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
              client_id: googleClientId,
              client_secret: googleClientSecret,
              refresh_token: channel.youtube_refresh_token,
              grant_type: 'refresh_token',
            }),
          });

          if (tokenResponse.ok) {
            const tokenData = await tokenResponse.json();
            accessToken = tokenData.access_token;

            // Update stored access token
            await supabase
              .from('channels')
              .update({ youtube_access_token: accessToken })
              .eq('id', channel_id);
          }
        } catch (refreshError) {
          console.error('Token refresh failed:', refreshError);
        }
      }
    }

    // Fetch channel statistics from YouTube Data API
    const youtubeChannelId = channel.youtube_channel_id;
    const channelApiUrl = `https://www.googleapis.com/youtube/v3/channels?part=statistics&id=${youtubeChannelId}`;
    
    const channelResponse = await fetch(channelApiUrl, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    if (!channelResponse.ok) {
      const errorText = await channelResponse.text();
      console.error('YouTube API error:', errorText);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch YouTube data', details: errorText }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const channelData: YouTubeChannelResponse = await channelResponse.json();
    
    if (!channelData.items || channelData.items.length === 0) {
      return new Response(
        JSON.stringify({ error: 'YouTube channel not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const stats = channelData.items[0].statistics;
    const subscribers = parseInt(stats.subscriberCount) || 0;
    const totalViews = parseInt(stats.viewCount) || 0;

    // Try to fetch analytics data (RPM, watch time, etc.)
    let rpm = 0;
    let watchTimeMinutes = 0;
    let estimatedRevenue = 0;
    let last30DaysViews = 0;

    try {
      const endDate = new Date().toISOString().split('T')[0];
      const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      
      const analyticsUrl = `https://youtubeanalytics.googleapis.com/v2/reports?` + 
        `ids=channel==${youtubeChannelId}&` +
        `startDate=${startDate}&endDate=${endDate}&` +
        `metrics=views,estimatedMinutesWatched,estimatedRevenue,rpm`;

      const analyticsResponse = await fetch(analyticsUrl, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });

      if (analyticsResponse.ok) {
        const analyticsData: YouTubeAnalyticsResponse = await analyticsResponse.json();
        
        if (analyticsData.rows && analyticsData.rows.length > 0) {
          const row = analyticsData.rows[0];
          last30DaysViews = Number(row[0]) || 0;
          watchTimeMinutes = Number(row[1]) || 0;
          estimatedRevenue = Number(row[2]) || 0;
          rpm = Number(row[3]) || 0;
        }
      }
    } catch (analyticsError) {
      console.log('Analytics API not available (may require monetization):', analyticsError);
    }

    // Update channel with latest stats
    const { error: updateChannelError } = await supabase
      .from('channels')
      .update({
        subscribers: subscribers,
        monthly_views: last30DaysViews || Math.round(totalViews / 12),
        updated_at: new Date().toISOString(),
      })
      .eq('id', channel_id);

    if (updateChannelError) {
      console.error('Failed to update channel:', updateChannelError);
    }

    // Insert new metrics record
    const { error: insertMetricsError } = await supabase
      .from('channel_metrics')
      .insert({
        channel_id: channel_id,
        rpm: rpm,
        views: last30DaysViews,
        watch_time_minutes: watchTimeMinutes,
        estimated_revenue: estimatedRevenue,
        recorded_at: new Date().toISOString(),
      });

    if (insertMetricsError) {
      console.error('Failed to insert metrics:', insertMetricsError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          subscribers,
          monthly_views: last30DaysViews || Math.round(totalViews / 12),
          rpm,
          watch_time_minutes: watchTimeMinutes,
          estimated_revenue: estimatedRevenue,
          synced_at: new Date().toISOString(),
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Sync error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
