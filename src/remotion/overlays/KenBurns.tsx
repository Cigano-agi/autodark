import { Img, interpolate, useCurrentFrame } from "remotion";

interface KenBurnsProps {
  src: string;
  durationInFrames: number;
  intensity: number; // 0-20 (%)
  width: number;
  height: number;
}

export function KenBurns({ src, durationInFrames, intensity, width, height }: KenBurnsProps) {
  const frame = useCurrentFrame();
  const progress = frame / Math.max(durationInFrames, 1);
  const scale = interpolate(progress, [0, 1], [1, 1 + intensity / 100]);

  return (
    <div style={{ width, height, overflow: "hidden", position: "absolute", top: 0, left: 0 }}>
      <Img
        src={src}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          transform: `scale(${scale})`,
          transformOrigin: "center center",
        }}
      />
    </div>
  );
}
