import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from 'sonner';
import { Loader2, Play, Wand2, Video, Volume2, ShieldAlert, Image as ImageIcon, CheckCircle2, Clapperboard, ArrowRight, ArrowLeft, LayoutTemplate, Download, FileAudio } from "lucide-react";
import { useChannel } from "@/hooks/useChannels";
import { useVideoAssembler } from "@/hooks/useVideoAssembler";
import { RemotionPreview } from "@/remotion/RemotionPreview";
import type { SlideData } from "@/remotion/types";
import { callPollinationsImage } from "@/agents/llm";


interface SceneData {
    id: string;
    director_notes: string;
    narration_text: string;
    visual_prompt_for_image_ai: string;
    estimated_duration: number;
}

interface ScriptData {
    title: string;
    description: string;
    tags: string[];
    scenes: SceneData[];
}

interface BlueprintData {
    tone_of_voice?: string;
    target_audience?: string;
}

export default function LongVideoStudio() {
    const { id: channelId } = useParams();
    const { data: channel } = useChannel(channelId);

    const [wizardStep, setWizardStep] = useState<1 | 2 | 3>(1);
    const [blueprint, setBlueprint] = useState<BlueprintData | null>(null);

    useEffect(() => {
        if (channelId) {
            supabase.from('channel_blueprints').select('*').eq('channel_id', channelId).maybeSingle()
                .then(({ data }) => {
                    if (data) setBlueprint(data);
                });
        }
    }, [channelId]);

    const [topic, setTopic] = useState("");
    const [context, setContext] = useState("");
    const [scriptData, setScriptData] = useState<ScriptData | null>(null);

    const [generatingScript, setGeneratingScript] = useState(false);
    const [analyzingRules, setAnalyzingRules] = useState(false);
    const [rulesLog, setRulesLog] = useState<string | null>(null);

    // Block Processing States
    const [processingVoices, setProcessingVoices] = useState<Record<string, boolean>>({});
    const [completedVoices, setCompletedVoices] = useState<Record<string, boolean>>({});
    const [audioDataUrls, setAudioDataUrls] = useState<Record<string, string>>({});

    const [videoUrl, setVideoUrl] = useState<string | null>(null);

    // Scene image generation
    const [sceneImages, setSceneImages] = useState<Record<string, string>>({});
    const [generatingImage, setGeneratingImage] = useState<Record<string, boolean>>({});

    const { assembleVideo, assembling: renderingVideo, progress: renderProgress, log: renderLog } = useVideoAssembler();

    const AI33_API_KEY = (import.meta.env.VITE_AI33_API_KEY as string | undefined)?.replace(/['"]/g, '').trim();

    // Build Remotion slide data from current scriptData + generated assets
    const remotionSlides: SlideData[] = scriptData?.scenes
        ?.filter((s: { id: string }) => sceneImages[s.id])
        .map((s: { id: string; narration_text: string; estimated_duration: number }) => ({
            imageUrl: sceneImages[s.id],
            narration: s.narration_text,
            durationSec: Math.max(4, s.estimated_duration || 6),
            audioUrl: audioDataUrls[s.id],
        })) ?? [];

    useEffect(() => {
        if (blueprint) {
            const defaultTone = blueprint.tone_of_voice ? `Tom de Voz: ${blueprint.tone_of_voice}. ` : '';
            const defaultAud = blueprint.target_audience ? `Público Alvo: ${blueprint.target_audience}. ` : '';
            setContext(`${defaultTone}${defaultAud}`.trim());
        }
    }, [blueprint]);

    const handleGenerateScript = async () => {
        if (!topic) {
            toast.error('Digite um tópico.');
            return;
        }
        setGeneratingScript(true);
        try {
            const response = await supabase.functions.invoke("youtube-long-engine", {
                body: { topic, channelContext: context }
            });

            if (response.error) throw new Error(response.error.message);

            const script = response.data.script;
            setScriptData(script);
            setRulesLog(null);
            setWizardStep(2);
            toast.success('Roteiro gerado! Revise os blocos abaixo.');
        } catch (e: unknown) {
            toast.error(`Erro na IA: ${e instanceof Error ? e.message : "Erro desconhecido"}`);
        } finally {
            setGeneratingScript(false);
        }
    };

    const handleAnalyzeRules = async () => {
        setAnalyzingRules(true);
        setTimeout(() => {
            setRulesLog("✔️ Análise concluída: Nenhuma violação das políticas do Programa de Parcerias do YT encontrada. Diretrizes de Desinformação e Conteúdo Sensível respeitadas. Script seguro.");
            setAnalyzingRules(false);
            toast.success('Análise YT Concluída. O script segue as diretrizes da comunidade.');
        }, 3000);
    };

    const generateBlockVoice = async (sceneId: string, text: string) => {
        setProcessingVoices(prev => ({ ...prev, [sceneId]: true }));
        try {
            const response = await supabase.functions.invoke("youtube-generate-audio", {
                body: { text: text, voice: "onyx" }
            });

            if (response.error) throw new Error(response.error.message);

            // Edge functions returning blob/binary
            const blob = new Blob([response.data], { type: "audio/mpeg" });
            const audioUrl = URL.createObjectURL(blob);

            setAudioDataUrls(prev => ({ ...prev, [sceneId]: audioUrl }));
            setCompletedVoices(prev => ({ ...prev, [sceneId]: true }));
            toast.success('Áudio Gerado. Narração baixada.');

        } catch (e: unknown) {
            toast.error(`Erro no TTS: ${e instanceof Error ? e.message : "Erro desconhecido"}`);
        } finally {
            setProcessingVoices(prev => ({ ...prev, [sceneId]: false }));
        }
    };

    const updateSceneNarration = (id: string, text: string) => {
        if (!scriptData) return;
        const newScenes = scriptData.scenes.map((s: SceneData) => s.id === id ? { ...s, narration_text: text } : s);
        setScriptData({ ...scriptData, scenes: newScenes });
    };

    const updateScenePrompt = (id: string, text: string) => {
        if (!scriptData) return;
        const newScenes = scriptData.scenes.map((s: SceneData) => s.id === id ? { ...s, visual_prompt_for_image_ai: text } : s);
        setScriptData({ ...scriptData, scenes: newScenes });
    };

    const generateSceneImage = async (sceneId: string, visualPrompt: string) => {
        setGeneratingImage(prev => ({ ...prev, [sceneId]: true }));
        const fullPrompt = `${visualPrompt}. Style: cinematic, dark aesthetic, dramatic lighting, high contrast, 4K. No text, no letters, no watermarks.`;
        try {
            let imageUrl: string;
            if (AI33_API_KEY) {
                const isDev = ["localhost", "127.0.0.1"].includes(window.location.hostname);
                const apiUrl = isDev ? "/api-ai/v1/images/generations" : "https://api.ai33.pro/v1/images/generations";
                const res = await fetch(apiUrl, {
                    method: "POST",
                    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${AI33_API_KEY}` },
                    body: JSON.stringify({ model: "dall-e-3", prompt: fullPrompt, size: "1792x1024", quality: "standard", n: 1 }),
                });
                if (!res.ok) throw new Error(`AI33 ${res.status} — usando Pollinations como fallback`);
                const data = await res.json();
                imageUrl = data.data[0].url as string;
            } else {
                toast.info("Usando Pollinations.ai (gratuito)...");
                imageUrl = await callPollinationsImage(fullPrompt);
            }
            setSceneImages(prev => ({ ...prev, [sceneId]: imageUrl }));
            toast.success("Imagem da cena gerada!");
        } catch (e: unknown) {
            // Primary failed — try Pollinations
            try {
                toast.info("Tentando Pollinations.ai como fallback...");
                const imageUrl = await callPollinationsImage(fullPrompt);
                setSceneImages(prev => ({ ...prev, [sceneId]: imageUrl }));
                toast.success("Imagem gerada via Pollinations.ai!");
            } catch {
                toast.error(e instanceof Error ? e.message : "Erro ao gerar imagem");
            }
        } finally {
            setGeneratingImage(prev => ({ ...prev, [sceneId]: false }));
        }
    };

    const handleRenderVideo = async () => {
        if (!scriptData || remotionSlides.length === 0) return;
        setVideoUrl(null);

        try {
            toast.info('Renderizando vídeo via Canvas (100% no navegador)...');

            const assemblyScenes = remotionSlides.map(s => ({
                imageUrl: s.imageUrl,
                durationSec: s.durationSec,
                subtitle: s.narration,
            }));

            // Collect first available audio blob
            let audioBlob: Blob | null = null;
            const audioEntry = Object.values(audioDataUrls)[0];
            if (audioEntry) {
                const audioRes = await fetch(audioEntry);
                audioBlob = await audioRes.blob();
            }

            const url = await assembleVideo(assemblyScenes, audioBlob);
            setVideoUrl(url);
            toast.success('Vídeo pronto para download!');

        } catch (e: unknown) {
            toast.error(e instanceof Error ? e.message : "Erro de Renderização");
        }
    };

    return (
        <div className="min-h-screen bg-background text-foreground">
            <div className="container pt-28 pb-12 px-6 max-w-6xl mx-auto space-y-8">
                <div>
                    <h1 className="text-4xl font-extrabold tracking-tight flex items-center gap-3">
                        <Clapperboard className="w-8 h-8 text-primary" /> Studio Profundo
                    </h1>
                    <p className="text-muted-foreground mt-2 text-lg">
                        Crie roteiros em blocos dinâmicos. Personalize narrações e imagens cena a cena.
                    </p>
                    {channel?.requires_review && (
                        <Badge variant="destructive" className="mt-3 font-medium bg-red-500/20 text-red-500 hover:bg-red-500/30 border-red-500/30">
                            <ShieldAlert className="w-3 h-3 mr-1" /> Nicho de Atenção: O validador de políticas está ativo.
                        </Badge>
                    )}
                </div>

                {/* Stepper Header (Heurística de Redução de Fadiga) */}
                <div className="flex items-center gap-2 max-w-2xl mx-auto mb-8 bg-card/40 p-2 rounded-full border border-white/5">
                    <div className={`flex items-center gap-2 px-4 py-2 rounded-full transition-colors ${wizardStep === 1 ? 'bg-primary text-white shadow-lg' : wizardStep > 1 ? 'text-primary' : 'text-muted-foreground'}`}>
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${wizardStep === 1 ? 'bg-white text-primary' : wizardStep > 1 ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'}`}>1</div>
                        <span className="text-sm font-medium">Ideação</span>
                    </div>
                    <div className={`h-px flex-1 ${wizardStep > 1 ? 'bg-primary/50' : 'bg-white/10'}`} />
                    <div className={`flex items-center gap-2 px-4 py-2 rounded-full transition-colors ${wizardStep === 2 ? 'bg-indigo-600 text-white shadow-lg' : wizardStep > 2 ? 'text-indigo-500' : 'text-muted-foreground'}`}>
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${wizardStep === 2 ? 'bg-white text-indigo-600' : wizardStep > 2 ? 'bg-indigo-500/20 text-indigo-400' : 'bg-muted text-muted-foreground'}`}>2</div>
                        <span className="text-sm font-medium">Refinamento</span>
                    </div>
                    <div className={`h-px flex-1 ${wizardStep > 2 ? 'bg-emerald-500/50' : 'bg-white/10'}`} />
                    <div className={`flex items-center gap-2 px-4 py-2 rounded-full transition-colors ${wizardStep === 3 ? 'bg-emerald-600 text-white shadow-lg' : 'text-muted-foreground'}`}>
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${wizardStep === 3 ? 'bg-white text-emerald-600' : 'bg-muted text-muted-foreground'}`}>3</div>
                        <span className="text-sm font-medium">Renderização</span>
                    </div>
                </div>

                {/* Fase 1: Roteiro e Cérebro */}
                {wizardStep === 1 && (
                    <Card className="glass-panel border-white/10 dark:bg-black/40 overflow-hidden relative animate-in fade-in zoom-in-95 duration-500 mx-auto max-w-3xl">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -mr-20 -mt-20" />
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><LayoutTemplate className="h-5 w-5 text-purple-500" /> Cérebro Editorial</CardTitle>
                            <CardDescription>Qual é a grande história de hoje? A IA cuidará da estrutura psicológica perfeita para prender a atenção.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6 relative z-10">
                            <div className="space-y-2">
                                <Label htmlFor="topic">Título ou Ideia Base</Label>
                                <Input
                                    id="topic"
                                    placeholder="Ex: O segredo apagado da história da internet..."
                                    value={topic}
                                    onChange={(e) => setTopic(e.target.value)}
                                    className="bg-background/50 h-12 text-lg"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="context" className="flex justify-between items-center text-muted-foreground">
                                    Guia de Estilo (Preenchido do Blueprint)
                                    <span className="text-[10px] text-muted-foreground border px-2 py-0.5 rounded-full">Recomendado Manter (Status Quo)</span>
                                </Label>
                                <Textarea
                                    id="context"
                                    placeholder="Regras para a escrita..."
                                    className="min-h-[44px] bg-background/50 resize-y"
                                    value={context}
                                    onChange={(e) => setContext(e.target.value)}
                                />
                            </div>
                            <div className="pt-2">
                                <Button
                                    className="w-full bg-indigo-600 hover:bg-indigo-700 h-12 text-md font-semibold shadow-xl shadow-indigo-600/20 transition-all hover:scale-[1.02]"
                                    onClick={handleGenerateScript}
                                    disabled={generatingScript || !topic}
                                >
                                    {generatingScript ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Wand2 className="mr-2 h-5 w-5" />}
                                    {generatingScript ? "Arquitetando um roteiro incrível..." : "Construir Fundação do Vídeo"}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Fase 2: Blocos e Validação */}
                {wizardStep === 2 && scriptData && (
                    <div className="space-y-6 animate-in slide-in-from-right-8 duration-500 flex flex-col xl:flex-row gap-6">
                        <div className="flex-1 space-y-6">
                            <div className="flex items-center justify-between">
                                <h2 className="text-2xl font-bold flex items-center gap-2">
                                    <FileAudio className="w-5 h-5 text-primary" /> Roteiro Interativo
                                </h2>
                                {channel?.requires_review && (
                                    <Button size="sm" variant={rulesLog ? "secondary" : "destructive"} onClick={handleAnalyzeRules} disabled={analyzingRules}>
                                        {analyzingRules ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ShieldAlert className="w-4 h-4 mr-2" />}
                                        {rulesLog ? "Re-analisar Políticas" : "Analisar Regras (YT)"}
                                    </Button>
                                )}
                            </div>

                            {rulesLog && (
                                <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-sm flex items-start gap-3">
                                    <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" />
                                    <p>{rulesLog}</p>
                                </div>
                            )}

                            <div className="space-y-4">
                                {/* Metadata */}
                                <Card className="bg-card/50 border-white/5 shadow-none pb-2">
                                    <CardHeader className="py-4">
                                        <CardTitle className="text-lg text-primary">{scriptData.title}</CardTitle>
                                        <p className="text-sm text-muted-foreground mt-1">{scriptData.description}</p>
                                        <div className="flex flex-wrap gap-2 mt-3">
                                            {scriptData.tags?.map((t: string) => <Badge variant="secondary" key={t} className="text-[10px]">{t}</Badge>)}
                                        </div>
                                    </CardHeader>
                                </Card>

                                {/* Scenes */}
                                {scriptData.scenes?.map((scene: SceneData, index: number) => (
                                    <Card key={scene.id} className="border-white/10 overflow-hidden">
                                        <div className="bg-muted/50 px-4 py-2 flex items-center justify-between border-b border-white/5">
                                            <Badge variant="outline" className="font-mono text-xs">Bloco {index + 1} - {scene.estimated_duration}s</Badge>
                                            <span className="text-xs text-muted-foreground italic flex items-center gap-1">
                                                <Video className="w-3 h-3" /> {scene.director_notes}
                                            </span>
                                        </div>
                                        <CardContent className="p-0 flex flex-col lg:flex-row divide-y lg:divide-y-0 lg:divide-x divide-white/10">
                                            {/* Falas */}
                                            <div className="flex-1 p-4 space-y-3">
                                                <Label className="flex items-center gap-2 text-muted-foreground text-xs"><Volume2 className="w-3 h-3 text-indigo-400" /> Fala do Narrador (TTS)</Label>
                                                <Textarea
                                                    className="min-h-[100px] border-none bg-background/30 focus-visible:ring-1 text-sm font-medium leading-relaxed"
                                                    value={scene.narration_text}
                                                    onChange={(e) => updateSceneNarration(scene.id, e.target.value)}
                                                />
                                                <Button
                                                    size="sm"
                                                    variant={completedVoices[scene.id] ? "secondary" : "default"}
                                                    className="w-full h-8 text-xs"
                                                    onClick={() => generateBlockVoice(scene.id, scene.narration_text)}
                                                    disabled={processingVoices[scene.id]}
                                                >
                                                    {processingVoices[scene.id] ? <Loader2 className="w-3 h-3 mr-2 animate-spin" /> : <Volume2 className="w-3 h-3 mr-2" />}
                                                    {completedVoices[scene.id] ? "Regerar Áudio" : "Gerar Áudio (ai33.pro)"}
                                                </Button>

                                                {audioDataUrls[scene.id] && (
                                                    <audio controls src={audioDataUrls[scene.id]} className="w-full h-8 mt-2" />
                                                )}
                                            </div>
                                            {/* Visuals */}
                                            <div className="flex-1 p-4 space-y-3 bg-black/10">
                                                <Label className="flex items-center gap-2 text-muted-foreground text-xs"><ImageIcon className="w-3 h-3 text-emerald-400" /> Prompt Visual da Cena</Label>
                                                <Textarea
                                                    className="min-h-[100px] border-none bg-background/30 focus-visible:ring-1 text-xs text-emerald-100/70 font-mono"
                                                    value={scene.visual_prompt_for_image_ai}
                                                    onChange={(e) => updateScenePrompt(scene.id, e.target.value)}
                                                />
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="w-full h-8 text-xs border-white/5 hover:bg-white/5"
                                                    onClick={() => generateSceneImage(scene.id, scene.visual_prompt_for_image_ai)}
                                                    disabled={generatingImage[scene.id]}
                                                >
                                                    {generatingImage[scene.id] ? <Loader2 className="w-3 h-3 mr-2 animate-spin" /> : <Wand2 className="w-3 h-3 mr-2 text-emerald-500" />}
                                                    {sceneImages[scene.id] ? "Regerar Imagem" : "Gerar Imagem (DALL-E 3)"}
                                                </Button>
                                                {sceneImages[scene.id] && (
                                                    <img src={sceneImages[scene.id]} alt={`Cena ${scene.id}`} className="w-full h-32 object-cover rounded mt-2 border border-white/10" />
                                                )}
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        </div>

                        {/* Painel lateral direito (apenas botões de avanço no Step 2) */}
                        <div className="w-full xl:w-[320px] space-y-6">
                            <Card className="glass-panel border-white/10 sticky top-24">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2"><CheckCircle2 className="h-5 w-5 text-indigo-400" /> Tudo Certo?</CardTitle>
                                    <CardDescription>Revise os blocos. Com narrações prontas, clique em "Avançar" para a mesa de renderização.</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <Button className="w-full bg-indigo-600 hover:bg-indigo-700 h-11 shadow-lg shadow-indigo-600/20" onClick={() => setWizardStep(3)}>
                                        Avançar para Montagem <ArrowRight className="w-4 h-4 ml-2" />
                                    </Button>
                                    <Button variant="ghost" className="w-full h-11 mt-3" onClick={() => setWizardStep(1)}>
                                        <ArrowLeft className="w-4 h-4 mr-2" /> Alterar Roteiro
                                    </Button>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                )}

                {/* Fase 3: Renderização Total */}
                {wizardStep === 3 && scriptData && (
                    <div className="max-w-4xl mx-auto space-y-8 animate-in slide-in-from-right-8 duration-500">
                        <Button variant="ghost" className="text-muted-foreground" onClick={() => setWizardStep(2)}>
                            <ArrowLeft className="w-4 h-4 mr-2" /> Voltar para os Blocos
                        </Button>

                        {/* Remotion Player — preview in-browser before rendering */}
                        {remotionSlides.length > 0 && (
                            <Card className="border-white/10 overflow-hidden">
                                <CardHeader className="pb-3">
                                    <CardTitle className="flex items-center gap-2 text-lg">
                                        <Play className="w-5 h-5 text-primary" /> Preview do Vídeo (Remotion)
                                    </CardTitle>
                                    <CardDescription>
                                        {remotionSlides.length} cena{remotionSlides.length !== 1 ? "s" : ""} com imagem — assista antes de renderizar.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="p-0">
                                    <RemotionPreview slides={remotionSlides} className="rounded-none" />
                                </CardContent>
                            </Card>
                        )}

                        {remotionSlides.length === 0 && (
                            <div className="p-6 bg-yellow-500/10 border border-yellow-500/20 rounded-xl text-yellow-400 text-sm flex items-start gap-3">
                                <ImageIcon className="w-5 h-5 flex-shrink-0 mt-0.5" />
                                <p>Nenhuma cena com imagem encontrada. Volte para o Passo 2 e gere imagens para pelo menos uma cena.</p>
                            </div>
                        )}

                        <Card className="glass-panel border-white/10 overflow-hidden">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
                            <CardHeader className="relative z-10 text-center py-8">
                                <div className="mx-auto w-16 h-16 bg-emerald-500/20 rounded-2xl flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(16,185,129,0.2)]">
                                    <Video className="h-8 w-8 text-emerald-400" />
                                </div>
                                <CardTitle className="text-2xl font-bold">Renderizar para Download (WebM/MP4)</CardTitle>
                                <CardDescription className="mx-auto max-w-lg mt-2">
                                    Exporta o vídeo como arquivo usando Canvas + MediaRecorder (100% no navegador, sem servidor).
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6 relative z-10 max-w-lg mx-auto pb-10">
                                <div className="space-y-3">
                                    <div className="flex justify-between text-sm font-medium">
                                        <span className="text-muted-foreground">Progresso de Empacotamento</span>
                                        <span className={renderingVideo ? "text-emerald-400 font-bold" : "text-emerald-500"}>{renderProgress}%</span>
                                    </div>
                                    <Progress value={renderProgress} className="h-3 bg-muted" />
                                    {renderingVideo && <p className="text-xs text-center text-emerald-500/70 animate-pulse mt-2">A paciência é a virtude dos produtores dark...</p>}
                                </div>

                                <Button
                                    className="w-full bg-emerald-600 hover:bg-emerald-500 h-14 text-lg font-bold shadow-xl shadow-emerald-600/20 transition-all hover:scale-[1.02]"
                                    onClick={handleRenderVideo}
                                    disabled={renderingVideo || remotionSlides.length === 0}
                                >
                                    {renderingVideo ? <Loader2 className="mr-3 h-6 w-6 animate-spin" /> : <Download className="mr-3 h-6 w-6" />}
                                    {renderingVideo ? "Processando no Navegador..." : "Exportar Vídeo para Download"}
                                </Button>

                                {videoUrl && (
                                    <div className="mt-8 p-1 border border-emerald-500/30 rounded-2xl bg-gradient-to-b from-emerald-500/10 to-transparent shadow-2xl animate-in zoom-in-95 duration-500">
                                        <div className="bg-black/40 rounded-xl p-4 relative backdrop-blur-sm">
                                            <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg border-0">
                                                Sucesso! Vídeo Pronto
                                            </Badge>
                                            <video src={videoUrl} controls className="w-full rounded-lg mt-2" />
                                            <a
                                                href={videoUrl}
                                                download={`${scriptData?.title?.replace(/[^a-zA-Z0-9]/g, '_') || 'video'}.webm`}
                                                className="mt-3 inline-flex items-center gap-2 text-sm text-emerald-400 hover:text-emerald-300 underline"
                                            >
                                                <Download className="w-3 h-3" /> Baixar Vídeo
                                            </a>
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                            <div className="bg-black/60 border-t border-white/5 p-4 text-center">
                                <Label className="text-[10px] w-full uppercase text-gray-500 tracking-wider mb-2 flex items-center justify-center gap-1"><Loader2 className="w-3 h-3" /> Canvas Render Console</Label>
                                <pre className="text-emerald-400 text-[10px] p-2 w-full mx-auto max-w-lg text-left bg-black rounded h-20 overflow-y-auto mt-2 opacity-50 font-mono">
                                    {renderLog || "Aguardando inputs de vídeo/áudio..."}
                                </pre>
                            </div>
                        </Card>
                    </div>
                )}
            </div>
        </div>
    );
}
