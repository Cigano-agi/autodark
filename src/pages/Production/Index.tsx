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
import { Loader2, Wand2, Play, Image as ImageIcon, FileText, CheckCircle, Zap, ArrowRight, Lightbulb } from "lucide-react";
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

    const handleChannelSelect = (id: string) => {
        setSelectedChannelId(id);
        setStep(1);
        setIdea("");
        setTitle("");
        setSummary("");
        setScript("");
        setThumbPrompt("");
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
            setStatus("Escrevendo roteiro viral...");
            const raw = await callClaude(
                "Você é um roteirista de YouTube. Escreva um roteiro narrativo completo.",
                `Crie um roteiro para:\nTítulo: ${title}\nContexto: ${summary}\nTópico: ${blueprint?.topic}`
            );
            setScript(raw);
            setStep(3);
            toast.success("Roteiro gerado!");
        } catch (e) {
            toast.error("Erro ao gerar roteiro.");
        } finally {
            setLoading(false);
            setStatus("");
        }
    };

    const handleGenerateThumb = async () => {
        setLoading(true);
        try {
            setStatus("Criando conceito visual...");
            const raw = await callClaude(
                "Você é um especialista em thumbnails.",
                `Crie um prompt para gerar a thumbnail do vídeo: ${title}`
            );
            setThumbPrompt(raw);
            setStep(4);
            toast.success("Conceito de thumbnail criado!");
        } catch (e) {
            toast.error("Erro ao gerar thumbnail.");
        } finally {
            setLoading(false);
            setStatus("");
        }
    };

    const handleFinalize = async () => {
        if (!selectedChannelId) return;
        setLoading(true);
        try {
            await createContent.mutateAsync({
                title,
                hook: summary,
                script: `## Thumbnail\n${thumbPrompt}\n\n## Roteiro\n${script}`,
                status: "draft"
            });
            toast.success("Vídeo enviado para produção! 🚀");
            setTimeout(() => navigate(`/channel/${selectedChannelId}`), 1000);
        } catch (e) {
            toast.error("Erro ao salvar conteúdo.");
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
                                                Gerar Roteiro com IA
                                            </Button>
                                        ) : (
                                            <Textarea value={script} readOnly className="h-[200px] font-mono text-xs bg-black/40 border-white/10 text-white" />
                                        )}
                                    </CardContent>
                                </Card>
                            )}

                            {/* Step 3: Thumbnail */}
                            {step >= 3 && (
                                <Card className={`transition-all duration-300 animate-in fade-in slide-in-from-bottom-4 bg-card/30 backdrop-blur border-white/10 ${step === 3 ? 'ring-2 ring-primary border-transparent' : ''}`}>
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2 text-white">
                                            <ImageIcon className="w-5 h-5 text-pink-500" /> 3. Thumbnail
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        {!thumbPrompt ? (
                                            <Button
                                                onClick={handleGenerateThumb}
                                                disabled={loading}
                                                variant="secondary"
                                                className="w-full gap-2"
                                            >
                                                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
                                                Gerar Conceito de Thumbnail
                                            </Button>
                                        ) : (
                                            <div className="p-4 bg-black/40 border border-white/10 rounded-lg text-xs text-muted-foreground font-mono">
                                                {thumbPrompt}
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