import { useState, useRef, useCallback } from "react";
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { toBlobURL, fetchFile } from "@ffmpeg/util";

interface ExportState {
  exporting: boolean;
  progress: number;
  log: string;
  error: string | null;
}

export function useFFmpegExport() {
  const [state, setState] = useState<ExportState>({
    exporting: false,
    progress: 0,
    log: "",
    error: null,
  });
  const ffmpegRef = useRef<FFmpeg | null>(null);

  const appendLog = (msg: string) => {
    setState(prev => ({ ...prev, log: prev.log + msg + "\n" }));
  };

  const loadFFmpeg = async (): Promise<FFmpeg> => {
    if (ffmpegRef.current?.loaded) return ffmpegRef.current;

    const ffmpeg = new FFmpeg();
    ffmpeg.on("log", ({ message }) => appendLog(message));
    ffmpeg.on("progress", ({ progress }) => {
      setState(prev => ({ ...prev, progress: Math.round(progress * 100) }));
    });

    const baseURL = "https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm";
    await ffmpeg.load({
      coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, "text/javascript"),
      wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, "application/wasm"),
    });

    ffmpegRef.current = ffmpeg;
    return ffmpeg;
  };

  /**
   * Export a WebM blob to MP4 (H.264 + AAC).
   * Accepts an existing WebM blob (from the current assembler/recorder).
   */
  const exportToMp4 = useCallback(async (webmBlob: Blob): Promise<string> => {
    setState({ exporting: true, progress: 0, log: "", error: null });

    try {
      appendLog("Carregando FFmpeg...");
      const ffmpeg = await loadFFmpeg();

      appendLog("Escrevendo input...");
      const inputData = await fetchFile(webmBlob);
      await ffmpeg.writeFile("input.webm", inputData);

      appendLog("Convertendo para MP4 (H.264)...");
      await ffmpeg.exec([
        "-i", "input.webm",
        "-c:v", "libx264",
        "-preset", "fast",
        "-crf", "23",
        "-c:a", "aac",
        "-b:a", "128k",
        "-movflags", "+faststart",
        "-pix_fmt", "yuv420p",
        "output.mp4",
      ]);

      const data = await ffmpeg.readFile("output.mp4");
      const mp4Blob = new Blob([data], { type: "video/mp4" });
      const url = URL.createObjectURL(mp4Blob);

      // Cleanup
      await ffmpeg.deleteFile("input.webm");
      await ffmpeg.deleteFile("output.mp4");

      appendLog(`MP4 gerado! Tamanho: ${(mp4Blob.size / (1024 * 1024)).toFixed(1)} MB`);
      setState(prev => ({ ...prev, exporting: false, progress: 100 }));
      return url;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro desconhecido no FFmpeg";
      setState(prev => ({ ...prev, exporting: false, error: msg }));
      throw err;
    }
  }, []);

  /**
   * Encode frames (as image blobs) + audio blob into MP4.
   * This is the "from scratch" path for Remotion-captured frames.
   */
  const exportFramesToMp4 = useCallback(async (
    frames: Blob[],
    audioBlob: Blob | null,
    fps: number = 30,
  ): Promise<string> => {
    setState({ exporting: true, progress: 0, log: "", error: null });

    try {
      appendLog("Carregando FFmpeg...");
      const ffmpeg = await loadFFmpeg();

      // Write all frame images
      appendLog(`Escrevendo ${frames.length} frames...`);
      for (let i = 0; i < frames.length; i++) {
        const frameData = await fetchFile(frames[i]);
        const paddedIdx = String(i).padStart(6, "0");
        await ffmpeg.writeFile(`frame_${paddedIdx}.png`, frameData);

        if (i % 30 === 0) {
          setState(prev => ({
            ...prev,
            progress: Math.round((i / frames.length) * 40),
          }));
        }
      }

      // Write audio if present
      if (audioBlob) {
        appendLog("Escrevendo áudio...");
        const audioData = await fetchFile(audioBlob);
        await ffmpeg.writeFile("audio.mp3", audioData);
      }

      appendLog("Encodando MP4...");
      const args = [
        "-framerate", String(fps),
        "-i", "frame_%06d.png",
      ];

      if (audioBlob) {
        args.push("-i", "audio.mp3");
      }

      args.push(
        "-c:v", "libx264",
        "-preset", "fast",
        "-crf", "23",
        "-pix_fmt", "yuv420p",
      );

      if (audioBlob) {
        args.push("-c:a", "aac", "-b:a", "128k");
      }

      args.push("-movflags", "+faststart", "output.mp4");

      await ffmpeg.exec(args);

      const data = await ffmpeg.readFile("output.mp4");
      const mp4Blob = new Blob([data], { type: "video/mp4" });
      const url = URL.createObjectURL(mp4Blob);

      // Cleanup
      for (let i = 0; i < frames.length; i++) {
        const paddedIdx = String(i).padStart(6, "0");
        await ffmpeg.deleteFile(`frame_${paddedIdx}.png`);
      }
      await ffmpeg.deleteFile("output.mp4");
      if (audioBlob) await ffmpeg.deleteFile("audio.mp3");

      appendLog(`MP4 gerado! Tamanho: ${(mp4Blob.size / (1024 * 1024)).toFixed(1)} MB`);
      setState(prev => ({ ...prev, exporting: false, progress: 100 }));
      return url;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro desconhecido no FFmpeg";
      setState(prev => ({ ...prev, exporting: false, error: msg }));
      throw err;
    }
  }, []);

  return {
    exportToMp4,
    exportFramesToMp4,
    ...state,
  };
}
