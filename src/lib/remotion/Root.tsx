import React from "react";
import { Composition } from "remotion";
import { LyricVibeComposition } from "./Composition";
import type { LyricLine, StyleParams, FilterType } from "@/lib/types";

// Default demo lyrics
const DEFAULT_LYRICS: LyricLine[] = [
  { index: 0, text: "I got my driver's license last week", startTime: 0, endTime: 3.5 },
  { index: 1, text: "Just like we always talked about", startTime: 3.5, endTime: 6.8 },
  { index: 2, text: "'Cause you were so excited for me", startTime: 6.8, endTime: 10.2 },
  { index: 3, text: "To finally drive up to your house", startTime: 10.2, endTime: 13.5 },
  { index: 4, text: "But today I drove through the suburbs", startTime: 13.5, endTime: 17.0 },
  { index: 5, text: "Crying 'cause you weren't around", startTime: 17.0, endTime: 20.5 },
  { index: 6, text: "And you're probably with that blonde girl", startTime: 20.5, endTime: 24.0 },
  { index: 7, text: "Who always made me doubt", startTime: 24.0, endTime: 27.0 },
  { index: 8, text: "She's so much older than me", startTime: 27.0, endTime: 30.5 },
  { index: 9, text: "She's everything I'm insecure about", startTime: 30.5, endTime: 34.0 },
];

const DEFAULT_STYLE: StyleParams = {
  fontFamily: "'Caveat', 'Kalam', cursive",
  fontSize: 48,
  primaryColor: "#E8D5C4",
  secondaryColor: "#9B7B6B",
  accentColor: "#C44569",
  animation: "fade-in",
  decoration: ["emoji"],
  fontWeight: 400,
  textShadow: true,
};

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="LyricVibeVideo"
        component={LyricVibeComposition as any}
        durationInFrames={Math.ceil(34 * 30)} // 34 seconds at 30fps
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{
          lyrics: DEFAULT_LYRICS,
          styleParams: DEFAULT_STYLE,
          filter: "original" as FilterType,
          fps: 30,
        }}
      />
    </>
  );
};
