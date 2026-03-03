import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.39.3";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const AI33_API_KEY = Deno.env.get("AI33_API_KEY") || "sk_aykke6mp4owf9pjtv4k1xubga0t12gu7nljjm72bls8wwjhv";
const AI33_URL = "https://api.ai33.pro/v1/chat/completions";

Deno.serve(async (req) => {
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

        const { data: { user } } = await supabaseClient.auth.getUser();
        if (!user) throw new Error("Unauthorized");

        const { contentId } = await req.json();
        if (!contentId) throw new Error("contentId is required");

        const { data: content, error: contentError } = await supabaseClient
            .from("channel_contents")
            .select("*")
            .eq("id", contentId)
            .single();

        if (contentError || !content) throw new Error("Content not found");

        const { data: blueprint } = await supabaseClient
            .from("channel_blueprints")
            .select("*")
            .eq("channel_id", content.channel_id)
            .maybeSingle();

        const charLimit = blueprint?.char_limit || 500;
        const cta = blueprint?.cta || "Se inscreva no canal e ative as notificações!";
        const scriptRules = blueprint?.script_rules || "";

        const systemPrompt = `Você é um roteirista de vídeos curtos especializado em narrativas reais. Sua missão é criar um texto emocionante, reverente e fiel, otimizado para narração (TTS).

PARÂMETROS TÉCNICOS CRÍTICOS:

- Limite Estrito: O roteiro NUNCA deve ultrapassar ${charLimit} caracteres (contando espaços).
- Início: Comece exatamente com o hook: ${content.hook || content.title}
- Personagem e Fonte: Mencione naturalmente ${content.character || "o protagonista"} e obrigatoriamente a referência: ${content.reference || "a fonte original"}.
- A referência deve obrigatoriamente ser citada da maneira como está escrita, exemplo "Isso acontece em Marcos, capítulo 4, versículo 10"
- Final: Encerre com a mensagem baseada em ${content.angle || "o significado profundo"} e finalize com o CTA: ${cta}
${scriptRules ? `\nREGRAS ADICIONAIS DO CANAL:\n${scriptRules}` : ""}

QUALIDADE NARRATIVA (PARA TTS):

- Fidelidade: Siga estritamente os fatos de ${content.reference || "a fonte"}. Não invente diálogos ou mude a ordem.
- Ritmo de Fala: O texto deve ter pausas naturais para a voz da IA respirar.
- Impacto: Foque no poder do evento e na reação das pessoas. Transmita o sagrado sem soar como pregador.

PROCESSO DE ESCRITA:

1. Leia o limite de caracteres disponível.
2. Escreva a narrativa focando no essencial.
3. Se o texto ultrapassar o limite, corte palavras de preenchimento (adjetivos desnecessários), mas mantenha o Hook, a Referência e o CTA intactos.

FORMATO DE SAÍDA (JSON PURO):
{
  "roteiro_final": "O texto completo aqui.",
  "tema": "${content.topic || content.title}",
  "gancho": "${content.hook || content.title}",
  "char_used": [número real de caracteres do roteiro_final]
}`;

        const aiResponse = await fetch(AI33_URL, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${AI33_API_KEY}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                model: "gpt-4o-mini",
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: `Gere o roteiro para o vídeo sobre: ${content.topic || content.title}` }
                ],
                temperature: 0.7,
                response_format: { type: "json_object" },
            }),
        });

        if (!aiResponse.ok) {
            const errorText = await aiResponse.text();
            console.error("AI33 Error:", errorText);
            throw new Error(`AI API failed: ${aiResponse.statusText}`);
        }

        const aiData = await aiResponse.json();
        const rawContent = aiData.choices?.[0]?.message?.content || "{}";
        let parsed;
        try {
            parsed = JSON.parse(rawContent);
        } catch {
            throw new Error("Failed to parse AI response as JSON");
        }

        const script = parsed.roteiro_final;
        if (!script) throw new Error("No script generated");

        const { data: updated, error: updateError } = await supabaseClient
            .from("channel_contents")
            .update({
                script: script,
                status: "script_generated",
                updated_at: new Date().toISOString(),
            })
            .eq("id", contentId)
            .select()
            .single();

        if (updateError) {
            console.error("Update error:", updateError);
            throw new Error(`Failed to update content: ${updateError.message}`);
        }

        return new Response(JSON.stringify({
            success: true,
            content: updated,
            char_used: parsed.char_used,
        }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });

    } catch (error) {
        console.error("Error in generate-script:", error);
        return new Response(JSON.stringify({
            error: error instanceof Error ? error.message : "Unknown error",
        }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 400,
        });
    }
});
