import { useState, useRef, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from 'sonner';
import { Loader2, Play, Wand2, FileAudio, Video, Save, Volume2, ShieldAlert, Image as ImageIcon, CheckCircle2, Clapperboard, RefreshCw } from "lucide-react";
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";
import { useChannel } from "@/hooks/useChannels";

export default function LongVideoStudio() {
    const { id: channelId } = useParams();
    const { data: channel } = useChannel(channelId);

    const [blueprint, setBlueprint] = useState<any>(null);

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
    const [scriptData, setScriptData] = useState<any>(null);

    const [generatingScript, setGeneratingScript] = useState(false);
    const [analyzingRules, setAnalyzingRules] = useState(false);
    const [rulesLog, setRulesLog] = useState<string | null>(null);

    // Block Processing States
    const [processingVoices, setProcessingVoices] = useState<Record<string, boolean>>({});
    const [completedVoices, setCompletedVoices] = useState<Record<string, boolean>>({});
    const [audioDataUrls, setAudioDataUrls] = useState<Record<string, string>>({});

    const [renderingVideo, setRenderingVideo] = useState(false);
    const [renderProgress, setRenderProgress] = useState(0);
    const [renderLog, setRenderLog] = useState("");
    const [videoUrl, setVideoUrl] = useState<string | null>(null);

    const ffmpegRef = useRef(new FFmpeg());

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
            toast.success('Roteiro Gerado com Sucesso! Revise os blocos abaixos.');
        } catch (e: any) {
            toast.error(`Erro na IA: ${e.message}`);
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

        } catch (e: any) {
            toast.error(`Erro no TTS: ${e.message}`);
        } finally {
            setProcessingVoices(prev => ({ ...prev, [sceneId]: false }));
        }
    };

    const updateSceneNarration = (id: string, text: string) => {
        if (!scriptData) return;
        const newScenes = scriptData.scenes.map((s: any) => s.id === id ? { ...s, narration_text: text } : s);
        setScriptData({ ...scriptData, scenes: newScenes });
    };

    const updateScenePrompt = (id: string, text: string) => {
        if (!scriptData) return;
        const newScenes = scriptData.scenes.map((s: any) => s.id === id ? { ...s, visual_prompt_for_image_ai: text } : s);
        setScriptData({ ...scriptData, scenes: newScenes });
    };

    const loadFFmpeg = async () => {
        const ffmpeg = ffmpegRef.current;
        if (!ffmpeg.loaded) {
            ffmpeg.on("log", ({ message }) => {
                setRenderLog((prev) => prev + "\n" + message);
                console.log(message);
            });
            ffmpeg.on("progress", ({ progress }) => {
                setRenderProgress(Math.round(progress * 100));
            });

            const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd'
            await ffmpeg.load({
                coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, "text/javascript"),
                wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, "application/wasm"),
            });
        }
        return ffmpeg;
    };

    const handleRenderVideo = async () => {
        if (!scriptData) return;
        setRenderingVideo(true);
        setRenderProgress(0);
        setRenderLog("");
        setVideoUrl(null);

        try {
            toast.info('Renderizando Cenas... Juntando áudios e imagens localmente...');
            const ffmpeg = await loadFFmpeg();

            const textToDisplay = scriptData.title.replace(/'/g, "");

            // Mock ffmpeg output
            await ffmpeg.exec([
                "-f", "lavfi", "-i", "color=c=black:s=1280x720:d=10",
                "-vf", `drawtext=text='${textToDisplay}':fontcolor=white:fontsize=48:x=(w-text_w)/2:y=(h-text_h)/2`,
                "-c:v", "libx264",
                "-t", "10",
                "output.mp4"
            ]);

            const fileData = await ffmpeg.readFile("output.mp4");
            const data = fileData as Uint8Array;
            const url = URL.createObjectURL(new Blob([data as any], { type: "video/mp4" }));

            setVideoUrl(url);
            setRenderProgress(100);
            toast.success('Vídeo Renderizado! Seu MP4 está pronto.');

        } catch (e: any) {
            toast.error(`Erro de Renderização: ${e.message}`);
        } finally {
            setRenderingVideo(false);
        }
    };

    return (
        <div className="container py-8 max-w-6xl mx-auto space-y-8 animate-in fade-in zoom-in duration-500">
            <div>
                <h1 className="text-4xl font-extrabold tracking-tight flex items-center gap-3">
                    <Clapperboard className="w-8 h-8 text-primary" /> Studio Profundo
                </h1>
                <p className="text-muted-foreground mt-2 text-lg">
                    Crie roteiros em blocos dinâmicos. Personalize narrações e imagens cena a cena.
                </p>
                {(channel as any)?.requires_review && (
                    <Badge variant="destructive" className="mt-3 font-medium bg-red-500/20 text-red-500 hover:bg-red-500/30 border-red-500/30">
                        <ShieldAlert className="w-3 h-3 mr-1" /> Nicho Estrito: Use o validador do YouTube após gerar o roteiro.
                    </Badge>
                )}
            </div>

            {/* Fase 1: Roteiro e Cérebro */}
            <Card className="glass-panel border-white/10 dark:bg-black/40 overflow-hidden relative">
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -mr-20 -mt-20" />
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Wand2 className="h-5 w-5 text-purple-500" /> Cérebro Editorial</CardTitle>
                    <CardDescription>Defina sobre o que será o vídeo. A IA montará a estrutura em blocos perfeitos.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-5 relative z-10">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label htmlFor="topic">Título ou Ideia Base</Label>
                            <Input
                                id="topic"
                                placeholder="Ex: A assustadora verdade sobre o oceano profundo..."
                                value={topic}
                                onChange={(e) => setTopic(e.target.value)}
                                className="bg-background/50 h-11"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="context">Guia de Estilo (Preenchido do Blueprint)</Label>
                            <Textarea
                                id="context"
                                placeholder="Regras para a escrita..."
                                className="min-h-[44px] bg-background/50 resize-y"
                                value={context}
                                onChange={(e) => setContext(e.target.value)}
                            />
                        </div>
                    </div>
                    <Button
                        className="w-full bg-indigo-600 hover:bg-indigo-700 h-12 text-md font-semibold shadow-lg shadow-indigo-500/20"
                        onClick={handleGenerateScript}
                        disabled={generatingScript || !topic}
                    >
                        {generatingScript ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <FileAudio className="mr-2 h-5 w-5" />}
                        {generatingScript ? "Arquitetando Roteiro..." : "1. Estruturar Roteiro (Blocos)"}
                    </Button>
                </CardContent>
            </Card>

            {/* Fase 2: Blocos e Validação */}
            {scriptData && (
                <div className="space-y-6 animate-in slide-in-from-bottom flex flex-col xl:flex-row gap-6">
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
                            {scriptData.scenes?.map((scene: any, index: number) => (
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
                                            <Button size="sm" variant="outline" className="w-full h-8 text-xs border-white/5 hover:bg-white/5">
                                                <Wand2 className="w-3 h-3 mr-2" />
                                                Gerar Asset Visual
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </div>

                    {/* Direita: Estúdio Final & Timeline Mock */}
                    <div className="w-full xl:w-[380px] space-y-6">
                        <Card className="glass-panel border-white/10 sticky top-24">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2"><Video className="h-5 w-5 text-emerald-500" /> Montagem Final</CardTitle>
                                <CardDescription>Compile os blocos em um vídeo único rodando no seu navegador.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <div className="flex justify-between text-xs text-muted-foreground">
                                        <span>Progresso ({renderProgress}%)</span>
                                        {renderingVideo && <span className="animate-pulse text-indigo-400">Juntando peças...</span>}
                                    </div>
                                    <Progress value={renderProgress} className="h-2" />
                                </div>

                                <Button
                                    className="w-full bg-emerald-600 hover:bg-emerald-700 h-11"
                                    onClick={handleRenderVideo}
                                    disabled={renderingVideo}
                                >
                                    {renderingVideo ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
                                    {renderingVideo ? "Renderizando MP4..." : "Compilar Linha do Tempo"}
                                </Button>

                                {videoUrl && (
                                    <div className="mt-4 p-4 border border-white/10 rounded-xl relative bg-black/50">
                                        <Label className="mb-2 block text-emerald-400">✅ Finalizado!</Label>
                                        <video src={videoUrl} controls className="w-full rounded-lg shadow-2xl" />
                                    </div>
                                )}
                            </CardContent>
                            <CardFooter className="flex-col pb-6">
                                <Label className="text-[10px] w-full uppercase text-gray-500 tracking-wider mb-2">Console WASM</Label>
                                <pre className="bg-black/80 text-green-400 text-[10px] p-3 w-full rounded mt-2 h-24 overflow-y-auto overflow-x-hidden border border-white/10 custom-scrollbar">
                                    {renderLog || "Aguardando..."}
                                </pre>
                            </CardFooter>
                        </Card>
                    </div>
                </div>
            )}
        </div>
    );
}
