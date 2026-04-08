import React, { useState } from "react";
import { useFactory } from "./FactoryContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Film, Play, Loader2, Download, Zap } from "lucide-react";
import { RemotionPreview } from "@/remotion/RemotionPreview";
import { useVideoAssembler } from "@/hooks/useVideoAssembler";
import { toast } from "sonner";

export function Editor() {
  const { state, channelId } = useFactory();
  const { assembleVideo, assembling, progress, log } = useVideoAssembler();
  const [videoUrl, setVideoUrl] = useState<string | null>(null);

  const chapters = state.script?.chapters || [];
  const allScenes = chapters.flatMap(ch => 
    ch.scenes.map(s => ({
      ...s,
      chapterId: ch.id,
      audioUrl: ch.audioUrl // Sincronização: Áudio por capítulo no estágio atual do pipeline
    }))
  ).filter(s => s.imageUrl);

  const handleAssemble = async () => {
    if (allScenes.length === 0) {
      toast.error("Nenhuma cena com imagem disponível para montagem.");
      return;
    }

    try {
      const scenes = allScenes.map(s => ({
        imageUrl: s.imageUrl!,
        durationSec: s.durationSec || 5,
        subtitle: s.narration,
        audioUrl: s.audioUrl,
        emotion: (s as any).emotion || "neutral"
      }));

      const url = await assembleVideo(scenes, null);
      setVideoUrl(url);
      toast.success("Vídeo montado com sucesso!");
    } catch (e: any) {
      toast.error(`Falha na Montagem: ${e.message}`);
    }
  };

  if (!state.script) return null;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-black uppercase italic tracking-tighter flex items-center gap-2">
          <Film className="w-5 h-5 text-primary" /> Mesa de Edição
        </h2>
        {assembling && (
          <Badge className="bg-primary text-white animate-pulse">
            Renderizando: {progress}%
          </Badge>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8">
          <Card className="bg-black/60 border-white/10 overflow-hidden rounded-[2rem]">
            <CardHeader className="border-b border-white/5 bg-white/[0.02]">
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <Play className="w-4 h-4 text-primary" /> Pré-visualização
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
               {allScenes.length > 0 ? (
                 <RemotionPreview 
                   slides={allScenes.map(s => ({
                     imageUrl: s.imageUrl!,
                     narration: s.narration,
                     durationSec: s.durationSec || 5,
                     audioUrl: s.audioUrl
                   }))} 
                 />
               ) : (
                 <div className="aspect-video flex items-center justify-center text-white/20 italic">
                   Aguardando ativos visuais...
                 </div>
               )}
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-4 space-y-6">
          <Card className="bg-black/60 border-white/10 rounded-[2rem] border-t-primary/20">
            <CardHeader>
              <CardTitle className="text-xl font-black uppercase italic">Exportar Vídeo</CardTitle>
              <CardDescription>Finalizar renderização e exportar o vídeo.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {assembling && (
                <div className="space-y-2">
                  <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-primary">
                    <span>Processando</span>
                    <span>{progress}%</span>
                  </div>
                  <Progress value={progress} className="h-1 bg-white/5" />
                </div>
              )}

              <Button 
                onClick={handleAssemble} 
                disabled={assembling || allScenes.length === 0}
                className="w-full h-16 bg-gradient-to-r from-primary to-orange-600 rounded-2xl text-lg font-black uppercase italic shadow-2xl hover:scale-[1.02] transition-all"
              >
                {assembling ? <Loader2 className="w-6 h-6 animate-spin" /> : <Zap className="w-5 h-5 mr-2" />}
                {assembling ? "Montando..." : "Iniciar Montagem Final"}
              </Button>

              {videoUrl && (
                <div className="space-y-4 animate-in zoom-in-95 duration-500">
                  <video src={videoUrl} controls className="w-full rounded-2xl border border-primary/30 shadow-[0_0_30px_rgba(var(--primary),0.2)]" />
                  <Button asChild variant="outline" className="w-full rounded-xl border-white/10 font-black uppercase tracking-widest text-[10px]">
                    <a href={videoUrl} download="video_final.webm">
                      <Download className="w-3 h-3 mr-2" /> Baixar Vídeo
                    </a>
                  </Button>
                </div>
              )}

              {log && (
                <div className="p-4 bg-black rounded-xl border border-white/5 font-mono text-[9px] text-white/30 h-32 overflow-y-auto whitespace-pre-wrap">
                  {log}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
