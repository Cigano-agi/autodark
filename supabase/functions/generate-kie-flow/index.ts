import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.39.3";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface KieFlowRequest {
    channelId: string;
    topic: string;
}

interface KieFlowResponse {
    script: string;
    images: string[];
    videoUrl?: string;
    status: 'success' | 'error';
    message?: string;
}

Deno.serve(async (req) => {
    // Handle CORS preflight
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        const supabaseClient = createClient(
            Deno.env.get("SUPABASE_URL") ?? "",
            Deno.env.get("SUPABASE_ANON_KEY") ?? "",
            {
                global: {
                    headers: { Authorization: req.headers.get("Authorization")! },
                },
            }
        );

        const { channelId, topic } = await req.json() as KieFlowRequest;

        if (!channelId || !topic) {
            throw new Error("channelId and topic are required.");
        }

        // 1. Check KIE_API_KEY
        const kieApiKey = Deno.env.get("KIE_API_KEY");
        const kieApiUrl = Deno.env.get("KIE_API_URL") || "https://api.kie.ai/v1"; // Example

        // --- MOCK MODE (If no API key provided) ---
        if (!kieApiKey) {
            console.log("KIE_API_KEY not found. Returning MOCK response.");

            // Simulate real processing time
            await new Promise(resolve => setTimeout(resolve, 3000));

            const mockResponse: KieFlowResponse = {
                script: `[Cena 1]\nÁudio: Você não vai acreditar neste fato sobre ${topic}...\nImagem: Cena dramática ilustrando o tema.\n\n[Cena 2]\nÁudio: A grande verdade é que o algoritmo esconde isso de nós.\nImagem: Close em um rosto chocado.`,
                images: [
                    "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=600&auto=format&fit=crop",
                    "https://images.unsplash.com/photo-1614850523459-c2f4c699c52e?q=80&w=600&auto=format&fit=crop"
                ],
                videoUrl: "https://www.w3schools.com/html/mov_bbb.mp4", // Mock MP4
                status: 'success'
            };

            return new Response(JSON.stringify(mockResponse), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 200,
            });
        }

        // --- REAL MODE (If API key provided) ---
        console.log(`Starting real Kie.ai generation for topic: ${topic}`);

        // This block is pseudo-code for the anticipated API.
        // Replace with ACTUAL Kie.ai payloads once documentation is provided.
        /*
        const kieResponse = await fetch(`${kieApiUrl}/generate-video`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${kieApiKey}`
          },
          body: JSON.stringify({
            prompt: topic,
            type: 'dark_channel_short',
            // other params...
          })
        });
    
        if (!kieResponse.ok) {
            throw new Error(`Kie.ai API Error: ${kieResponse.statusText}`);
        }
    
        const kieResult = await kieResponse.json();
        */

        return new Response(JSON.stringify({
            status: 'success',
            message: 'Real Kie.ai API implementation pending format confirmation. Set KIE_API_KEY to null to use Mock.',
        }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
        });

    } catch (error) {
        console.error("Error in generate-kie-flow:", error);
        return new Response(
            JSON.stringify({
                status: 'error',
                message: error instanceof Error ? error.message : "An unexpected error occurred."
            }),
            {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 400,
            }
        );
    }
});
