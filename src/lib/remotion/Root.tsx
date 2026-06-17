import React from "react";
import { Composition } from "remotion";
import { LyricVibeComposition } from "./Composition";
import { DemoVideoComposition } from "./DemoVideo";
import type { LyricLine, StyleParams, FilterType, SubtitleTemplate } from "../types";
import { styleParamsToTemplate } from "../types";

// ~33-second hot dance demo: Taylor Swift — Opalite
// Timestamps from WhisperX (Demucs + large-v3) transcription
// 左右交替布局：偶数行左(白), 奇数行右(蓝)
const DEFAULT_LYRICS: LyricLine[] = [
  { index: 0, text: "Don't you sweat it, baby, it's alright",       startTime: 0.00,  endTime: 2.48,  alignment: "left" },
  { index: 1, text: "You were dancing through the lightning strikes", startTime: 2.48,  endTime: 6.76,  alignment: "right" },
  { index: 2, text: "Oh, so sleepless in the onyx night",            startTime: 7.88,  endTime: 10.44, alignment: "left" },
  { index: 3, text: "But now the sky is opalite",                    startTime: 10.44, endTime: 14.34, alignment: "right" },
  { index: 4, text: "Oh-oh-oh-oh, oh my Lord",                       startTime: 14.34, endTime: 18.12, alignment: "left" },
  { index: 5, text: "Never met no one like you before",              startTime: 18.12, endTime: 21.84, alignment: "right" },
  { index: 6, text: "You had to make your own sunshine",              startTime: 21.84, endTime: 25.64, alignment: "left" },
  { index: 7, text: "But now the sky is opalite",                    startTime: 26.44, endTime: 29.64, alignment: "right" },
  { index: 8, text: "Oh-oh-oh-oh, oh",                                startTime: 29.64, endTime: 32.50, alignment: "left" },
];

const DEFAULT_STYLE: StyleParams = {
  fontFamily: "'Impact', 'Montserrat', 'Arial Black', 'Noto Sans SC', sans-serif",
  fontSize: 64,
  primaryColor: "#FFFFFF",
  secondaryColor: "#38BDF8",
  accentColor: "#00E5FF",
  animation: "kinetic-pop",
  decoration: ["none"],
  fontWeight: 900,
  textShadow: true,
};

const DEFAULT_TEMPLATE: SubtitleTemplate = {
  ...styleParamsToTemplate(DEFAULT_STYLE),
  layout: {
    ...styleParamsToTemplate(DEFAULT_STYLE).layout,
    positionY: 0.55,
    alternateMode: "alternate" as const,
    alternateAmplitude: 0.22,
    maxWidthRatio: 0.88,
    lineSpacing: 1.2,
  },
  animation: {
    entrance: "kinetic-pop" as const,
    entranceDuration: 0.30,
    exit: "fade-in" as const,
    exitDuration: 0.12,
    bounciness: 0.8,
    easing: "ease-out" as const,
  },
  render: {
    ...styleParamsToTemplate(DEFAULT_STYLE).render,
    fontFamily: "'Impact', 'Montserrat', 'Arial Black', 'Noto Sans SC', sans-serif",
    fontSize: 64,
    fontWeight: 900,
    primaryColor: "#FFFFFF",
    secondaryColor: "#38BDF8",
    accentColor: "#00E5FF",
    strokeWidth: 5,
    strokeColor: "#000000",
    allCaps: true,
    highlightWords: ["baby", "dancing", "lightning", "sleepless", "onyx", "opalite", "lord", "never", "sunshine"],
  },
};

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="LyricVibeVideo"
        component={LyricVibeComposition as any}
        durationInFrames={Math.ceil(33 * 30)} // ~33-second hot dance clip at 30fps
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{
          videoUrl: "demo_mv.mp4",
          audioUrl: "demo_audio.mp3",
          lyrics: DEFAULT_LYRICS,
          styleParams: DEFAULT_STYLE,
          filter: "original" as FilterType,
          fps: 30,
          speed: 1,
          pitch: 0,
          subtitleTemplate: DEFAULT_TEMPLATE,
        }}
      />

      {/* LyricVibe 全流程展示 Demo Video — 50秒完整工作流 */}
      <Composition
        id="LyricVibeDemo"
        component={DemoVideoComposition}
        durationInFrames={1500}
        fps={30}
        width={1920}
        height={1080}
      />
    </>
  );
};
