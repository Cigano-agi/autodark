import { AbsoluteFill, Sequence } from "remotion";
import { SlideScene } from "./SlideScene";
import { TitleCard } from "./TitleCard";
import type { SlideShowProps } from "../types";
import { DEFAULT_CAPTION_STYLE } from "../types";

export function SlideShow({
  slides,
  fps,
  width,
  height,
  kenBurnsIntensity = 8,
  captionStyle = DEFAULT_CAPTION_STYLE,
  fadeDurationFrames = 15,
}: SlideShowProps) {
  let currentFrame = 0;

  const sequences: { from: number; duration: number; slide: (typeof slides)[0]; isTitle: boolean }[] = [];

  for (const slide of slides) {
    // Insert chapter title card if this is a chapter start
    if (slide.isChapterStart && slide.chapterTitle) {
      const titleDuration = Math.round(fps * 2.5); // 2.5s title card
      sequences.push({
        from: currentFrame,
        duration: titleDuration,
        slide,
        isTitle: true,
      });
      currentFrame += titleDuration;
    }

    const slideDuration = Math.round(slide.durationSec * fps);
    sequences.push({
      from: currentFrame,
      duration: slideDuration,
      slide,
      isTitle: false,
    });
    currentFrame += slideDuration;
  }

  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      {sequences.map((seq, i) =>
        seq.isTitle ? (
          <Sequence key={`title-${i}`} from={seq.from} durationInFrames={seq.duration}>
            <TitleCard title={seq.slide.chapterTitle!} durationInFrames={seq.duration} />
          </Sequence>
        ) : (
          <Sequence key={`slide-${i}`} from={seq.from} durationInFrames={seq.duration}>
            <SlideScene
              imageUrl={seq.slide.imageUrl}
              narration={seq.slide.narration}
              durationInFrames={seq.duration}
              audioUrl={seq.slide.audioUrl}
              kenBurnsIntensity={kenBurnsIntensity}
              captionStyle={captionStyle}
              fadeDurationFrames={fadeDurationFrames}
              width={width}
              height={height}
            />
          </Sequence>
        )
      )}
    </AbsoluteFill>
  );
}

/**
 * Calculate total duration in frames for the SlideShow composition.
 */
export function calculateTotalFrames(
  slides: SlideShowProps["slides"],
  fps: number
): number {
  let total = 0;
  for (const slide of slides) {
    if (slide.isChapterStart && slide.chapterTitle) {
      total += Math.round(fps * 2.5);
    }
    total += Math.round(slide.durationSec * fps);
  }
  return total;
}
