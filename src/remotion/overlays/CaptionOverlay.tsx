import { interpolate, useCurrentFrame } from "remotion";
import type { CaptionStyle } from "../types";

interface CaptionOverlayProps {
  text: string;
  durationInFrames: number;
  style: CaptionStyle;
}

export function CaptionOverlay({ text, durationInFrames, style }: CaptionOverlayProps) {
  const frame = useCurrentFrame();
  const words = text.split(" ");
  const CHUNK_SIZE = 7;
  const chunks: string[] = [];
  for (let i = 0; i < words.length; i += CHUNK_SIZE) {
    chunks.push(words.slice(i, i + CHUNK_SIZE).join(" "));
  }

  if (chunks.length === 0) return null;

  const chunkIdx = Math.min(
    Math.floor((frame / durationInFrames) * chunks.length),
    chunks.length - 1
  );
  const currentChunk = chunks[chunkIdx];

  // Word-by-word highlight within the chunk
  const chunkWords = currentChunk.split(" ");
  const framesPerChunk = durationInFrames / chunks.length;
  const chunkFrame = frame - chunkIdx * framesPerChunk;
  const highlightIdx = Math.min(
    Math.floor((chunkFrame / framesPerChunk) * chunkWords.length),
    chunkWords.length - 1
  );

  const opacity = interpolate(frame, [0, 8, durationInFrames - 8, durationInFrames], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const yPos = style.position === "bottom" ? "85%" : "50%";

  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        top: yPos,
        transform: "translateY(-50%)",
        display: "flex",
        justifyContent: "center",
        opacity,
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          backgroundColor: style.backgroundColor,
          padding: "12px 30px",
          borderRadius: 10,
          display: "flex",
          gap: "0.3em",
          flexWrap: "wrap",
          justifyContent: "center",
          maxWidth: "80%",
        }}
      >
        {chunkWords.map((word, idx) => (
          <span
            key={idx}
            style={{
              fontFamily: style.fontFamily,
              fontSize: style.fontSize,
              fontWeight: "bold",
              color: idx <= highlightIdx ? style.color : "rgba(255,255,255,0.6)",
              textShadow: "0 4px 12px rgba(0,0,0,0.9)",
              transition: "color 0.1s",
            }}
          >
            {word}
          </span>
        ))}
      </div>
    </div>
  );
}
