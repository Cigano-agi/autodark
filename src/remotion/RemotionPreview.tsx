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
  const speechRef = useRef<SpeechSynthesisUtterance | null>(null);
  const lastSceneRef = useRef<number>(-1);
  const isPlayingRef = useRef<boolean>(false);

  const totalFrames = calculateTotalFrames(slides, fps);

  // Acumula frame de início de cada cena
  const sceneStartFrames = slides.reduce<number[]>((acc, s, i) => {
    acc.push(i === 0 ? 0 : acc[i - 1] + Math.round(s.durationSec * fps));
    return acc;
  }, []);

  // Web Speech API overlay — narra cada cena ao vivo durante o play
  const speakScene = useCallback((sceneIndex: number) => {
    if (!("speechSynthesis" in window)) return;
    const scene = slides[sceneIndex];
    if (!scene?.narration) return;

    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(scene.narration);
    utter.lang = "pt-BR";
    utter.rate = 0.95;
    utter.pitch = 1.0;
    const voices = window.speechSynthesis.getVoices();
    const ptVoice = voices.find((v) => v.lang.startsWith("pt"));
    if (ptVoice) utter.voice = ptVoice;
    speechRef.current = utter;
    window.speechSynthesis.speak(utter);
  }, [slides]);

  useEffect(() => {
    const player = playerRef.current;
    if (!player) return;

    const onPlay = () => { isPlayingRef.current = true; };
    const onPause = () => { isPlayingRef.current = false; window.speechSynthesis?.cancel(); };
    const onSeeked = () => { lastSceneRef.current = -1; };

    const onTimeUpdate = () => {
      if (!isPlayingRef.current) return; // só narra se estiver tocando
      const frame = player.getCurrentFrame();
      let currentScene = 0;
      for (let i = sceneStartFrames.length - 1; i >= 0; i--) {
        if (frame >= sceneStartFrames[i]) { currentScene = i; break; }
      }
      if (currentScene !== lastSceneRef.current) {
        lastSceneRef.current = currentScene;
        speakScene(currentScene);
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
      window.speechSynthesis?.cancel();
    };
  }, [sceneStartFrames, speakScene]);

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
        Narração ao vivo via browser — dê play para ouvir
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
