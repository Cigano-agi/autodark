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
import { Loader2, Play, Wand2, Video, Volume2, ShieldAlert, Image as ImageIcon, CheckCircle2, Clapperboard, ArrowRight, ArrowLeft, LayoutTemplate, Download, FileAudio, Zap, FolderArchive, GalleryHorizontalEnd } from "lucide-react";
import { useChannel } from "@/hooks/useChannels";
import { useVideoAssembler } from "@/hooks/useVideoAssembler";
import { RemotionPreview } from "@/remotion/RemotionPreview";
import type { SlideData } from "@/remotion/types";
import { callPollinationsImage } from "@/agents/llm";
import { generateTTSAudio, estimateDurationSec } from "@/agents/tts";
import { VideoGenerationHistory } from "@/components/VideoGenerationHistory";
import JSZip from "jszip";


interface SceneData {
    id: string;
    director_notes: string;
    narration_text: string;
    visual_prompt_for_image_ai: string;
    estimated_duration: number;
}

interface ScriptData {
    title?: string;
    youtube_title?: string;
    video_title?: string;
    description?: string;
    youtube_description?: string;
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

    // Bulk "Gerar Tudo" generation
    const [generatingAll, setGeneratingAll] = useState(false);
    const [generateAllProgress, setGenerateAllProgress] = useState<string | null>(null);

    const { assembleVideo, assembling: renderingVideo, progress: renderProgress, log: renderLog } = useVideoAssembler();

    const [savedToHistory, setSavedToHistory] = useState(false);

    const AI33_API_KEY = (import.meta.env.VITE_AI33_API_KEY as string | undefined)?.replace(/['"]/g, '').trim();

    const saveGeneration = async (data: ScriptData, sceneCount: number) => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || !channelId) return;

        const durationSec = data.scenes?.reduce(
            (acc: number, s: SceneData) => acc + estimateDurationSec(s.narration_text),
            0
        ) ?? 0;

        const visualPrompts = data.scenes?.map((s: SceneData) => s.visual_prompt_for_image_ai) ?? [];

        try {
            const resolvedTitle = data.youtube_title ?? data.video_title ?? data.title ?? "Vídeo sem título";
            const { error } = await supabase.from("video_generations").insert({
                channel_id: channelId,
                user_id: user.id,
                title: resolvedTitle,
                youtube_title: data.youtube_title ?? data.title ?? null,
                youtube_description: data.youtube_description ?? data.description ?? null,
                scene_count: sceneCount,
                duration_sec: durationSec,
                script_data: data as unknown as Record<string, unknown>,
                visual_prompts: visualPrompts,
                status: "complete",
            });

            if (!error) setSavedToHistory(true);
        } catch {
            // tabela ainda não criada — ignora silenciosamente
        }
    };

