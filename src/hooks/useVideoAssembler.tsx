import { useState, useCallback } from "react";

export interface AssemblyScene {
  imageUrl: string;
  durationSec: number;
  subtitle?: string;
  emotion?: string;
  audioUrl?: string;
}

// ── Motion by emotion (mirrors n8n pipeline getMotionByEmotion) ──────────────
function getMotion(emotion: string | undefined): { style: string; zoom?: number } {
  switch (emotion) {
    case "urgency":     return { style: "zoom", zoom: 1.15 };
    case "shock":       return { style: "zoom", zoom: 1.20 };
    case "motivation":  return { style: "zoom", zoom: 1.08 };
    case "curiosity":   return { style: "panLeft" };
    case "inspiration": return { style: "panRight" };
    default:            return { style: "zoom", zoom: 1.08 };
  }
}

// ── Draw a single scene image with its motion applied ────────────────────────
function drawSceneImage(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  motion: { style: string; zoom?: number },
  progress: number,           // 0→1 within this scene
  W: number,
  H: number,
) {
  const scale = Math.min(W / img.naturalWidth, H / img.naturalHeight);
  // Slightly over-scale so pan/zoom never reveals black edges
  const overscale = 1.22;
  const w = img.naturalWidth  * scale * overscale;
  const h = img.naturalHeight * scale * overscale;

  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, W, H);

  if (motion.style === "panLeft") {
    const maxPan = (w - W) / 2;
    const panX = (W - w) / 2 + maxPan * progress;
    ctx.drawImage(img, panX, (H - h) / 2, w, h);
  } else if (motion.style === "panRight") {
    const maxPan = (w - W) / 2;
    const panX = (W - w) / 2 - maxPan * progress;
    ctx.drawImage(img, panX, (H - h) / 2, w, h);
  } else {
    // Zoom in
    const targetZoom = motion.zoom ?? 1.08;
    const zoom = 1 + progress * (targetZoom - 1);
    ctx.save();
    ctx.translate(W / 2, H / 2);
    ctx.scale(zoom, zoom);
    ctx.translate(-W / 2, -H / 2);
    ctx.drawImage(img, (W - w) / 2, (H - h) / 2, w, h);
    ctx.restore();
  }
}

