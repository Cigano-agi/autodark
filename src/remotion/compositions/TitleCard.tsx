import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";

interface TitleCardProps {
  title: string;
  durationInFrames: number;
}

export function TitleCard({ title, durationInFrames }: TitleCardProps) {
  const frame = useCurrentFrame();

  const opacity = interpolate(
    frame,
    [0, 15, durationInFrames - 15, durationInFrames],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const scale = interpolate(frame, [0, 20], [0.9, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#0a0a0a",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        opacity,
      }}
    >
      <div
        style={{
          transform: `scale(${scale})`,
          textAlign: "center",
          padding: "0 120px",
        }}
      >
        <div
          style={{
            width: 60,
            height: 4,
            backgroundColor: "#ff8c00",
            margin: "0 auto 24px",
            borderRadius: 2,
          }}
        />
        <h1
          style={{
            fontFamily: "sans-serif",
            fontSize: 72,
            fontWeight: 800,
            color: "#ffffff",
            lineHeight: 1.2,
            textShadow: "0 4px 20px rgba(255,140,0,0.3)",
          }}
        >
          {title}
        </h1>
      </div>
    </AbsoluteFill>
  );
}
