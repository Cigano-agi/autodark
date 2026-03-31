import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "./button";
import { getFriendlyErrorMessage } from "@/utils/errorHandler";
import { Loader2, Sparkles, Video, FileText, CheckCircle, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./card";
import { Label } from "./label";

interface KieGeneratorProps {
    channelId: string | null;
    topic: string | undefined;
    onSuccess?: (result: { script: string; videoUrl?: string }) => void;
}

export function KieGenerator({ channelId, topic, onSuccess }: KieGeneratorProps) {
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState<"idle" | "generating" | "done" | "error">("idle");
    const [result, setResult] = useState<{ script?: string; videoUrl?: string; message?: string } | null>(null);

    const handleGenerate = async () => {
        if (!channelId || !topic) {
            toast.error("Selecione um canal e defina um tópico no Blueprint primeiro.");
            return;
        }

        setLoading(true);
        setStatus("generating");
        setResult(null);
        toast.info("Iniciando geração via Kie.ai Pipeline...");

        try {
            const { data, error } = await supabase.functions.invoke('generate-kie-flow', {
                body: { channelId, topic }
            });

            if (error) throw error;

            if (data?.status === 'error') {
                throw new Error(data.message || "Erro desconhecido na API da Kie.ai");
            }

            setStatus("done");
            setResult(data);
            toast.success("Conteúdo gerado com sucesso via Kie.ai!");

            if (onSuccess && data) {
                onSuccess(data);
            }

        } catch (err: any) {
            console.error(err);
            setStatus("error");
            toast.error(err.message || "Falha ao comunicar com Kie.ai");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card className="border-indigo-500/30 bg-indigo-950/20 backdrop-blur-md overflow-hidden relative">
            <div className="absolute top-0 right-0 p-4 opacity-10">
                <Sparkles className="w-24 h-24 text-indigo-400" />
            </div>

            <CardHeader>
                <CardTitle className="text-indigo-300 flex items-center gap-2">
                    <Sparkles className="w-5 h-5" /> Automação End-to-End (Kie.ai)
                </CardTitle>
                <CardDescription className="text-indigo-200/70">
                    Gere o Roteiro, Imagens e Vídeo com um único clique (MVP).
                </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
                {status === "idle" && (
                    <Button
                        onClick={handleGenerate}
                        disabled={!channelId || !topic}
                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white gap-2 shadow-lg shadow-indigo-900/50"
                    >
                        <Video className="w-4 h-4" />
                        {channelId && topic ? "Gerar Vídeo Completo Agora" : "Defina Tópico no Blueprint para Gerar"}
                    </Button>
                )}

                {status === "generating" && (
                    <div className="flex flex-col items-center justify-center p-6 space-y-4 bg-black/20 rounded-lg border border-white/5">
                        <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
                        <div className="text-center space-y-1">
                            <p className="text-indigo-300 font-medium">Orquestrando IA...</p>
                            <p className="text-xs text-muted-foreground">Isso pode levar alguns minutos se a API estiver renderizando vídeo remoto.</p>
                        </div>
                    </div>
                )}

                {status === "error" && (
                    <div className="p-4 bg-red-950/30 border border-red-500/30 rounded-lg flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                        <div>
                            <p className="text-red-300 text-sm font-medium">Falha na Geração</p>
                            <p className="text-red-200/70 text-xs mt-1">Verifique os logs do console ou a chave de API da Kie.ai.</p>
                            <Button size="sm" variant="outline" className="mt-3 border-red-500/30 text-red-300 hover:bg-red-950" onClick={() => setStatus("idle")}>
                                Tentar Novamente
                            </Button>
                        </div>
                    </div>
                )}

                {status === "done" && result && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
                        <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg flex items-center gap-2 text-green-400 text-sm">
                            <CheckCircle className="w-4 h-4" /> Pipeline concluída.
                        </div>

                        {result.script && (
                            <div className="space-y-2">
                                <Label className="flex items-center gap-2 text-indigo-200"><FileText className="w-4 h-4" /> Roteiro Gerado</Label>
                                <textarea
                                    readOnly
                                    className="w-full h-32 p-3 rounded-md bg-black/40 border border-white/10 text-white/80 text-sm font-mono overflow-y-auto"
                                    value={result.script}
                                />
                            </div>
                        )}

                        {result.videoUrl ? (
                            <div className="space-y-2">
                                <Label className="text-indigo-200">Vídeo Renderizado</Label>
                                <video controls className="w-full rounded-lg border border-white/10 bg-black">
                                    <source src={result.videoUrl} type="video/mp4" />
                                    Seu navegador não suporta a tag de vídeo.
                                </video>
                            </div>
                        ) : (
                            <div className="p-3 bg-white/5 rounded-lg border border-white/10 text-xs text-muted-foreground">
                                Nenhum vídeo retornado. {result.message}
                            </div>
                        )}
                        <Button size="sm" variant="outline" className="w-full border-indigo-500/30 text-indigo-300 hover:bg-indigo-950" onClick={() => setStatus("idle")}>
                            Gerar Outro
                        </Button>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
