import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { prompt } = await req.json();
    if (!prompt) throw new Error("prompt is required");

    const AI33_API_KEY = Deno.env.get("AI33_API_KEY");
    if (!AI33_API_KEY) throw new Error("AI33_API_KEY not configured");

    const res = await fetch("https://api.ai33.pro/v1/images/generations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${AI33_API_KEY}`,
      },
      body: JSON.stringify({
        model: "dall-e-3",
        prompt,
        size: "1792x1024",
        quality: "standard",
        n: 1,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`AI33 images error ${res.status}: ${err.slice(0, 200)}`);
    }

    const data = await res.json();
    const url = data?.data?.[0]?.url;
    if (!url) throw new Error("AI33: no image URL in response");

    return new Response(JSON.stringify({ url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[generate-image]", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
