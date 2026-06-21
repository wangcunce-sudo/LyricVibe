/**
 * Remotion Composition for LyricVibe
 *
 * This is the video definition that Remotion renders into MP4.
 * It recreates the lyric subtitle overlay with full animation control.
 *
 * Uses SubtitleComposition internally to ensure 100% consistency
 * between frontend preview (@remotion/player) and backend SSR render.
 *
 * To render locally:
 *   npx remotion render src/lib/remotion/index.ts LyricVibeVideo out.mp4
 */

import React from "react";
import {
  useCurrentFrame,
  useVideoConfig,
  AbsoluteFill,
  Audio,
  OffthreadVideo,
  staticFile,
  getInputProps,
} from "remotion";
import { logger } from "../logger";
import type { LyricLine, StyleParams, FilterType, SubtitleTemplate } from "../types";
import { FILTER_PRESETS, styleParamsToTemplate } from "../types";
import type { SceneAnimSpec } from "../animation-types";
import { SubtitleComposition } from "./SubtitleComposition";
import { AnimatedBackground } from "./AnimatedBackground";
import { ImageAnimatedBackground } from "./ImageAnimatedBackground";

interface CompositionProps {
  videoUrl?: string;
  audioUrl?: string;
  lyrics: LyricLine[];
  styleParams: StyleParams;
  filter: FilterType;
  fps: number;
  speed?: number;
  pitch?: number;
  subtitleTemplate?: SubtitleTemplate;
  /** AI 生成的动画循环底片（与 videoUrl 互斥，二选一） */
  backgroundScene?: SceneAnimSpec;
  /** 静态图片背景（带 Ken Burns + 飘动动效） */
  backgroundImage?: string;
}

export const LyricVibeComposition: React.FC<CompositionProps> = (props) => {
  const inputPropsFromRemotion = getInputProps() as Partial<CompositionProps> | undefined;

  const videoUrl = props.videoUrl ?? inputPropsFromRemotion?.videoUrl;
  const audioUrl = props.audioUrl ?? inputPropsFromRemotion?.audioUrl;
  const lyrics = (props.lyrics?.length ? props.lyrics : inputPropsFromRemotion?.lyrics) || [];
  const styleParams = (props.styleParams ?? inputPropsFromRemotion?.styleParams) || {
    fontFamily: "sans-serif",
    fontSize: 56,
    primaryColor: "#ffffff",
    secondaryColor: "#cccccc",
    accentColor: "#ff6b6b",
    animation: "bounce" as const,
    decoration: ["emoji"] as string[],
    fontWeight: 700,
    textShadow: true,
  };
  const filter = (props.filter ?? inputPropsFromRemotion?.filter) || "original";
  const fps = props.fps ?? inputPropsFromRemotion?.fps ?? 30;
  const speed = props.speed ?? inputPropsFromRemotion?.speed ?? 1;
  const pitch = props.pitch ?? inputPropsFromRemotion?.pitch ?? 0;
  const subtitleTemplate = props.subtitleTemplate ?? inputPropsFromRemotion?.subtitleTemplate;
  const backgroundScene = props.backgroundScene ?? inputPropsFromRemotion?.backgroundScene;
  const backgroundImage = props.backgroundImage ?? inputPropsFromRemotion?.backgroundImage;

  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();

  if (frame === 0) {
    logger.info("Composition", "========== RECEIVED PROPS ==========");
    logger.info("Composition", "styleParams:", JSON.stringify(styleParams, null, 2));
    logger.info("Composition", "filter:", filter);
    logger.info("Composition", "speed:", speed);
    logger.info("Composition", "subtitleTemplate present:", !!subtitleTemplate);
    logger.info("Composition", "lyrics count:", lyrics?.length || 0);
    logger.info("Composition", "videoUrl:", videoUrl);
    logger.info("Composition", "audioUrl:", audioUrl);
    logger.info("Composition", "backgroundScene present:", !!backgroundScene);
    logger.info("Composition", "=====================================");
  }

  // Apply speed: time passes faster with higher speed
  const currentTimeSec = (frame / fps) * speed;

  // Find current lyric line
  const currentLine = lyrics.find(
    (l) => currentTimeSec >= l.startTime && currentTimeSec < l.endTime
  ) || null;

  const progress = currentLine
    ? (currentTimeSec - currentLine.startTime) /
      (currentLine.endTime - currentLine.startTime)
    : 0;

  const filterStyle = FILTER_PRESETS[filter] || "none";

  // Resolve asset URLs
  const resolvedVideoSrc = videoUrl
    ? videoUrl.startsWith("http") || videoUrl.startsWith("/")
      ? videoUrl
      : staticFile(videoUrl)
    : undefined;

  const resolvedAudioSrc = audioUrl
    ? audioUrl.startsWith("http") || audioUrl.startsWith("/")
      ? audioUrl
      : staticFile(audioUrl)
    : undefined;

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#111",
        filter: filterStyle,
      }}
    >
      {/* Background: Animated scene (priority) > Image with animation > Static video > Solid color */}
      {backgroundScene ? (
        <AnimatedBackground
          scene={backgroundScene}
          width={width}
          height={height}
        />
      ) : backgroundImage ? (
        <ImageAnimatedBackground
          imageSrc={backgroundImage}
          width={width}
          height={height}
          scene={backgroundScene}
          intensity={0.6}
        />
      ) : resolvedVideoSrc ? (
        <OffthreadVideo
          src={resolvedVideoSrc}
          style={{
            position: "absolute",
            width: "100%",
            height: "100%",
            objectFit: "cover",
          }}
          playbackRate={speed}
          muted
        />
      ) : null}

      {/* Audio track */}
      {resolvedAudioSrc && <Audio src={resolvedAudioSrc} />}

      {/* Lyric subtitle overlay — uses shared SubtitleComposition */}
      <AbsoluteFill
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: `${height * 0.05}px ${width * 0.08}px`,
          pointerEvents: "none",
          overflow: "hidden",
        }}
      >
        <SubtitleComposition
          currentLine={currentLine}
          progress={progress}
          styleParams={styleParams}
          subtitleTemplate={subtitleTemplate}
          totalLines={lyrics.length}
          width={width}
          height={height}
          speed={speed}
        />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
