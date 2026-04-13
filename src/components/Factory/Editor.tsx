import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useFactory } from "./FactoryContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Film, Play, Loader2, Download, Zap, CheckCircle } from "lucide-react";
import { RemotionPreview } from "@/remotion/RemotionPreview";
import { useVideoAssembler } from "@/hooks/useVideoAssembler";
import type { AssemblyScene } from "@/hooks/useVideoAssembler";
import { useFFmpegExport } from "@/hooks/useFFmpegExport";
import { useProductionState } from "@/hooks/useProductionState";
import { toast } from "sonner";

export function Editor() {
  const { state, channelId } = useFactory();
  const { assembleVideo, assembling, progress: assemblyProgress, log: assemblyLog } = useVideoAssembler();
  const { exportToMp4, exporting, progress: ffmpegProgress, log: ffmpegLog } = useFFmpegExport();
  const { state: productionState } = useProductionState(channelId);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);

  // ── Fonte de cenas: banco (productionState) tem prioridade sobre memória (state.script) ──
  // Após auto-resume/refresh, state.script é null mas productionState tem as cenas do banco
  const scenesFromProduction: AssemblyScene[] = (productionState?.scenes ?? [])
    .filter(s => s.imageUrl && s.status !== "error")
    .map(s => ({
      imageUrl: s.imageUrl!,
      durationSec: s.durationSec ?? 5,
      subtitle: undefined, // SceneSnapshot não carrega narration — OK para montagem
      audioUrl: s.audioUrl,
      emotion: "neutral",
    }));

  const scenesFromMemory: AssemblyScene[] = (state.script?.chapters ?? []).flatMap(ch =>
    ch.scenes.map(s => ({
      imageUrl: s.imageUrl ?? "",
      durationSec: s.durationSec ?? 5,
      subtitle: s.narration,
      // BUG-101 fix: s.audioUrl (por CENA), não ch.audioUrl (por capítulo)
      audioUrl: s.audioUrl,
      emotion: (s as any).emotion ?? "neutral",
    }))
  ).filter(s => s.imageUrl);

  // Prioridade: banco > memória. Banco é sempre mais atualizado após pipeline assíncrono.
  const allScenes: AssemblyScene[] = scenesFromProduction.length > 0
    ? scenesFromProduction
    : scenesFromMemory;

  // ── Estados de progresso unificados (2 etapas: render + ffmpeg) ──────────────────────
  const isProcessing = assembling || exporting;
  const displayProgress = assembling
    ? Math.round(assemblyProgress * 0.7)        // canvas render: 0–70%
    : exporting
      ? 70 + Math.round(ffmpegProgress * 0.3)   // ffmpeg: 70–100%
      : videoUrl ? 100 : 0;
  const displayLog = assemblyLog || ffmpegLog;
  const displayStage = assembling
    ? "Etapa 1/2: Renderizando..."
    : exporting
      ? "Etapa 2/2: Convertendo MP4..."
      : "";

  // ── Pipeline completo: Canvas WebM → FFmpeg.wasm → MP4 H.264 ──────────────────────
  const handleAssemble = async () => {
    if (allScenes.length === 0) {
      toast.error("Nenhuma cena com imagem disponível para montagem.");
      return;
    }

    try {
      // Etapa 1: Canvas render → WebM (MediaRecorder)
      toast.info("Etapa 1/2: Renderizando cenas no canvas...");
      const webmUrl = await assembleVideo(allScenes);

      // Etapa 2: WebM → MP4 H.264 via FFmpeg.wasm
      toast.info("Etapa 2/2: Convertendo para MP4 (H.264)...");
      const webmBlob = await fetch(webmUrl).then(r => r.blob());
      URL.revokeObjectURL(webmUrl); // liberar memória do WebM intermediário
      const mp4Url = await exportToMp4(webmBlob);

      setVideoUrl(mp4Url);
      toast.success("MP4 exportado com sucesso! Pronto para download.");
    } catch (e: any) {
      toast.error(`Falha na exportação: ${e.message}`);
    }
  };

  if (!state.script && allScenes.length === 0) return null;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-black uppercase italic tracking-tighter flex items-center gap-2">
          <Film className="w-5 h-5 text-primary" /> Mesa de Edição
        </h2>
        {isProcessing && (
          <Badge className="bg-primary text-white animate-pulse">
            {displayStage} {displayProgress}%
          </Badge>
        )}
        {videoUrl && !isProcessing && (
          <Badge className="bg-green-500/20 text-green-400 border border-green-500/30">
            <CheckCircle className="w-3 h-3 mr-1" /> MP4 Pronto
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
                     imageUrl: s.imageUrl,
                     narration: s.subtitle ?? "",
                     durationSec: s.durationSec || 5,
                     audioUrl: s.audioUrl // BUG-101 fix: audioUrl por CENA
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
              <CardDescription>
                {allScenes.length > 0
                  ? `${allScenes.length} cenas prontas · Landscape 16:9 H.264`
                  : "Aguardando cenas do pipeline..."}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {isProcessing && (
                <div className="space-y-2">
                  <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-primary">
                    <span>{displayStage || "Processando"}</span>
                    <span>{displayProgress}%</span>
                  </div>
                  <Progress value={displayProgress} className="h-1 bg-white/5" />
                </div>
              )}

              <Button 
                onClick={handleAssemble} 
                disabled={isProcessing || allScenes.length === 0}
                className="w-full h-16 bg-gradient-to-r from-primary to-orange-600 rounded-2xl text-lg font-black uppercase italic shadow-2xl hover:scale-[1.02] transition-all"
              >
                {isProcessing
                  ? <><Loader2 className="w-6 h-6 animate-spin mr-2" />{displayStage}</>
                  : <><Zap className="w-5 h-5 mr-2" />Iniciar Montagem Final</>
                }
              </Button>

              {videoUrl && (
                <div className="space-y-4 animate-in zoom-in-95 duration-500">
                  <video src={videoUrl} controls className="w-full rounded-2xl border border-primary/30 shadow-[0_0_30px_rgba(var(--primary),0.2)]" />
                  <Button asChild variant="outline" className="w-full rounded-xl border-white/10 font-black uppercase tracking-widest text-[10px]">
                    <a href={videoUrl} download="video_final.mp4">
                      <Download className="w-3 h-3 mr-2" /> Baixar MP4
                    </a>
                  </Button>
                  <Button asChild variant="ghost" className="w-full rounded-xl text-[10px] text-white/40 hover:text-white/70">
                    <Link to={`/channel/${channelId}`}>
                      ← Voltar ao Canal
                    </Link>
                  </Button>
                </div>
              )}

              {displayLog && (
                <div className="p-4 bg-black rounded-xl border border-white/5 font-mono text-[9px] text-white/30 h-32 overflow-y-auto whitespace-pre-wrap">
                  {displayLog}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
