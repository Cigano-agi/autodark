import { AbsoluteFill, Audio, interpolate, useCurrentFrame } from "remotion";
import { KenBurns } from "../overlays/KenBurns";
import { CaptionOverlay } from "../overlays/CaptionOverlay";
import type { CaptionStyle } from "../types";

interface SlideSceneProps {
  imageUrl: string;
  narration: string;
  durationInFrames: number;
  audioUrl?: string;
  kenBurnsIntensity: number;
  captionStyle: CaptionStyle;
  fadeDurationFrames: number;
  width: number;
  height: number;
}

// Frames de zoom-in dramático no início de cada cena (efeito terror/impacto)
const ZOOM_IN_FRAMES = 30;

export function SlideScene({
  imageUrl,
  narration,
  durationInFrames,
  audioUrl,
  kenBurnsIntensity,
  captionStyle,
  fadeDurationFrames,
  width,
  height,
}: SlideSceneProps) {
  const frame = useCurrentFrame();

  // Fade in/out mais rápido (fadeDurationFrames vem dos props, agora padrão 8)
  const opacity = interpolate(
    frame,
    [0, fadeDurationFrames, durationInFrames - fadeDurationFrames, durationInFrames],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  // Zoom-in acelerado nos primeiros ZOOM_IN_FRAMES frames (1.0 → 1.15)
  const zoomScale = interpolate(
    frame,
    [0, ZOOM_IN_FRAMES],
    [1.0, 1.15],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  return (
    <AbsoluteFill style={{ opacity }}>
      {/* Background image com Ken Burns + zoom inicial dramático */}
      <div
        style={{
          width,
          height,
          transform: `scale(${zoomScale})`,
          transformOrigin: "center center",
        }}
      >
        <KenBurns
          src={imageUrl}
          durationInFrames={durationInFrames}
          intensity={kenBurnsIntensity}
          width={width}
          height={height}
        />
      </div>

      {/* Audio track for this scene */}
      {audioUrl && audioUrl !== "browser_tts" && (
        <Audio src={audioUrl} volume={1} />
      )}

      {/* Caption overlay */}
      {narration && (
        <CaptionOverlay
          text={narration}
          durationInFrames={durationInFrames}
          style={captionStyle}
        />
      )}
    </AbsoluteFill>
  );
}
