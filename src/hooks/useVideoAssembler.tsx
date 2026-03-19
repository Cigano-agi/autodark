import { useState, useCallback } from "react";

interface AssemblyScene {
  imageUrl: string;
  durationSec: number;
  subtitle?: string;
}

export function useVideoAssembler() {
  const [progress, setProgress] = useState(0);
  const [log, setLog] = useState("");
  const [assembling, setAssembling] = useState(false);

  const assembleVideo = useCallback(
    async (scenes: AssemblyScene[], audioBlob: Blob | null): Promise<string> => {
      setAssembling(true);
      setProgress(0);
      setLog("");

      try {
        const WIDTH = 1280;
        const HEIGHT = 720;
        const FPS = 30;

        const canvas = document.createElement("canvas");
        canvas.width = WIDTH;
        canvas.height = HEIGHT;
        const ctx = canvas.getContext("2d")!;

        // Load all images first
        setLog("[autodark] Carregando imagens...");
        const images: HTMLImageElement[] = [];
        for (let i = 0; i < scenes.length; i++) {
          setLog((prev) => prev + `\n[autodark] Carregando cena ${i + 1}/${scenes.length}...`);
          const img = new Image();
          img.crossOrigin = "anonymous";
          await new Promise<void>((resolve, reject) => {
            img.onload = () => resolve();
            img.onerror = () => reject(new Error(`Falha ao carregar imagem da cena ${i + 1}`));
            img.src = scenes[i].imageUrl;
          });
          images.push(img);
        }

        // Setup MediaRecorder with canvas stream + optional audio
        const stream = canvas.captureStream(FPS);

        if (audioBlob) {
          const audioUrl = URL.createObjectURL(audioBlob);
          const audioEl = new Audio(audioUrl);
          audioEl.loop = true;
          const audioCtx = new AudioContext();
          const source = audioCtx.createMediaElementSource(audioEl);
          const dest = audioCtx.createMediaStreamDestination();
          source.connect(dest);
          dest.stream.getAudioTracks().forEach((track) => stream.addTrack(track));
          audioEl.play();
        }

        const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
          ? "video/webm;codecs=vp9"
          : "video/webm";
        const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 2_500_000 });
        const chunks: Blob[] = [];
        recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };

        const totalDuration = scenes.reduce((sum, s) => sum + s.durationSec, 0);

        setLog((prev) => prev + `\n[autodark] Renderizando ${scenes.length} cenas (${totalDuration}s)...`);

        return await new Promise<string>((resolve, reject) => {
          recorder.onstop = () => {
            const blob = new Blob(chunks, { type: mimeType });
            const url = URL.createObjectURL(blob);
            setProgress(100);
            setLog((prev) => prev + `\n[autodark] Video montado! (${(blob.size / 1024 / 1024).toFixed(1)} MB)`);
            resolve(url);
          };
          recorder.onerror = (e) => reject(e);

          recorder.start(100); // collect data every 100ms

          let elapsed = 0;
          let sceneIdx = 0;
          let sceneElapsed = 0;

          const drawFrame = () => {
            if (sceneIdx >= scenes.length) {
              recorder.stop();
              return;
            }

            // Draw current scene with Ken Burns (subtle zoom over time)
            const img = images[sceneIdx];
            const scale = Math.min(WIDTH / img.naturalWidth, HEIGHT / img.naturalHeight);
            const w = img.naturalWidth * scale;
            const h = img.naturalHeight * scale;

            const zoomProgress = sceneElapsed / scenes[sceneIdx].durationSec;
            const zoom = 1 + zoomProgress * 0.08;
            ctx.save();
            ctx.translate(WIDTH / 2, HEIGHT / 2);
            ctx.scale(zoom, zoom);
            ctx.translate(-WIDTH / 2, -HEIGHT / 2);
            ctx.fillStyle = "#000";
            ctx.fillRect(0, 0, WIDTH, HEIGHT);
            ctx.drawImage(img, (WIDTH - w) / 2, (HEIGHT - h) / 2, w, h);
            ctx.restore();

            // Scene title overlay (first 2 seconds)
            if (sceneElapsed < 2) {
              const alpha = sceneElapsed < 0.5 ? sceneElapsed / 0.5 : sceneElapsed > 1.5 ? (2 - sceneElapsed) / 0.5 : 1;
              ctx.fillStyle = `rgba(0,0,0,${0.5 * alpha})`;
              ctx.fillRect(0, HEIGHT - 80, WIDTH, 80);
              ctx.fillStyle = `rgba(255,140,0,${alpha})`;
              ctx.font = "bold 28px sans-serif";
              ctx.textAlign = "center";
              ctx.fillText(`Cena ${sceneIdx + 1}`, WIDTH / 2, HEIGHT - 35);
            }

            // Subtitles (Yellow) — wraps long text into short animated chunks
            if (scenes[sceneIdx].subtitle) {
              const fullSub = scenes[sceneIdx].subtitle!;
              const words = fullSub.split(" ");
              const CHUNK = 7; // words per subtitle chunk
              const chunks: string[] = [];
              for (let w = 0; w < words.length; w += CHUNK) chunks.push(words.slice(w, w + CHUNK).join(" "));
              const sceneDuration = scenes[sceneIdx].durationSec;
              const chunkDuration = sceneDuration / Math.max(chunks.length, 1);
              const chunkIdx = Math.min(Math.floor(sceneElapsed / chunkDuration), chunks.length - 1);
              const sub = chunks[chunkIdx] || "";

              if (sub) {
                ctx.font = "bold 38px sans-serif";
                ctx.textAlign = "center";
                ctx.textBaseline = "bottom";
                const y = HEIGHT - 60;
                // Background pill for readability
                const metrics = ctx.measureText(sub);
                const pad = 20;
                ctx.fillStyle = "rgba(0,0,0,0.55)";
                ctx.beginPath();
                ctx.roundRect(WIDTH / 2 - metrics.width / 2 - pad, y - 50, metrics.width + pad * 2, 58, 8);
                ctx.fill();
                // Yellow text with black stroke
                ctx.strokeStyle = "rgba(0,0,0,0.9)";
                ctx.lineWidth = 5;
                ctx.strokeText(sub, WIDTH / 2, y);
                ctx.fillStyle = "#FFFF00";
                ctx.fillText(sub, WIDTH / 2, y);
              }
            }

            sceneElapsed += 1 / FPS;
            elapsed += 1 / FPS;

            setProgress(Math.round((elapsed / totalDuration) * 100));

            if (sceneElapsed >= scenes[sceneIdx].durationSec) {
              sceneIdx++;
              sceneElapsed = 0;
            }

            requestAnimationFrame(drawFrame);
          };

          requestAnimationFrame(drawFrame);
        });
      } catch (e) {
        setLog((prev) => prev + `\n[autodark] ERRO: ${e instanceof Error ? e.message : "Erro desconhecido"}`);
        throw e;
      } finally {
        setAssembling(false);
      }
    },
    []
  );

  return { assembleVideo, assembling, progress, log };
}
