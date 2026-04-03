import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    const authHeader = req.headers.get('Authorization')
    const token = authHeader ? authHeader.replace('Bearer ', '') : ''
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token)

    if (!user || authError) {
      throw new Error('Unauthorized: ' + (authError?.message || 'Invalid or missing token'))
    }

    const { channelId } = await req.json()

    if (!channelId) {
      throw new Error('Channel ID is required')
    }

    // Fetch channel data
    const { data: channel, error: channelError } = await supabaseClient
      .from('channels')
      .select('*')
      .eq('id', channelId)
      .single()

    if (channelError || !channel) {
      throw new Error('Channel not found')
    }

    // Fetch blueprint for persona context
    const { data: blueprint } = await supabaseClient
      .from('channel_blueprints')
      .select('*')
      .eq('channel_id', channelId)
      .maybeSingle()

    const openRouterKey = Deno.env.get('OPENROUTER_API_KEY')

    if (!openRouterKey) {
      console.warn('No OPENROUTER_API_KEY configured.')
      return new Response(
        JSON.stringify({
          strategy: 'API key missing. Configure OPENROUTER_API_KEY in Supabase secrets.',
          ideas: []
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      )
    }

    const personaContext = blueprint?.persona_prompt
      ? `\nPersona/Voice: ${blueprint.persona_prompt}`
      : ''
    const audienceContext = blueprint?.target_audience
      ? `\nTarget Audience: ${blueprint.target_audience}`
      : ''
    const topicContext = blueprint?.topic
      ? `\nMain Topic: ${blueprint.topic}`
      : ''

    const systemPrompt = `You are a YouTube Strategy Expert. Analyze the following channel and provide a JSON response with:
1. "strategy": A brief strategic analysis (2-3 paragraphs in Portuguese BR)
2. "ideas": An array of 5 content ideas, each with "title", "concept", "reasoning", and "score" (1-100)

Channel Name: ${channel.name}
Niche: ${channel.niche}
Description: ${channel.youtube_description || 'No description'}
Stats: ${channel.subscribers || 0} subs, ${channel.monthly_views || 0} monthly views.${personaContext}${audienceContext}${topicContext}

Respond ONLY with valid JSON. All text must be in Portuguese (BR).`

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openRouterKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'openai/gpt-4-turbo',
        messages: [
          { role: 'system', content: systemPrompt },
        ],
        response_format: { type: 'json_object' },
      })
    })

    if (!response.ok) {
      const errorData = await response.json()
      console.error('OpenRouter API error:', errorData)
      throw new Error(`OpenRouter API failed: ${errorData.error?.message || 'Unknown error'}`)
    }

    const aiData = await response.json()
    const rawContent = aiData.choices?.[0]?.message?.content || '{}'

    let parsed
    try {
      parsed = JSON.parse(rawContent)
    } catch (parseError) {
      console.error('JSON parse error:', parseError, 'Content:', rawContent)
      parsed = { strategy: rawContent, ideas: [] }
    }

    // Save content ideas to DB if available
    if (parsed.ideas && Array.isArray(parsed.ideas) && parsed.ideas.length > 0) {
      const ideasToInsert = parsed.ideas.map((idea: { title: string; concept?: string; reasoning?: string; score?: number }) => ({
        channel_id: channelId,
        title: idea.title,
        concept: idea.concept || null,
        reasoning: idea.reasoning || null,
        score: idea.score || null,
        status: 'pending',
      }))

      const { error: insertError } = await supabaseClient
        .from('content_ideas')
        .insert(ideasToInsert)

      if (insertError) {
        console.error('Failed to save content ideas:', insertError)
      }
    }

    return new Response(
      JSON.stringify(parsed),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200, // Supabase invoke masks 400 errors, return 200 with error payload
      }
    )
  }
})