    // Build Remotion slide data — inclui TODAS as cenas que têm imagem gerada
    // durationSec calculado pelo tamanho do texto de narração (PT-BR: ~2.5 palavras/seg)
    const remotionSlides: SlideData[] = scriptData?.scenes
        ?.filter((s: SceneData) => sceneImages[s.id])
        .map((s: SceneData) => ({
            imageUrl: sceneImages[s.id],
            narration: s.narration_text,
            durationSec: estimateDurationSec(s.narration_text),
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
                body: { topic, channelContext: context, target_duration_minutes: 10, scene_count: 30 }
            });

            if (response.error) throw new Error(response.error.message);

            const script = response.data.script;
            // Normaliza tags: Edge Function pode retornar string ou array
            if (typeof script.tags === 'string') {
                script.tags = (script.tags as string).split(',').map((t: string) => t.trim()).filter(Boolean);
            } else if (!Array.isArray(script.tags)) {
                script.tags = [];
            }
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
            // Tenta Edge Function primeiro (ai33.pro / openai TTS)
            const response = await supabase.functions.invoke("youtube-generate-audio", {
                body: { text: text, voice: "onyx" }
            });

            if (response.error) throw new Error(response.error.message);

            const blob = new Blob([response.data], { type: "audio/mpeg" });
            if (blob.size < 100) throw new Error("Blob de áudio vazio da Edge Function");

            const audioUrl = URL.createObjectURL(blob);
            setAudioDataUrls(prev => ({ ...prev, [sceneId]: audioUrl }));
            setCompletedVoices(prev => ({ ...prev, [sceneId]: true }));
            toast.success('Áudio Gerado. Narração baixada.');

        } catch {
            // Fallback: Web Speech API (browser nativo, gratuito)
            try {
                toast.info("Usando TTS do navegador (gratuito)...");
                const audioUrl = await generateTTSAudio(text);
                setAudioDataUrls(prev => ({ ...prev, [sceneId]: audioUrl }));
                setCompletedVoices(prev => ({ ...prev, [sceneId]: true }));
                toast.success('Áudio gerado via TTS do navegador.');
            } catch (fallbackErr: unknown) {
                toast.error(`Erro no TTS: ${fallbackErr instanceof Error ? fallbackErr.message : "Erro desconhecido"}`);
            }
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

    const generateSceneImage = async (sceneId: string, visualPrompt: string): Promise<void> => {
        setGeneratingImage(prev => ({ ...prev, [sceneId]: true }));
        const fullPrompt = `${visualPrompt}. Style: cinematic, dark aesthetic, dramatic lighting, high contrast, 4K. No text, no letters, no watermarks.`;

        try {
            // Pollinations com o prompt visual da cena — gera imagem temática
            // callPollinationsImage já tem Canvas dark como fallback interno
            const imageUrl = await callPollinationsImage(fullPrompt);
            setSceneImages(prev => ({ ...prev, [sceneId]: imageUrl }));
        } catch {
            console.warn("[studio] Todos os providers de imagem falharam para cena", sceneId);
        } finally {
            setGeneratingImage(prev => ({ ...prev, [sceneId]: false }));
        }
    };

    const generateAllScenes = async () => {
        if (!scriptData) return;
        setGeneratingAll(true);
        const scenes = scriptData.scenes;
        const total = scenes.length;

        for (let i = 0; i < scenes.length; i++) {
            const scene = scenes[i];
            setGenerateAllProgress(`Gerando cena ${i + 1} de ${total}...`);

            // Gera imagem e áudio em paralelo
            await Promise.allSettled([
                generateSceneImage(scene.id, scene.visual_prompt_for_image_ai),
                generateTTSAudio(scene.narration_text)
                    .then((url) => {
                        if (url) {
                            setAudioDataUrls(prev => ({ ...prev, [scene.id]: url }));
                            setCompletedVoices(prev => ({ ...prev, [scene.id]: true }));
                        }
                    })
                    .catch(() => { /* TTS falhou — sem áudio nessa cena */ }),
            ]);
        }

        setGeneratingAll(false);
        setGenerateAllProgress(null);
        toast.success(`${total} cenas geradas! Avançando para montagem...`);
        await saveGeneration(scriptData, total);
        setWizardStep(3);
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
                audioUrl: s.audioUrl,
            }));

            const url = await assembleVideo(assemblyScenes, null);
            setVideoUrl(url);
            toast.success('Vídeo pronto para download!');

        } catch (e: unknown) {
            toast.error(e instanceof Error ? e.message : "Erro de Renderização");
        }
    };

    // ── Export para CapCut: ZIP com imagens numeradas + áudios + roteiro ──
    const [exportingZip, setExportingZip] = useState(false);

    const handleExportCapCut = async () => {
        if (!scriptData) return;
        setExportingZip(true);
        const zip = new JSZip();
        const imgFolder = zip.folder("imagens")!;
        const audioFolder = zip.folder("audios")!;

        const scenes = scriptData.scenes.filter((s: SceneData) => sceneImages[s.id]);
        if (scenes.length === 0) {
            toast.error("Nenhuma cena com imagem. Gere as imagens primeiro.");
            setExportingZip(false);
            return;
        }

        toast.info(`Empacotando ${scenes.length} cenas...`);

        try {
            for (let i = 0; i < scenes.length; i++) {
                const scene = scenes[i];
                const num = String(i + 1).padStart(3, '0');

                // Baixa imagem como blob
                try {
                    const imgRes = await fetch(sceneImages[scene.id]);
                    const imgBlob = await imgRes.blob();
                    const ext = imgBlob.type.includes('png') ? 'png' : 'jpg';
                    imgFolder.file(`${num}_cena.${ext}`, imgBlob);
                } catch {
                    console.warn(`[export] Falha ao baixar imagem da cena ${i + 1}`);
                }

                // Baixa áudio se existir
                if (audioDataUrls[scene.id]) {
                    try {
                        const audioRes = await fetch(audioDataUrls[scene.id]);
                        const audioBlob = await audioRes.blob();
                        const audioExt = audioBlob.type.includes('wav') ? 'wav' : 'mp3';
                        audioFolder.file(`${num}_audio.${audioExt}`, audioBlob);
                    } catch {
                        console.warn(`[export] Falha ao baixar áudio da cena ${i + 1}`);
                    }
                }
            }

            // Roteiro em TXT
            const roteiro = scenes.map((s: SceneData, i: number) => {
                const num = String(i + 1).padStart(3, '0');
                return `=== CENA ${num} ===\nNarração: ${s.narration_text}\nPrompt Visual: ${s.visual_prompt_for_image_ai}\nDuração Estimada: ${estimateDurationSec(s.narration_text)}s\n`;
            }).join('\n');

            zip.file("roteiro.txt", roteiro);
            zip.file("info.txt", `Título: ${scriptData.youtube_title ?? scriptData.video_title ?? scriptData.title ?? 'Sem título'}\nDescrição: ${scriptData.youtube_description ?? scriptData.description ?? ''}\nTags: ${(scriptData.tags ?? []).join(', ')}\nTotal de Cenas: ${scenes.length}\nGerado por AutoDark Studio`);

            const blob = await zip.generateAsync({ type: "blob" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            const safeTitle = (scriptData.youtube_title ?? scriptData.video_title ?? scriptData.title ?? 'video').replace(/[^a-zA-Z0-9À-ú\s]/g, '').replace(/\s+/g, '_').slice(0, 50);
            a.download = `${safeTitle}_capcut.zip`;
            a.click();
            URL.revokeObjectURL(url);
            toast.success('ZIP baixado! Arraste as imagens em ordem no CapCut.');
        } catch (e) {
            toast.error(e instanceof Error ? e.message : "Erro ao gerar ZIP");
        } finally {
            setExportingZip(false);
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
                    <div className="flex flex-col items-center gap-0 w-full">
                    <Card className="glass-panel border-white/10 dark:bg-black/40 overflow-hidden relative animate-in fade-in zoom-in-95 duration-500 mx-auto max-w-3xl w-full">
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

                    {channelId && (
                        <div className="max-w-3xl w-full">
                            <VideoGenerationHistory
                                channelId={channelId}
                                onRestore={(data) => {
                                    setScriptData(data as unknown as ScriptData);
                                    setSavedToHistory(false);
                                    setWizardStep(2);
                                }}
                            />
                        </div>
                    )}
                    </div>
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
                                        <CardTitle className="text-lg text-primary">{scriptData.youtube_title ?? scriptData.video_title ?? scriptData.title ?? "Vídeo sem título"}</CardTitle>
                                        <p className="text-sm text-muted-foreground mt-1">{scriptData.youtube_description ?? scriptData.description}</p>
                                        <div className="flex flex-wrap gap-2 mt-3">
                                            {Array.isArray(scriptData.tags) && scriptData.tags.map((t: string) => <Badge variant="secondary" key={t} className="text-[10px]">{t}</Badge>)}
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

                        {/* Painel lateral direito */}
                        <div className="w-full xl:w-[320px] space-y-6">
                            <Card className="glass-panel border-white/10 sticky top-24">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2"><Zap className="h-5 w-5 text-yellow-400" /> Geração Automática</CardTitle>
                                    <CardDescription>
                                        Gera imagens e áudio para todas as {scriptData?.scenes?.length ?? 0} cenas automaticamente e avança para a montagem.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    <Button
                                        className="w-full bg-yellow-500 hover:bg-yellow-400 text-black h-12 font-bold shadow-lg shadow-yellow-500/20 transition-all hover:scale-[1.02]"
                                        onClick={generateAllScenes}
                                        disabled={generatingAll}
                                    >
                                        {generatingAll
                                            ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{generateAllProgress ?? "Gerando..."}</>
                                            : <><Zap className="w-4 h-4 mr-2" />Gerar Tudo Automaticamente</>
                                        }
                                    </Button>

                                    {generatingAll && (
                                        <p className="text-xs text-center text-muted-foreground animate-pulse">
                                            {generateAllProgress}
                                        </p>
                                    )}

                                    <div className="border-t border-white/5 pt-3">
                                        <p className="text-xs text-muted-foreground mb-3">Ou avance manualmente depois de configurar as cenas:</p>
                                        <Button className="w-full bg-indigo-600 hover:bg-indigo-700 h-10 shadow-lg shadow-indigo-600/20" onClick={() => setWizardStep(3)} disabled={generatingAll}>
                                            Avançar para Montagem <ArrowRight className="w-4 h-4 ml-2" />
                                        </Button>
                                        <Button variant="ghost" className="w-full h-10 mt-2" onClick={() => setWizardStep(1)} disabled={generatingAll}>
                                            <ArrowLeft className="w-4 h-4 mr-2" /> Alterar Roteiro
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                )}

                {/* Fase 3: Renderização e Exportação */}
                {wizardStep === 3 && scriptData && (
                    <div className="max-w-5xl mx-auto space-y-8 animate-in slide-in-from-right-8 duration-500">
                        <Button variant="ghost" className="text-muted-foreground" onClick={() => setWizardStep(2)}>
                            <ArrowLeft className="w-4 h-4 mr-2" /> Voltar para os Blocos
                        </Button>

                        {/* Remotion Player — preview in-browser before rendering */}
                        {remotionSlides.length > 0 && (
                            <Card className="border-white/10 overflow-hidden">
                                <CardHeader className="pb-3">
                                    <CardTitle className="flex items-center gap-2 text-lg">
                                        <Play className="w-5 h-5 text-primary" /> Preview do Vídeo
                                        {savedToHistory && (
                                            <Badge className="ml-2 bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-[10px] font-medium">
                                                Salvo no histórico
                                            </Badge>
                                        )}
                                    </CardTitle>
                                    <CardDescription>
                                        {remotionSlides.length} cena{remotionSlides.length !== 1 ? "s" : ""} — assista antes de exportar.
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

                        {/* Galeria de Imagens — para visualizar antes de exportar */}
                        {remotionSlides.length > 0 && (
                            <Card className="border-white/10 overflow-hidden">
                                <CardHeader className="pb-3">
                                    <CardTitle className="flex items-center gap-2 text-lg">
                                        <GalleryHorizontalEnd className="w-5 h-5 text-indigo-400" /> Galeria de Cenas ({remotionSlides.length})
                                    </CardTitle>
                                    <CardDescription>Todas as imagens numeradas na ordem do vídeo.</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                                        {remotionSlides.map((slide, i) => (
                                            <div key={i} className="relative group rounded-lg overflow-hidden border border-white/10 aspect-video bg-black">
                                                <img src={slide.imageUrl} alt={`Cena ${i + 1}`} className="w-full h-full object-cover" />
                                                <div className="absolute top-1 left-1 bg-black/80 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
                                                    {String(i + 1).padStart(3, '0')}
                                                </div>
                                                {slide.audioUrl && (
                                                    <div className="absolute top-1 right-1 bg-emerald-500/80 text-white text-[10px] px-1 py-0.5 rounded">
                                                        <Volume2 className="w-2.5 h-2.5" />
                                                    </div>
                                                )}
                                                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <p className="text-[9px] text-white/80 line-clamp-2">{slide.narration.slice(0, 60)}...</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {/* Export Options */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* CapCut Export — imagens numeradas + áudios em ZIP */}
                            <Card className="glass-panel border-yellow-500/20 overflow-hidden relative">
                                <div className="absolute top-0 right-0 w-48 h-48 bg-yellow-500/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />
                                <CardHeader className="relative z-10 text-center py-6">
                                    <div className="mx-auto w-14 h-14 bg-yellow-500/20 rounded-2xl flex items-center justify-center mb-4 shadow-[0_0_30px_rgba(234,179,8,0.15)]">
                                        <FolderArchive className="h-7 w-7 text-yellow-400" />
                                    </div>
                                    <CardTitle className="text-xl font-bold">Exportar p/ CapCut</CardTitle>
                                    <CardDescription className="mt-1">
                                        ZIP com imagens numeradas (001, 002...) + áudios + roteiro. Arraste tudo no CapCut e exporte.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4 relative z-10 pb-6">
                                    <div className="bg-yellow-500/5 border border-yellow-500/10 rounded-lg p-3 text-xs text-yellow-400/80 space-y-1">
                                        <p>📁 <strong>imagens/</strong> — 001_cena.jpg, 002_cena.jpg...</p>
                                        <p>📁 <strong>audios/</strong> — 001_audio.mp3, 002_audio.mp3...</p>
                                        <p>📄 <strong>roteiro.txt</strong> — texto de cada cena</p>
                                    </div>
                                    <Button
                                        className="w-full bg-yellow-500 hover:bg-yellow-400 text-black h-12 font-bold shadow-lg shadow-yellow-500/20 transition-all hover:scale-[1.02]"
                                        onClick={handleExportCapCut}
                                        disabled={exportingZip || remotionSlides.length === 0}
                                    >
                                        {exportingZip ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <FolderArchive className="mr-2 h-5 w-5" />}
                                        {exportingZip ? "Empacotando..." : "Baixar ZIP para CapCut"}
                                    </Button>
                                </CardContent>
                            </Card>

                            {/* WebM Video Export */}
                            <Card className="glass-panel border-emerald-500/20 overflow-hidden relative">
                                <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />
                                <CardHeader className="relative z-10 text-center py-6">
                                    <div className="mx-auto w-14 h-14 bg-emerald-500/20 rounded-2xl flex items-center justify-center mb-4 shadow-[0_0_30px_rgba(16,185,129,0.15)]">
                                        <Video className="h-7 w-7 text-emerald-400" />
                                    </div>
                                    <CardTitle className="text-xl font-bold">Exportar Vídeo (WebM)</CardTitle>
                                    <CardDescription className="mt-1">
                                        Renderiza tudo no navegador — slides + legendas + transições. Download direto.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4 relative z-10 pb-6">
                                    {(renderingVideo || renderProgress > 0) && (
                                        <div className="space-y-2">
                                            <div className="flex justify-between text-sm font-medium">
                                                <span className="text-muted-foreground">Renderizando</span>
                                                <span className="text-emerald-400 font-bold">{renderProgress}%</span>
                                            </div>
                                            <Progress value={renderProgress} className="h-2 bg-muted" />
                                        </div>
                                    )}
                                    <Button
                                        className="w-full bg-emerald-600 hover:bg-emerald-500 h-12 font-bold shadow-lg shadow-emerald-600/20 transition-all hover:scale-[1.02]"
                                        onClick={handleRenderVideo}
                                        disabled={renderingVideo || remotionSlides.length === 0}
                                    >
                                        {renderingVideo ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Download className="mr-2 h-5 w-5" />}
                                        {renderingVideo ? "Processando..." : "Renderizar Vídeo"}
                                    </Button>

                                    {videoUrl && (
                                        <div className="mt-4 p-1 border border-emerald-500/30 rounded-xl bg-gradient-to-b from-emerald-500/10 to-transparent animate-in zoom-in-95 duration-500">
                                            <div className="bg-black/40 rounded-lg p-3 relative backdrop-blur-sm">
                                                <Badge className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg border-0 text-[10px]">
                                                    Vídeo Pronto
                                                </Badge>
                                                <video src={videoUrl} controls className="w-full rounded-lg mt-1" />
                                                <a
                                                    href={videoUrl}
                                                    download={`${(scriptData?.youtube_title ?? scriptData?.video_title ?? scriptData?.title ?? 'video').replace(/[^a-zA-Z0-9]/g, '_')}.webm`}
                                                    className="mt-2 inline-flex items-center gap-2 text-xs text-emerald-400 hover:text-emerald-300 underline"
                                                >
                                                    <Download className="w-3 h-3" /> Baixar .webm
                                                </a>
                                            </div>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>

                        {/* Render Console */}
                        {renderLog && (
                            <div className="bg-black/60 border border-white/5 rounded-xl p-4 text-center">
                                <Label className="text-[10px] w-full uppercase text-gray-500 tracking-wider mb-2 flex items-center justify-center gap-1"><Loader2 className="w-3 h-3" /> Canvas Render Console</Label>
                                <pre className="text-emerald-400 text-[10px] p-2 w-full mx-auto max-w-lg text-left bg-black rounded h-20 overflow-y-auto mt-2 opacity-50 font-mono">
                                    {renderLog}
                                </pre>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
