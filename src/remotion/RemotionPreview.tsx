import { useRef, useEffect, useCallback } from "react";
import { Player, PlayerRef } from "@remotion/player";
import { SlideShow, calculateTotalFrames } from "./compositions/SlideShow";
import type { SlideData, SlideShowProps } from "./types";
import { DEFAULT_CAPTION_STYLE, DEFAULT_SLIDESHOW_PROPS } from "./types";

interface RemotionPreviewProps {
  slides: SlideData[];
  kenBurnsIntensity?: number;
  className?: string;
}

export function RemotionPreview({
  slides,
  kenBurnsIntensity = 15,
  className,
}: RemotionPreviewProps) {
  const fps = DEFAULT_SLIDESHOW_PROPS.fps!;
  const width = DEFAULT_SLIDESHOW_PROPS.width!;
  const height = DEFAULT_SLIDESHOW_PROPS.height!;
  const playerRef = useRef<PlayerRef>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const lastSceneRef = useRef<number>(-1);
  const isPlayingRef = useRef<boolean>(false);

  const totalFrames = calculateTotalFrames(slides, fps);

  // Acumula frame de início de cada cena
  const sceneStartFrames = slides.reduce<number[]>((acc, s, i) => {
    acc.push(i === 0 ? 0 : acc[i - 1] + Math.round(s.durationSec * fps));
    return acc;
  }, []);

  // Tocar áudio real da cena via HTMLAudioElement (AI-33 TTS)
  // Fallback para browser TTS apenas se audioUrl não disponível
  const playScene = useCallback((sceneIndex: number) => {
    const scene = slides[sceneIndex];

    // Parar qualquer áudio anterior
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    window.speechSynthesis?.cancel();

    // Áudio real: usar HTMLAudioElement com o audioUrl da cena
    if (scene?.audioUrl && scene.audioUrl !== "browser_tts") {
      const el = new Audio(scene.audioUrl);
      el.volume = 0.9;
      audioRef.current = el;
      el.play().catch(() => {
        // autoplay bloqueado — silencioso, não travar a UI
      });
      return;
    }

    // Fallback: browser TTS apenas se não houver audioUrl real
    if (scene?.narration && "speechSynthesis" in window) {
      const utter = new SpeechSynthesisUtterance(scene.narration);
      utter.rate = 0.95;
      utter.pitch = 1.0;
      window.speechSynthesis.speak(utter);
    }
  }, [slides]);

  useEffect(() => {
    const player = playerRef.current;
    if (!player) return;

    const onPlay = () => { isPlayingRef.current = true; };
    const onPause = () => {
      isPlayingRef.current = false;
      if (audioRef.current) audioRef.current.pause();
      window.speechSynthesis?.cancel();
    };
    const onSeeked = () => { lastSceneRef.current = -1; };

    const onTimeUpdate = () => {
      if (!isPlayingRef.current) return;
      const frame = player.getCurrentFrame();
      let currentScene = 0;
      for (let i = sceneStartFrames.length - 1; i >= 0; i--) {
        if (frame >= sceneStartFrames[i]) { currentScene = i; break; }
      }
      if (currentScene !== lastSceneRef.current) {
        lastSceneRef.current = currentScene;
        playScene(currentScene);
      }
    };

    player.addEventListener("play", onPlay);
    player.addEventListener("pause", onPause);
    player.addEventListener("timeupdate", onTimeUpdate);
    player.addEventListener("seeked", onSeeked);

    return () => {
      player.removeEventListener("play", onPlay);
      player.removeEventListener("pause", onPause);
      player.removeEventListener("timeupdate", onTimeUpdate);
      player.removeEventListener("seeked", onSeeked);
      if (audioRef.current) audioRef.current.pause();
      window.speechSynthesis?.cancel();
    };
  }, [sceneStartFrames, playScene]);

  if (slides.length === 0 || totalFrames === 0) {
    return (
      <div className={`flex items-center justify-center bg-black/50 rounded-xl border border-white/10 aspect-video ${className || ""}`}>
        <p className="text-muted-foreground text-sm">Nenhuma cena para preview</p>
      </div>
    );
  }

  const inputProps: SlideShowProps = {
    slides,
    fps,
    width,
    height,
    kenBurnsIntensity,
    captionStyle: DEFAULT_CAPTION_STYLE,
    fadeDurationFrames: DEFAULT_SLIDESHOW_PROPS.fadeDurationFrames!,
    musicVolume: DEFAULT_SLIDESHOW_PROPS.musicVolume!,
  };

  return (
    <div className={`rounded-xl overflow-hidden border border-white/10 shadow-2xl ${className || ""}`}>
      <div className="flex items-center gap-2 px-3 py-1.5 bg-black/40 text-xs text-muted-foreground border-b border-white/5">
        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
        Preview com áudio AI — dê play para ouvir
      </div>
      <Player
        ref={playerRef}
        component={SlideShow}
        inputProps={inputProps}
        durationInFrames={totalFrames}
        fps={fps}
        compositionWidth={width}
        compositionHeight={height}
        style={{ width: "100%" }}
        controls
        autoPlay={false}
        loop={false}
        acknowledgeRemotionLicense
      />
    </div>
  );
}
