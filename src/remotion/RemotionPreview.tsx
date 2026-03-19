import { Player } from "@remotion/player";
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
  kenBurnsIntensity = 8,
  className,
}: RemotionPreviewProps) {
  const fps = DEFAULT_SLIDESHOW_PROPS.fps!;
  const width = DEFAULT_SLIDESHOW_PROPS.width!;
  const height = DEFAULT_SLIDESHOW_PROPS.height!;

  const totalFrames = calculateTotalFrames(slides, fps);

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
      <Player
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
      />
    </div>
  );
}