// ── Cinematic vignette overlay ────────────────────────────────────────────────
function drawVignette(ctx: CanvasRenderingContext2D, W: number, H: number) {
  const grad = ctx.createRadialGradient(W / 2, H / 2, H * 0.25, W / 2, H / 2, H * 0.85);
  grad.addColorStop(0, "rgba(0,0,0,0)");
  grad.addColorStop(1, "rgba(0,0,0,0.55)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);
}

// ── Subtitle rendering ────────────────────────────────────────────────────────
function drawSubtitles(
  ctx: CanvasRenderingContext2D,
  subtitle: string,
  sceneElapsed: number,
  durationSec: number,
  W: number,
  H: number,
) {
  const words = subtitle.split(" ").filter(Boolean);
  const CHUNK = 4; // 4 words per chunk — matches TikTok/Shorts style
  const chunks: string[] = [];
  for (let i = 0; i < words.length; i += CHUNK)
    chunks.push(words.slice(i, i + CHUNK).join(" "));

  const chunkDuration = durationSec / Math.max(chunks.length, 1);
  const chunkIdx = Math.min(Math.floor(sceneElapsed / chunkDuration), chunks.length - 1);
  const chunkElapsed = sceneElapsed - chunkIdx * chunkDuration;

  // Fade-in first 0.15s, fade-out last 0.15s of each chunk
  const fadeIn  = Math.min(chunkElapsed / 0.15, 1);
  const fadeOut = Math.min((chunkDuration - chunkElapsed) / 0.15, 1);
  const alpha = Math.min(fadeIn, fadeOut);

  const text = chunks[chunkIdx] || "";
  if (!text || alpha <= 0) return;

  const FONT_SIZE = 42;
  ctx.font = `bold ${FONT_SIZE}px "Arial", sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "bottom";

  const y = H - 55;
  const metrics = ctx.measureText(text);
  const padX = 24;
  const padY = 14;
  const boxW = metrics.width + padX * 2;
  const boxH = FONT_SIZE + padY * 2;
  const boxX = W / 2 - boxW / 2;
  const boxY = y - FONT_SIZE - padY;

  // Semi-transparent background pill
  ctx.globalAlpha = alpha * 0.72;
  ctx.fillStyle = "#000";
  ctx.beginPath();
  ctx.roundRect(boxX, boxY, boxW, boxH, 10);
  ctx.fill();

  // Text: white with strong black outline
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = "rgba(0,0,0,0.95)";
  ctx.lineWidth = 6;
  ctx.lineJoin = "round";
  ctx.strokeText(text, W / 2, y);
  ctx.fillStyle = "#FFFFFF";
  ctx.fillText(text, W / 2, y);

  ctx.globalAlpha = 1;
}

// ── Image loading helpers ─────────────────────────────────────────────────────

/**
 * Cria um HTMLImageElement com canvas preto cinematográfico como placeholder.
 * Usado quando uma imagem de cena falha ao carregar — evita abortar a montagem.
 */
function createPlaceholderImage(width: number, height: number, sceneLabel: string): HTMLImageElement {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;

  // Fundo preto
  ctx.fillStyle = "#000000";
  ctx.fillRect(0, 0, width, height);

  // Gradiente sutil para dar profundidade cinematográfica
  const grad = ctx.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, height * 0.6);
  grad.addColorStop(0, "rgba(30, 30, 30, 0.3)");
  grad.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);

  // Label da cena (debug visual)
  ctx.fillStyle = "rgba(255, 255, 255, 0.15)";
  ctx.font = "bold 24px Arial, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(sceneLabel, width / 2, height / 2);

  const img = new Image();
  img.src = canvas.toDataURL("image/jpeg", 0.8);
  return img;
}

/**
 * Carrega uma imagem com fallback silencioso para placeholder preto.
 * Nunca rejeita — resolve sempre com uma imagem (real ou placeholder).
 */
async function loadImageWithFallback(
  src: string,
  width: number,
  height: number,
  sceneLabel: string
): Promise<HTMLImageElement> {
  return new Promise<HTMLImageElement>((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => {
      console.warn(`[assembler] Falha ao carregar ${src.slice(0, 60)}... — usando placeholder`);
      resolve(createPlaceholderImage(width, height, sceneLabel));
    };
    img.src = src;
  });
}

// ── Main hook ────────────────────────────────────────────────────────────────────────────
export function useVideoAssembler() {
  const [progress, setProgress] = useState(0);
  const [log, setLog] = useState("");
  const [assembling, setAssembling] = useState(false);

  const assembleVideo = useCallback(
    async (
      scenes: AssemblyScene[],
      _audioBlob?: Blob | null,   // deprecated — use per-scene audioUrl instead
      bgMusicUrl?: string,       // optional background music (low volume)
    ): Promise<string> => {
      setAssembling(true);
      setProgress(0);
      setLog("");

      try {
        const WIDTH  = 1280;
        const HEIGHT = 720;
        const FPS    = 30;
        const FADE_SEC = 0.4; // cross-dissolve duration between scenes

        // ── AudioContext initialization (MUST be before any awaits to catch user gesture) ──
        const audioCtx = new window.AudioContext();
        if (audioCtx.state === "suspended") {
          await audioCtx.resume();
        }

        // ── Load all images (com placeholder silencioso em caso de falha) ────────────
        setLog("[autodark] Carregando imagens...");
        const images: HTMLImageElement[] = [];
        let imagesWithPlaceholder = 0;

        for (let i = 0; i < scenes.length; i++) {
          setLog((p) => p + `\n[autodark] Carregando cena ${i + 1}/${scenes.length}...`);
          const scene = scenes[i];

          if (!scene.imageUrl) {
            images.push(createPlaceholderImage(WIDTH, HEIGHT, `Cena ${i + 1}`));
            imagesWithPlaceholder++;
            continue;
          }

          const img = await loadImageWithFallback(scene.imageUrl, WIDTH, HEIGHT, `Cena ${i + 1}`);
          images.push(img);
        }

        if (imagesWithPlaceholder > 0) {
          setLog((p) => p + `\n[autodark] ${imagesWithPlaceholder} cena(s) com placeholder`);
        }

        // ── Canvas & stream ─────────────────────────────────────────────────
        const canvas = document.createElement("canvas");
        canvas.width  = WIDTH;
        canvas.height = HEIGHT;
        canvas.style.position = "absolute";
        canvas.style.top = "-9999px"; // Hide it but keep it in DOM
        document.body.appendChild(canvas);

        const ctx = canvas.getContext("2d")!;
        // Pulo do gato: é obrigatório desenhar algo no canvas ANTES de chamar captureStream
        // caso contrário, em alguns navegadores o Stream nunca inicializa!
        ctx.fillStyle = "black";
        ctx.fillRect(0, 0, WIDTH, HEIGHT);

        const stream = canvas.captureStream(FPS);

        // ── Audio: per-scene narration + optional BGM ───────────────────────
        const dest = audioCtx.createMediaStreamDestination();
        
        // HACK: Conectar um oscilador silencioso para forçar o MediaRecorder a gerar chunks de áudio.
        // Sem isso, algumas versões do Chrome pausam a gravação de vídeo esperando áudio que nunca chega.
        const dummyOsc = audioCtx.createOscillator();
        const dummyGain = audioCtx.createGain();
        dummyGain.gain.value = 0;
        dummyOsc.connect(dummyGain).connect(dest);
        dummyOsc.start();

        const sceneAudioElements: (HTMLAudioElement | null)[] = [];

        // Pre-load all scene audio elements and wait for metadata to correct duration
        for (let i = 0; i < scenes.length; i++) {
          const scene = scenes[i];
          if (scene.audioUrl && scene.audioUrl !== "browser_tts") {
            const el = new Audio(scene.audioUrl);
            el.preload = "auto";
            await new Promise<void>((resolve) => {
              el.onloadedmetadata = () => {
                const audioDuration = el.duration;
                // Update scene duration if audio is longer than estimate
                scene.durationSec = Math.max(scene.durationSec, audioDuration + 0.3);
                resolve();
              };
              el.onerror = () => resolve(); // continue anyway
              // Timeout to prevent hanging if metadata fails
              setTimeout(resolve, 3000);
            });
            sceneAudioElements.push(el);
          } else {
            sceneAudioElements.push(null);
          }
        }

        // Connect BGM if provided
        if (bgMusicUrl) {
          const bgEl  = new Audio(bgMusicUrl);
          bgEl.loop   = true;
          const bgSrc  = audioCtx.createMediaElementSource(bgEl);
          const bgGain = audioCtx.createGain();
          bgGain.gain.value = 0.12;
          bgSrc.connect(bgGain).connect(dest);
          bgEl.play();
        }

        dest.stream.getAudioTracks().forEach((t) => stream.addTrack(t));

        // ── MediaRecorder ───────────────────────────────────────────────────
        const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
          ? "video/webm;codecs=vp9"
          : "video/webm";
        const recorder = new MediaRecorder(stream, {
          mimeType,
          videoBitsPerSecond: 5_000_000,
        });
        const videoChunks: Blob[] = [];
        recorder.ondataavailable = (e) => { if (e.data.size > 0) videoChunks.push(e.data); };

        // Effective total duration accounts for cross-fade overlaps
        const totalDuration =
          scenes.reduce((s, sc) => s + sc.durationSec, 0) -
          (scenes.length - 1) * FADE_SEC;

        setLog((p) => p + `\n[autodark] Renderizando ${scenes.length} cenas (${totalDuration.toFixed(1)}s)...`);

        // Track which scenes have had audio started
        const audioStarted = new Set<number>();
        // Track audio sources connected to prevent double-connect
        const connectedSources = new Map<number, { source: MediaElementAudioSourceNode; gain: GainNode }>();

        return await new Promise<string>((resolve, reject) => {
          recorder.onstop = () => {
            // Stop all audio elements
            sceneAudioElements.forEach(el => { if (el) { el.pause(); el.currentTime = 0; } });
            try { dummyOsc.stop(); } catch(e){}
            audioCtx.close().catch(() => {});
            
            // Remove helper canvas from DOM
            if (canvas.parentNode) canvas.parentNode.removeChild(canvas);

            const blob = new Blob(videoChunks, { type: mimeType });
            if (blob.size === 0) {
              reject(new Error("MediaRecorder gerou arquivo vazio. Verifique permissões do navegador ou abas ocultas."));
              return;
            }

            const url  = URL.createObjectURL(blob);
            setProgress(100);
            setLog((p) => p + `\n[autodark] Vídeo montado! (${(blob.size / 1024 / 1024).toFixed(1)} MB)`);
            resolve(url);
          };
          recorder.onerror = (e: any) => {
            if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
            reject(new Error(`MediaRecorder error: ${e?.error?.message || e.message || "Unknown Event Error"}`));
          };
          recorder.start(100);

          let elapsed    = 0;
          let sceneIdx   = 0;
          let sceneElapsed = 0;

          const drawFrame = () => {
            if (sceneIdx >= scenes.length) {
              // Garante que o áudio da última cena terminou antes de parar o recorder
              const lastAudio = sceneAudioElements[scenes.length - 1];
              if (lastAudio && !lastAudio.paused && lastAudio.currentTime < lastAudio.duration - 0.1) {
                // Desenha o último frame estático enquanto o áudio termina
                drawSceneImage(ctx, images[scenes.length - 1], getMotion(scenes[scenes.length - 1].emotion), 1.0, WIDTH, HEIGHT);
                requestAnimationFrame(drawFrame);
                return;
              }
              try { recorder.requestData(); } catch (e) {} // Força a liberação dos últimos chunks
              setTimeout(() => {
                if (recorder.state !== "inactive") recorder.stop();
              }, 100);
              return;
            }

            const scene    = scenes[sceneIdx];
            const motion   = getMotion(scene.emotion);
            const progress = sceneElapsed / scene.durationSec;

            // ── Start per-scene audio when scene begins ────────────────────
            if (!audioStarted.has(sceneIdx)) {
              audioStarted.add(sceneIdx);
              
              // Fade down previous scene's audio
              if (sceneIdx > 0 && connectedSources.has(sceneIdx - 1)) {
                const prev = connectedSources.get(sceneIdx - 1)!;
                prev.gain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.3);
              }
              
              const audioEl = sceneAudioElements[sceneIdx];
              if (audioEl) {
                try {
                  const src = audioCtx.createMediaElementSource(audioEl);
                  const gain = audioCtx.createGain();
                  gain.gain.value = 1.0;
                  src.connect(gain).connect(dest);
                  connectedSources.set(sceneIdx, { source: src, gain });
                  audioEl.play().catch(() => {});
                  setLog((p) => p + `\n[autodark] 🔊 Áudio cena ${sceneIdx + 1} iniciado`);
                } catch {
                  // Audio element may already be connected
                }
              }
            }

            // ── Draw current scene ─────────────────────────────────────────
            drawSceneImage(ctx, images[sceneIdx], motion, progress, WIDTH, HEIGHT);

            // ── Cross-dissolve: blend next scene during last FADE_SEC ──────
            const fadeStart = scene.durationSec - FADE_SEC;
            if (sceneElapsed >= fadeStart && sceneIdx + 1 < scenes.length) {
              const fadeAlpha = (sceneElapsed - fadeStart) / FADE_SEC;
              ctx.globalAlpha = Math.min(fadeAlpha, 1);
              drawSceneImage(ctx, images[sceneIdx + 1], getMotion(scenes[sceneIdx + 1].emotion), 0, WIDTH, HEIGHT);
              ctx.globalAlpha = 1;
            }

            // ── Cinematic vignette ─────────────────────────────────────────
            drawVignette(ctx, WIDTH, HEIGHT);

            // ── Subtitles ──────────────────────────────────────────────────
            if (scene.subtitle) {
              if (sceneElapsed >= fadeStart) {
                const fadeOut = 1 - (sceneElapsed - fadeStart) / FADE_SEC;
                ctx.globalAlpha = Math.max(fadeOut, 0);
              }
              drawSubtitles(ctx, scene.subtitle, sceneElapsed, scene.durationSec, WIDTH, HEIGHT);
              ctx.globalAlpha = 1;
            }

            // ── Advance time ───────────────────────────────────────────────
            sceneElapsed += 1 / FPS;
            elapsed      += 1 / FPS;
            setProgress(Math.round(Math.min(elapsed / totalDuration, 1) * 100));

            if (sceneElapsed >= scene.durationSec) {
              sceneIdx++;
              sceneElapsed = 0;
            }

            requestAnimationFrame(drawFrame);
          };

          requestAnimationFrame(drawFrame);
        });
      } catch (e) {
        setLog((p) => p + `\n[autodark] ERRO: ${e instanceof Error ? e.message : "Erro desconhecido"}`);
        throw e;
      } finally {
        setAssembling(false);
      }
    },
    [],
  );

  return { assembleVideo, assembling, progress, log };
}
