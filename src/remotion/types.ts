export interface SlideShowProps {
  slides: SlideData[];
  fps: number;
  width: number;
  height: number;
  kenBurnsIntensity: number; // 0-20 (%)
  captionStyle: CaptionStyle;
  fadeDurationFrames: number;
  musicVolume: number; // 0-1
}

export interface SlideData {
  imageUrl: string;
  narration: string;
  durationSec: number;
  audioUrl?: string;
  chapterTitle?: string;
  isChapterStart?: boolean;
}

export interface CaptionStyle {
  fontSize: number;
  color: string;
  backgroundColor: string;
  position: "bottom" | "center";
  fontFamily: string;
}

export const DEFAULT_CAPTION_STYLE: CaptionStyle = {
  fontSize: 64,
  color: "#FFFF00",
  backgroundColor: "rgba(0,0,0,0.55)",
  position: "bottom",
  fontFamily: "sans-serif",
};

export const DEFAULT_SLIDESHOW_PROPS: Partial<SlideShowProps> = {
  fps: 30,
  width: 1920,
  height: 1080,
  kenBurnsIntensity: 8,
  captionStyle: DEFAULT_CAPTION_STYLE,
  fadeDurationFrames: 15,
  musicVolume: 0.2,
};
