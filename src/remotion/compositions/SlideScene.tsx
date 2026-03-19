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

  // Fade in/out
  const opacity = interpolate(
    frame,
    [0, fadeDurationFrames, durationInFrames - fadeDurationFrames, durationInFrames],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  return (
    <AbsoluteFill style={{ opacity }}>
      {/* Background image with Ken Burns */}
      <KenBurns
        src={imageUrl}
        durationInFrames={durationInFrames}
        intensity={kenBurnsIntensity}
        width={width}
        height={height}
      />

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
