/**
 * Remotion Composition for LyricVibe
 *
 * This is the video definition that Remotion renders into MP4.
 * It recreates the lyric subtitle overlay with full animation control.
 *
 * To render locally:
 *   npx remotion render src/lib/remotion/index.ts LyricVibeVideo out.mp4
 */

import React from "react";
import { useCurrentFrame, useVideoConfig, AbsoluteFill } from "remotion";
import type { LyricLine, StyleParams, FilterType } from "@/lib/types";
import { FILTER_PRESETS } from "@/lib/types";

interface CompositionProps {
  videoUrl?: string;
  lyrics: LyricLine[];
  styleParams: StyleParams;
  filter: FilterType;
  fps: number;
}

export const LyricVibeComposition: React.FC<CompositionProps> = ({
  videoUrl,
  lyrics,
  styleParams,
  filter,
  fps,
}) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();

  const currentTimeSec = frame / fps;

  // Find current lyric line
  const currentLine = lyrics.find(
    (l) => currentTimeSec >= l.startTime && currentTimeSec < l.endTime
  );

  const progress = currentLine
    ? (currentTimeSec - currentLine.startTime) /
      (currentLine.endTime - currentLine.startTime)
    : 0;

  const filterStyle = FILTER_PRESETS[filter] || "none";

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#111",
        filter: filterStyle,
      }}
    >
      {/* Background video */}
      {videoUrl && (
        <video
          src={videoUrl}
          style={{
            position: "absolute",
            width: "100%",
            height: "100%",
            objectFit: "cover",
          }}
        />
      )}

      {/* Lyric subtitle overlay */}
      <AbsoluteFill
        style={{
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "center",
          paddingBottom: height * 0.15,
        }}
      >
        {currentLine && (
          <LyricText
            text={currentLine.text}
            progress={progress}
            styleParams={styleParams}
            frame={frame}
          />
        )}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ============================================================
// Lyric text with animation
// ============================================================

const LyricText: React.FC<{
  text: string;
  progress: number;
  styleParams: StyleParams;
  frame: number;
}> = ({ text, progress, styleParams, frame }) => {
  const {
    fontFamily,
    fontSize,
    primaryColor,
    secondaryColor,
    accentColor,
    animation,
    fontWeight,
    textShadow,
  } = styleParams;

  const clampedProgress = Math.max(0, Math.min(1, progress));

  // Animation styles
  let animStyle: React.CSSProperties = {};

  switch (animation) {
    case "fade-in":
      animStyle = {
        opacity: Math.min(1, clampedProgress * 2),
        transform: `translateY(${(1 - clampedProgress) * 10}px)`,
      };
      break;
    case "slide-up":
      animStyle = {
        opacity: Math.min(1, clampedProgress * 2),
        transform: `translateY(${(1 - clampedProgress) * 30}px)`,
      };
      break;
    case "bounce":
      const bounceScale = 1 + Math.sin(clampedProgress * Math.PI) * 0.05;
      animStyle = {
        opacity: Math.min(1, clampedProgress * 2),
        transform: `scale(${bounceScale})`,
      };
      break;
    case "scale-up":
      animStyle = {
        opacity: Math.min(1, clampedProgress * 1.5),
        transform: `scale(${0.8 + clampedProgress * 0.3})`,
      };
      break;
    case "typewriter":
      const visibleChars = Math.floor(text.length * clampedProgress);
      // For typewriter, we'd need to slice the text — handled in the variant below
      break;
    case "karaoke":
      // Karaoke uses a different rendering approach
      break;
  }

  const baseStyle: React.CSSProperties = {
    fontFamily,
    fontSize: `${fontSize}px`,
    fontWeight,
    color: primaryColor,
    textAlign: "center",
    textShadow: textShadow
      ? "2px 2px 8px rgba(0,0,0,0.7), 0 0 20px rgba(0,0,0,0.3)"
      : "1px 1px 4px rgba(0,0,0,0.5)",
    lineHeight: 1.3,
    padding: "0 40px",
    maxWidth: "90%",
    ...animStyle,
  };

  // Karaoke style: gradient reveal
  if (animation === "karaoke") {
    return (
      <div style={{ position: "relative", display: "inline-block" }}>
        <span
          style={{
            ...baseStyle,
            color: secondaryColor,
            opacity: 0.4,
          }}
        >
          {text}
        </span>
        <span
          style={{
            ...baseStyle,
            position: "absolute",
            left: 0,
            top: 0,
            width: `${clampedProgress * 100}%`,
            overflow: "hidden",
            whiteSpace: "nowrap",
            color: accentColor,
            opacity: 1,
          }}
        >
          {text}
        </span>
      </div>
    );
  }

  // Typewriter style
  if (animation === "typewriter") {
    const visibleChars = Math.floor(text.length * clampedProgress);
    return (
      <span style={baseStyle}>
        {text.slice(0, visibleChars)}
        {clampedProgress < 1 && (
          <span
            style={{
              opacity: Math.floor(frame / 15) % 2 ? 1 : 0,
              color: accentColor,
            }}
          >
            |
          </span>
        )}
      </span>
    );
  }

  return <span style={baseStyle}>{text}</span>;
};
