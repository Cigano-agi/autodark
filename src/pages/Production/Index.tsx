import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useChannels } from "@/hooks/useChannels";
import { useBlueprint } from "@/hooks/useBlueprint";
import { useContentIdeas } from "@/hooks/useContentIdeas";
import { useChannelPrompts } from "@/hooks/useChannelPrompts";
import { useContents } from "@/hooks/useContents";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Wand2, Play, Image as ImageIcon, FileText, CheckCircle, Zap, ArrowRight, Lightbulb, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { BeamsBackground } from "@/components/ui/beams-background";
import { DashboardHeader } from "@/components/ui/dashboard-header";
import { KieGenerator } from "@/components/ui/kie-generator";

const AI33_API_KEY = (import.meta.env.VITE_AI33_API_KEY as string | undefined)?.replace(/['"]/g, '').trim();
const OPENROUTER_API_KEY = (import.meta.env.VITE_OPENROUTER_API_KEY as string | undefined)?.replace(/['"]/g, '').trim();

// ─── Claude API helper ────────────────────────────────────────────────────────

const callClaude = async (systemPrompt: string, userPrompt: string, requireJson = false): Promise<string> => {
    const isDev = window.location.hostname === "localhost" || 
                  window.location.hostname === "127.0.0.1" || 
                  window.location.hostname.startsWith("192.168.") ||
                  window.location.hostname.startsWith("10.");

    // Tentar AI33 Primeiro
    try {
        const urlAi33 = isDev 
            ? "/api-ai/v1/chat/completions" 
            : "https://api.ai33.pro/v1/chat/completions";

        if (!AI33_API_KEY) throw new Error("AI33_API_KEY missing");

        const response = await fetch(urlAi33, {
            method: "POST",
            headers: { 
                "Content-Type": "application/json",
                "Authorization": `Bearer ${AI33_API_KEY}`
            },
            body: JSON.stringify({
                model: "gpt-4o-mini",
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: userPrompt }
                ],
                temperature: 0.7,
                ...(requireJson ? { response_format: { type: "json_object" } } : {})
            }),
        });

        if (response.ok) {
            const data = await response.json();
            return data.choices?.[0]?.message?.content || "";
        }

        // Se falhou por créditos/auth (401), tentamos o Fallback se existir
        if (response.status === 401 && OPENROUTER_API_KEY) {
            console.warn("[Production] AI33 falhou (401). Tentando Fallback OpenRouter...");
            return await callOpenRouter(systemPrompt, userPrompt, requireJson);
        }

        const errText = await response.text();
        throw new Error(`AI33 Error ${response.status}: ${errText.slice(0, 100)}`);

    } catch (err: any) {
        if (OPENROUTER_API_KEY && (err.message?.includes("401") || err.message?.includes("AI33"))) {
             return await callOpenRouter(systemPrompt, userPrompt, requireJson);
        }
        throw err;
    }
};

const callOpenRouter = async (systemPrompt: string, userPrompt: string, requireJson = false): Promise<string> => {
    console.log("[Production] Usando OpenRouter...");
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
            "HTTP-Referer": window.location.origin,
            "X-Title": "AutoDark Production"
        },
        body: JSON.stringify({
            model: "openai/gpt-4o-mini",
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt }
            ],
            ...(requireJson ? { response_format: { type: "json_object" } } : {})
        })
    });

    if (!response.ok) {
        const err = await response.text();
        throw new Error(`OpenRouter Error ${response.status}: ${err}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || "";
};

const extractJson = (text: string) => {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("JSON não encontrado na resposta");
    return JSON.parse(match[0]);
};

export default function ProductionWizard() {
    const { channels } = useChannels();
    const location = useLocation();
    const navigate = useNavigate();
    const [selectedChannelId, setSelectedChannelId] = useState<string>(location.state?.channelId || "");
    const { blueprint } = useBlueprint(selectedChannelId);
    const { ideas } = useContentIdeas(selectedChannelId || undefined);
    const { createContent } = useContents(selectedChannelId || undefined);

    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [statusMessage, setStatusMessage] = useState("");

    // Generation States
    const [idea, setIdea] = useState("");
    const [title, setTitle] = useState("");
    const [summary, setSummary] = useState("");
    const [script, setScript] = useState("");
    const [thumbPrompt, setThumbPrompt] = useState("");
    const [ttsPrompt, setTtsPrompt] = useState("");
    const [brollPrompt, setBrollPrompt] = useState("");

    const handleChannelSelect = (id: string) => {
        setSelectedChannelId(id);
        setStep(1);
        setIdea("");
        setTitle("");
        setSummary("");
        setScript("");
        setThumbPrompt("");
        setTtsPrompt("");
        setBrollPrompt("");
    };

    const setStatus = (msg: string) => setStatusMessage(msg);

    const handleGenerateTitleSummary = async () => {
        if (!idea.trim()) { toast.error("Digite uma ideia primeiro."); return; }
        setLoading(true);
        try {
            setStatus("Analisando ideia...");
            const raw = await callClaude(
                "Você é um especialista em YouTube. Retorne APENAS um objeto JSON com as chaves 'title' e 'summary'.",
                `Tópico: "${blueprint?.topic || "geral"}"\nIdeia: "${idea}"\nFormato: {"title": "Título épico", "summary": "Por que viraliza..."}`,
                true
            );
            const parsed = extractJson(raw);
            setTitle(parsed.title);
            setSummary(parsed.summary);
            setStep(2);
            toast.success("Título gerado!");
        } catch (e: any) {
            toast.error(e.message || "Erro ao gerar título.");
        } finally {
            setLoading(false);
            setStatus("");
        }
    };

    const handleGenerateScript = async () => {
        setLoading(true);
        try {
            setStatus("Escrevendo roteiro cinematográfico...");
            const raw = await callClaude(
                `You are an elite investigative documentary scriptwriter for YouTube. You write in the "cynical insider" style — investigative journalism, never cheap sensationalism.

MANDATORY RULES (D-005):
1. Script in ENGLISH, alternating VISUAL and AUDIO blocks per scene
2. SCENE 01 is always the Hook: number + contradiction + revelation + dramatic pause + promise
3. "But, Therefore" mandatory every 45 seconds — NEVER "And, Then"
4. NEVER use "we", "our", "us" — always 3rd person narrator
5. EVERY factual scene needs an evidence_query (Google search query for B-roll images)
6. 25-35 scenes total (1 scene ≈ 20-25 seconds of content)
7. Prefer S-Tier sources (primary documents, official reports) and A-Tier (Reuters/AP)
8. Mark exactly 2 scenes with [WALL-PUSHER ★] — maximum revelation moments
9. Second-to-last scene promotes the next video in the series
10. Final scene: subscribe + notification + comment CTA

FORMAT (repeat for each scene):
SCENE [NN] — [Scene Title]
AUDIO: [Narration text — what the voice says]
VISUAL: [Detailed image description for FLUX AI image generation, cinematic, no faces, no text]
evidence_query: [Google search query to find B-roll image for this scene]

Output ONLY the raw script text. No JSON. No markdown headers.`,
                `Title: ${title}\nContext: ${summary}\nChannel topic: ${blueprint?.topic || "investigative documentary"}\nIdea: ${idea.slice(0, 300)}`
            );
            setScript(raw);
            setStep(3);
            toast.success("Roteiro cinematográfico gerado!");
        } catch (e) {
            toast.error("Erro ao gerar roteiro.");
        } finally {
            setLoading(false);
            setStatus("");
        }
    };

    const handleGeneratePrompts = async () => {
        setLoading(true);
        try {
            setStatus("Gerando prompts de produção...");
            const raw = await callClaude(
                `Você é um diretor de produção de vídeos curtos para YouTube.
Dado o título e roteiro, gere 3 prompts de produção em JSON:
1. "thumbnail": prompt em inglês para gerador de imagem (Midjourney/Flux/Leonardo). Máximo 120 chars. Visual impactante, sem texto na imagem.
2. "tts": direção de voz para narrador TTS. Estilo, ritmo, emoção, pausas. Em português.
3. "broll": 3 prompts de imagem em inglês para cenas B-roll do vídeo, separados por " | ". Visuais cinematográficos.
Retorne APENAS JSON: {"thumbnail":"...","tts":"...","broll":"..."}`,
                `Título: ${title}\nRoteiro: ${script.slice(0, 400)}`,
                true
            );
            const parsed = extractJson(raw);
            setThumbPrompt(parsed.thumbnail?.replace(/^["']+|["']+$/g, "").trim() || "");
            setTtsPrompt(parsed.tts?.trim() || "");
            setBrollPrompt(parsed.broll?.trim() || "");
            setStep(4);
            toast.success("Prompts gerados!");
        } catch (e) {
            toast.error("Erro ao gerar prompts.");
        } finally {
            setLoading(false);
            setStatus("");
        }
    };

    const handleFinalize = async () => {
        if (!selectedChannelId) return;
        setLoading(true);
        try {
            // 1. Insert into `topics` table (Python pipeline picks it up)
            const { data: topicData, error: topicError } = await supabase
                .from("topics")
                .insert({
                    title,
                    pillar: blueprint?.topic || "general",
                    status: "scripted",
                    channel_ref: selectedChannelId,
                })
                .select()
                .single();

            if (topicError) throw new Error(`topics: ${topicError.message}`);

            // 2. Insert into `pipeline_scripts` (approved, ready for Python pipeline)
            const { error: scriptError } = await supabase
                .from("pipeline_scripts")
                .insert({
                    topic_id: topicData.id,
                    script_text: script,
                    status: "approved",
                    model_used: "gpt-4o-mini",
                    score: 8.0,
                });

            if (scriptError) throw new Error(`pipeline_scripts: ${scriptError.message}`);

            // 3. Save to channel_contents (web app dashboard)
            await createContent.mutateAsync({
                title,
                hook: summary,
                script: `${script}\n\n---\n## Prompts de Produção\n\n### Thumbnail (Flux/Midjourney)\n${thumbPrompt}\n\n### Direção de Voz (TTS)\n${ttsPrompt}\n\n### Cenas B-Roll\n${brollPrompt}`,
                status: "draft"
            });

            toast.success("Roteiro enviado para o pipeline de produção!");
            setTimeout(() => navigate(`/channel/${selectedChannelId}`), 1000);
        } catch (e: any) {
            toast.error(`Erro ao salvar: ${e.message}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <BeamsBackground intensity="medium" className="bg-background">
            <DashboardHeader />
            <main className="pt-28 pb-12 px-6 max-w-7xl mx-auto min-h-screen relative z-10 text-foreground">
                <div className="max-w-4xl mx-auto space-y-8 animate-fade-in relative">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Assistente de Produção</h1>
                            <p className="text-muted-foreground">
                                Gere conteúdo do zero seguindo o Blueprint do seu canal.
                            </p>
                            {loading && statusMessage && (
                                <div className="mt-2 flex items-center gap-2 text-primary animate-pulse">
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                    <span className="text-sm font-mono">{statusMessage}</span>
                                </div>
                            )}
                        </div>
                        <div className="flex gap-2">
                            {[1, 2, 3, 4].map((s) => (
                                <div key={s} className={`w-3 h-3 rounded-full transition-colors ${step >= s ? 'bg-primary' : 'bg-muted'}`} />
                            ))}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Left Panel: Configuration */}
                        <Card className="md:col-span-1 bg-card/50 backdrop-blur-sm border-border h-fit">
                            <CardHeader>
                                <CardTitle className="text-lg text-white">Configuração</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <Label className="text-white">Selecione o Canal</Label>
                                    <Select onValueChange={handleChannelSelect} value={selectedChannelId}>
                                        <SelectTrigger className="bg-black/20 border-white/10 text-white">
                                            <SelectValue placeholder="Escolha..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {channels.map(c => (
                                                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                {selectedChannelId && blueprint && (
                                    <div className="p-3 bg-primary/10 rounded-lg text-sm space-y-2 border border-primary/20">
                                        <div className="flex items-center gap-2 font-medium text-primary">
                                            <Zap className="w-4 h-4" /> Blueprint Ativo
                                        </div>
                                        <ul className="space-y-1 text-muted-foreground text-xs">
                                            <li><span className="font-semibold text-white">Tópico:</span> {blueprint.topic || '-'}</li>
                                            <li><span className="font-semibold text-white">Voz:</span> {blueprint.voice_name || '-'}</li>
                                            <li><span className="font-semibold text-white">Estilo:</span> {blueprint.visual_style ? 'Definido' : '-'}</li>
                                        </ul>
                                    </div>
                                )}

                                <div className="mt-6">
                                    <KieGenerator channelId={selectedChannelId} topic={blueprint?.topic} />
                                </div>
                            </CardContent>
                        </Card>

                        {/* Right Panel: Wizard Steps */}
                        <div className="md:col-span-2 space-y-6">

                            {/* Step 1: Idea & Title */}
                            <Card className={`transition-all duration-300 bg-card/30 backdrop-blur border-white/10 ${step === 1 ? 'ring-2 ring-primary border-transparent' : ''}`}>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2 text-white">
                                        <Lightbulb className="w-5 h-5 text-yellow-500" /> 1. Ideia e Título
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    {/* Ideias salvas do canal */}
                                    {step === 1 && ideas.length > 0 && (
                                        <div className="space-y-2">
                                            <Label className="text-white/70 text-xs uppercase tracking-wider flex items-center gap-1.5">
                                                <Sparkles className="w-3.5 h-3.5 text-primary" />
                                                Usar ideia salva do canal ({ideas.length})
                                            </Label>
                                            <div className="flex flex-col gap-1.5 max-h-48 overflow-y-auto pr-1">
                                                {ideas.map(i => (
                                                    <button
                                                        key={i.id}
                                                        onClick={() => setIdea(`${i.title}${i.concept ? `\n\n${i.concept}` : ''}`)}
                                                        className={`text-left px-3 py-2.5 rounded-lg border text-sm transition-all group ${
                                                            idea.startsWith(i.title)
                                                                ? 'bg-primary/20 border-primary/50 text-white'
                                                                : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10 hover:border-white/20 hover:text-white'
                                                        }`}
                                                    >
                                                        <div className="flex items-start justify-between gap-2">
                                                            <span className="font-medium line-clamp-1">{i.title}</span>
                                                            {i.score && (
                                                                <span className="text-[10px] shrink-0 bg-primary/20 text-primary px-1.5 py-0.5 rounded font-bold">
                                                                    {i.score}
                                                                </span>
                                                            )}
                                                        </div>
                                                        {i.concept && (
                                                            <p className="text-xs text-white/40 mt-0.5 line-clamp-1">{i.concept}</p>
                                                        )}
                                                    </button>
                                                ))}
                                            </div>
                                            <div className="flex items-center gap-2 text-white/20 text-xs">
                                                <div className="h-px flex-1 bg-white/10" />
                                                ou escreva manualmente
                                                <div className="h-px flex-1 bg-white/10" />
                                            </div>
                                        </div>
                                    )}

                                    <div className="space-y-2">
                                        <Label className="text-white">Sua Ideia</Label>
                                        <Textarea
                                            value={idea}
                                            onChange={e => setIdea(e.target.value)}
                                            placeholder="Sobre o que será o vídeo?"
                                            disabled={step > 1}
                                            className="bg-black/40 border-white/10 text-white min-h-[100px]"
                                        />
                                    </div>
                                    {step === 1 ? (
                                        <Button
                                            onClick={handleGenerateTitleSummary}
                                            disabled={!selectedChannelId || !idea.trim() || loading}
                                            className="w-full gap-2"
                                        >
                                            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
                                            Iniciar
                                        </Button>
                                    ) : (
                                        <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg space-y-2">
                                            <p className="text-sm font-bold text-white">Título: {title}</p>
                                            <p className="text-xs text-muted-foreground">{summary}</p>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            {/* Step 2: Script */}
                            {step >= 2 && (
                                <Card className={`transition-all duration-300 animate-in fade-in slide-in-from-bottom-4 bg-card/30 backdrop-blur border-white/10 ${step === 2 ? 'ring-2 ring-primary border-transparent' : ''}`}>
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2 text-white">
                                            <FileText className="w-5 h-5 text-blue-500" /> 2. Roteiro (Script)
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        {!script ? (
                                            <Button
                                                onClick={handleGenerateScript}
                                                disabled={loading}
                                                className="w-full gap-2"
                                            >
                                                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
                                                Gerar Roteiro Cinematográfico (D-005)
                                            </Button>
                                        ) : (
                                            <div className="space-y-2">
                                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                    <span className="bg-primary/20 text-primary px-2 py-0.5 rounded font-mono font-bold">
                                                        {(script.match(/^SCENE \d+/gm) || []).length} cenas
                                                    </span>
                                                    <span>{script.length.toLocaleString()} chars</span>
                                                    {script.includes('[WALL-PUSHER ★]') && (
                                                        <span className="bg-red-500/20 text-red-400 px-2 py-0.5 rounded font-bold">
                                                            {(script.match(/\[WALL-PUSHER ★\]/g) || []).length}× Wall-Pusher ★
                                                        </span>
                                                    )}
                                                </div>
                                                <Textarea value={script} onChange={e => setScript(e.target.value)} className="h-[400px] font-mono text-xs bg-black/40 border-white/10 text-white" />
                                                {step === 2 && (
                                                    <Button onClick={handleGeneratePrompts} disabled={loading} className="w-full gap-2 mt-2">
                                                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                                                        Gerar Prompts de Produção
                                                    </Button>
                                                )}
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            )}

                            {/* Step 3: Prompts de Produção */}
                            {step >= 3 && (
                                <Card className={`transition-all duration-300 animate-in fade-in slide-in-from-bottom-4 bg-card/30 backdrop-blur border-white/10 ${step === 3 ? 'ring-2 ring-primary border-transparent' : ''}`}>
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2 text-white">
                                            <Sparkles className="w-5 h-5 text-pink-500" /> 3. Prompts de Produção
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        {!thumbPrompt ? (
                                            <Button
                                                onClick={handleGeneratePrompts}
                                                disabled={loading}
                                                variant="secondary"
                                                className="w-full gap-2"
                                            >
                                                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
                                                Gerar Prompts com IA
                                            </Button>
                                        ) : (
                                            <div className="space-y-4">
                                                <div className="space-y-1">
                                                    <Label className="text-xs text-pink-400 font-semibold uppercase tracking-wider flex items-center gap-1">
                                                        <ImageIcon className="w-3 h-3" /> Thumbnail (Flux / Midjourney)
                                                    </Label>
                                                    <div className="relative">
                                                        <Textarea value={thumbPrompt} readOnly rows={2} className="font-mono text-xs bg-black/40 border-white/10 text-white pr-16 resize-none" />
                                                        <Button size="sm" variant="ghost" className="absolute top-1 right-1 h-6 text-xs text-muted-foreground hover:text-white" onClick={() => { navigator.clipboard.writeText(thumbPrompt); toast.success("Copiado!"); }}>
                                                            Copiar
                                                        </Button>
                                                    </div>
                                                </div>
                                                <div className="space-y-1">
                                                    <Label className="text-xs text-blue-400 font-semibold uppercase tracking-wider flex items-center gap-1">
                                                        <Zap className="w-3 h-3" /> Direção de Voz (TTS)
                                                    </Label>
                                                    <div className="relative">
                                                        <Textarea value={ttsPrompt} readOnly rows={2} className="font-mono text-xs bg-black/40 border-white/10 text-white pr-16 resize-none" />
                                                        <Button size="sm" variant="ghost" className="absolute top-1 right-1 h-6 text-xs text-muted-foreground hover:text-white" onClick={() => { navigator.clipboard.writeText(ttsPrompt); toast.success("Copiado!"); }}>
                                                            Copiar
                                                        </Button>
                                                    </div>
                                                </div>
                                                <div className="space-y-1">
                                                    <Label className="text-xs text-emerald-400 font-semibold uppercase tracking-wider flex items-center gap-1">
                                                        <Play className="w-3 h-3" /> Cenas B-Roll
                                                    </Label>
                                                    <div className="relative">
                                                        <Textarea value={brollPrompt} readOnly rows={3} className="font-mono text-xs bg-black/40 border-white/10 text-white pr-16 resize-none" />
                                                        <Button size="sm" variant="ghost" className="absolute top-1 right-1 h-6 text-xs text-muted-foreground hover:text-white" onClick={() => { navigator.clipboard.writeText(brollPrompt); toast.success("Copiado!"); }}>
                                                            Copiar
                                                        </Button>
                                                    </div>
                                                </div>
                                                <Button onClick={handleGeneratePrompts} disabled={loading} variant="outline" size="sm" className="w-full gap-2 border-white/10">
                                                    {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Wand2 className="w-3 h-3" />}
                                                    Regerar Prompts
                                                </Button>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            )}

                            {/* Step 4: Final */}
                            {step === 4 && (
                                <div className="flex justify-end animate-in fade-in slide-in-from-bottom-4">
                                    <Button
                                        size="lg"
                                        onClick={handleFinalize}
                                        disabled={loading}
                                        className="w-full md:w-auto bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-900/20 gap-2"
                                    >
                                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <ArrowRight className="w-5 h-5" />}
                                        Enviar para Aprovação Final
                                    </Button>
                                </div>
                            )}

                        </div>
                    </div>
                </div>
            </main>
        </BeamsBackground>
    );
}