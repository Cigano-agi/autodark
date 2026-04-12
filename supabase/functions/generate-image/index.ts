// @ts-nocheck
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const AI33_API_KEY = Deno.env.get("AI33_API_KEY");

/**
 * Polls an AI33 task until status "done" or timeout.
 * Same pattern as youtube-generate-audio.
 */
async function pollAI33ImageTask(
  taskId: string,
  apiKey: string,
  timeoutMs = 240_000,
  intervalMs = 3_000
): Promise<string> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const res = await fetch(`https://api.ai33.pro/v1/task/${taskId}`, {
      headers: { "xi-api-key": apiKey },
    });
    const task = await res.json();
    if (task.status === "done") {
      // Response shape per AI33 docs: metadata.result_images[0].imageUrl
      const url = task.metadata?.result_images?.[0]?.imageUrl
        ?? task.metadata?.result_images?.[0]?.previewUrl;
      if (!url) throw new Error(`AI33: task done but no image URL. meta=${JSON.stringify(task.metadata)}`);
      return url as string;
    }
    if (task.status === "error") throw new Error(task.error_message ?? "AI33 image task failed");
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  throw new Error("AI33 image: timeout after 240s");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    if (!AI33_API_KEY) throw new Error("AI33_API_KEY not configured");

    const { prompt } = await req.json();
    if (!prompt) throw new Error("prompt is required");

    // Build multipart/form-data as per AI33 docs:
    // POST https://api.ai33.pro/v1i/task/generate-image
    // Header: xi-api-key
    // Fields: prompt, model_id, generations_count, model_parameters (JSON string)
    const form = new FormData();
    form.append("prompt", prompt.slice(0, 4000));
    form.append("model_id", "bytedance-seedream-4.5");
    form.append("generations_count", "1");
    form.append("model_parameters", JSON.stringify({ aspect_ratio: "16:9", resolution: "2K" }));

    const submitRes = await fetch("https://api.ai33.pro/v1i/task/generate-image", {
      method: "POST",
      headers: { "xi-api-key": AI33_API_KEY },
      body: form,
    });

    if (!submitRes.ok) {
      const err = await submitRes.text();
      throw new Error(`AI33 submit error ${submitRes.status}: ${err.slice(0, 300)}`);
    }

    const submitData = await submitRes.json();
    const taskId = submitData?.task_id ?? submitData?.id;
    if (!taskId) throw new Error(`AI33: no task_id in response: ${JSON.stringify(submitData)}`);

    console.log(`[generate-image] AI33 task submitted. task_id=${taskId}`);

    const url = await pollAI33ImageTask(taskId, AI33_API_KEY);

    return new Response(JSON.stringify({ url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("[generate-image]", error instanceof Error ? error.message : error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
