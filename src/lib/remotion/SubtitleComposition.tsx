/**
 * SubtitleComposition — 纯字幕渲染组件
 *
 * 从 Composition.tsx 提取而来，同时作为：
 * 1. @remotion/player 前端预览组件（React DOM 实时渲染）
 * 2. Remotion 后端渲染组件（headless Chromium 渲染）
 *
 * 前端预览和后端导出共享 100% 相同的 React 组件 + CSS 样式，
 * 彻底解决 Canvas vs Remotion 不一致问题。
 */

import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import type { LyricLine, StyleParams, SubtitleTemplate } from "../types";
import { styleParamsToTemplate, mergeTemplateWithStyle } from "../types";
import type { BeatInfo } from "../beat-detector";

// ============================================================
// Smart word segmentation — supports CJK + Latin text
// ============================================================

/**
 * Segment text into "words" for per-word animation.
 *
 * Uses Intl.Segmenter (available in Node 16+, Chromium 87+) for CJK text
 * with word-level granularity. Falls back to space-splitting for Latin text
 * and character-level splitting for CJK if Intl.Segmenter is unavailable.
 */
function segmentWords(text: string): string[] {
  // Try Intl.Segmenter first (best for Chinese/Japanese/Korean word boundaries)
  try {
    if (typeof Intl !== "undefined" && Intl.Segmenter) {
      const segmenter = new Intl.Segmenter("zh-CN", { granularity: "word" });
      const segments = [...segmenter.segment(text)]
        .filter(s => s.isWordLike)
        .map(s => s.segment);
      if (segments.length > 0) return segments;
    }
  } catch {
    // Intl.Segmenter not available — fall through
  }

  // Fallback: check if text is primarily CJK
  const cjkCount = (text.match(/[\u4e00-\u9fff\u3400-\u4dbf\u3040-\u309f\u30a0-\u30ff\uac00-\ud7af]/g) || []).length;
  if (cjkCount > text.length * 0.3) {
    // CJK text: split by character, then merge Latin/number runs
    const result: string[] = [];
    let buffer = "";
    for (const ch of text) {
      if (/[a-zA-Z0-9]/.test(ch)) {
        buffer += ch;
      } else {
        if (buffer) { result.push(buffer); buffer = ""; }
        if (ch.trim()) result.push(ch);
      }
    }
    if (buffer) result.push(buffer);
    return result.length > 0 ? result : [text];
  }

  // Latin text: space-split
  return text.split(/\s+/).filter(Boolean);
}

// ============================================================
// SubtitleComposition Props
// ============================================================

export interface SubtitleCompositionProps {
  /** 当前歌词行（由父组件按时间查找） */
  currentLine: LyricLine | null;
  /** 当前行进度 0-1 */
  progress: number;
  /** 样式参数 */
  styleParams: StyleParams;
  /** 字幕模板（可选，未提供则从 styleParams 生成） */
  subtitleTemplate?: SubtitleTemplate;
  /** 总行数（用于交替布局计算） */
  totalLines: number;
  /** 画面宽度 */
  width: number;
  /** 画面高度 */
  height: number;
  /** 播放速度倍率（可选，默认 1） */
  speed?: number;
  /** 音频节拍数据（可选，用于鼓点驱动动效） */
  beats?: BeatInfo[];
}

// ============================================================
// SubtitleComposition 组件
// ============================================================

export const SubtitleComposition: React.FC<SubtitleCompositionProps> = ({
  currentLine,
  progress,
  styleParams,
  subtitleTemplate,
  totalLines,
  width,
  height,
  speed = 1,
  beats,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Apply speed: time passes faster with higher speed
  const currentTimeSec = (frame / fps) * speed;

  // Merge styleParams into subtitleTemplate (single source of truth)
  const template = React.useMemo(() => {
    const base = subtitleTemplate || styleParamsToTemplate(styleParams);
    const merged = mergeTemplateWithStyle(base, styleParams);
    return {
      ...merged,
      decoration: styleParams.decoration,
    } as SubtitleTemplate & { decoration?: string[] };
  }, [subtitleTemplate, styleParams]);

  if (!currentLine) {
    return null;
  }

  return (
    <LyricTextRenderer
      text={currentLine.text}
      progress={progress}
      styleParams={styleParams}
      template={template}
      frame={frame}
      lineIndex={currentLine.index}
      totalLines={totalLines}
      width={width}
      height={height}
      wordTimestamps={currentLine.words}
      beats={beats}
      wordPop={styleParams.wordPop ?? false}
    />
  );
};

// ============================================================
// LyricTextRenderer — 核心字幕文字渲染
// 与 Composition.tsx 中的 LyricText 完全一致
// ============================================================

const LyricTextRenderer: React.FC<{
  text: string;
  progress: number;
  styleParams: StyleParams;
  template: SubtitleTemplate & { decoration?: string[] };
  frame: number;
  lineIndex: number;
  totalLines: number;
  width: number;
  height: number;
  wordTimestamps?: import("../types").WordTimestamp[];
  beats?: BeatInfo[];
  wordPop?: boolean;
}> = ({
  text,
  progress,
  styleParams,
  template,
  frame,
  lineIndex,
  totalLines,
  width,
  height,
  wordTimestamps,
  beats,
  wordPop = false,
}) => {
  const { layout, animation, render: renderParams } = template;

  const clampedProgress = Math.max(0, Math.min(1, progress));

  // ── All Caps 处理 ──
  const displayText = renderParams.allCaps ? text.toUpperCase() : text;

  // ── Layout ──
  let posX = layout.positionX;
  const posY = layout.positionY;

  switch (layout.alternateMode) {
    case "alternate": {
      const isEven = lineIndex % 2 === 0;
      posX = isEven
        ? layout.positionX - layout.alternateAmplitude
        : layout.positionX + layout.alternateAmplitude;
      break;
    }
    case "wave": {
      const wavePhase = (lineIndex / Math.max(totalLines - 1, 1)) * Math.PI * 2;
      posX = layout.positionX + Math.sin(wavePhase) * layout.alternateAmplitude;
      break;
    }
    case "random": {
      const pseudoRandom = ((lineIndex * 137 + 53) % 100) / 100;
      posX = layout.positionX + (pseudoRandom - 0.5) * 2 * layout.alternateAmplitude;
      break;
    }
    case "length-adaptive": {
      // 长歌词居中，短歌词两侧交替（根据字符数判断）
      const charCount = text.length;
      const isLong = charCount > 20;
      if (isLong) {
        // 长歌词：保持在中心位置
        posX = layout.positionX;
      } else {
        // 短歌词：两侧交替，增加活力
        const isEven = lineIndex % 2 === 0;
        posX = isEven
          ? layout.positionX - layout.alternateAmplitude * 0.8
          : layout.positionX + layout.alternateAmplitude * 0.8;
      }
      break;
    }
  }

  posX = Math.max(0.08, Math.min(0.92, posX));
  const xPx = posX * width;
  const yPx = posY * height;

  // ── Color ──
  const isEven = lineIndex % 2 === 0;
  const textColor = isEven ? renderParams.primaryColor : renderParams.secondaryColor;

  // ── Animation ──
  let animStyle: React.CSSProperties = {};
  const animType = animation.entrance;
  const entranceDur = animation.entranceDuration;
  const exitDur = animation.exitDuration;
  const lineDuration = entranceDur + exitDur + 0.5;
  const entranceProgress = Math.min(1, clampedProgress / (entranceDur / lineDuration));
  const exitProgress = Math.max(0, (clampedProgress - (1 - exitDur / lineDuration)) / (exitDur / lineDuration));

  switch (animType) {
    case "kinetic-pop": {
      const t = entranceProgress;
      const popScale = t < 0.4
        ? 0.8 + t * 0.7
        : 1.08 - (t - 0.4) * 0.133;
      const finalScale = Math.min(1.08, Math.max(0.8, popScale));
      const bounceY = Math.sin(t * Math.PI * 2.5) * 4 * (1 - t) * (1 - exitProgress);
      const opacity = Math.min(1, t * 3) * (1 - exitProgress);
      animStyle = {
        opacity,
        transform: `translateY(${bounceY}px) scale(${finalScale})`,
      };
      break;
    }
    case "none":
      animStyle = { opacity: 1 };
      break;
    case "fade-in":
      animStyle = {
        opacity: Math.min(1, entranceProgress * 2) * (1 - exitProgress),
        transform: `translateY(${(1 - entranceProgress) * 10 + exitProgress * 10}px)`,
      };
      break;
    case "slide-up":
      animStyle = {
        opacity: Math.min(1, entranceProgress * 2) * (1 - exitProgress),
        transform: `translateY(${(1 - entranceProgress) * 30 + exitProgress * 10}px)`,
      };
      break;
    case "bounce": {
      const t = entranceProgress;
      const bY = Math.sin(t * Math.PI * 2) * 6 * (1 - t) * (1 - exitProgress);
      const bS = 1 + Math.sin(t * Math.PI) * 0.08 * animation.bounciness + Math.sin(t * Math.PI * 3) * 0.03 * (1 - t);
      const driftX = posX < 0.3
        ? Math.sin(t * Math.PI) * 8
        : posX > 0.7
          ? -Math.sin(t * Math.PI) * 8
          : 0;
      animStyle = {
        opacity: Math.min(1, entranceProgress * 2.5) * (1 - exitProgress),
        transform: `translate(${driftX}px, ${bY}px) scale(${bS})`,
      };
      break;
    }
    case "scale-up":
      animStyle = {
        opacity: Math.min(1, entranceProgress * 1.5) * (1 - exitProgress),
        transform: `scale(${0.8 + entranceProgress * 0.3})`,
      };
      break;
    case "karaoke":
    case "typewriter":
      break;
  }

  // ── Curvature ──
  const curvature = layout.curvature;
  const arcTransform = curvature !== 0
    ? `perspective(800px) rotateX(${curvature * 40}deg)`
    : "none";

  // ── Container styles ──
  const containerStyle: React.CSSProperties = {
    position: "absolute",
    left: xPx,
    top: yPx,
    transform: `translate(-50%, -50%) ${arcTransform}`,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    maxWidth: `${(layout.maxWidthRatio || 0.85) * 100}%`,
    overflow: "visible",
    ...animStyle,
  };

  // ── Glow + stroke ──
  const strokeColor = renderParams.strokeColor || "#000000";
  const glowColor = renderParams.glowColor || textColor;
  const glowAlpha = renderParams.glowIntensity || 0.4;
  const glowSpread = Math.round(renderParams.fontSize * 0.5 * glowAlpha);
  const textShadowStyle = [
    `0 0 ${glowSpread}px ${glowColor}`,
    `0 0 ${glowSpread * 2}px ${glowColor}`,
    `-2px -2px 0 ${strokeColor}`,
    `2px -2px 0 ${strokeColor}`,
    `-2px 2px 0 ${strokeColor}`,
    `2px 2px 0 ${strokeColor}`,
    `0 4px 12px rgba(0,0,0,0.7)`,
  ].join(", ");

  // ── Background box ──
  const bgStyle: React.CSSProperties = {};
  if (renderParams.backgroundType !== "none") {
    bgStyle.padding = `${renderParams.paddingY}px ${renderParams.paddingX}px`;
    bgStyle.borderRadius = `${renderParams.borderRadius}px`;
    switch (renderParams.backgroundType) {
      case "solid":
        bgStyle.backgroundColor = renderParams.backgroundColor;
        break;
      case "gradient":
        bgStyle.background = `linear-gradient(135deg, ${renderParams.primaryColor}22, ${renderParams.secondaryColor}33)`;
        break;
      case "glass":
        bgStyle.backgroundColor = renderParams.backgroundColor;
        bgStyle.backdropFilter = "blur(12px)";
        bgStyle.WebkitBackdropFilter = "blur(12px)";
        bgStyle.border = `1px solid ${renderParams.secondaryColor}33`;
        break;
    }
  }

  // ── Karaoke mode ──
  if (animType === "karaoke") {
    const baseStyle: React.CSSProperties = {
      fontFamily: renderParams.fontFamily,
      fontSize: `${renderParams.fontSize}px`,
      fontWeight: renderParams.fontWeight,
      textAlign: "center" as const,
      textShadow: textShadowStyle,
      lineHeight: layout.lineSpacing,
      wordBreak: "break-word" as const,
      whiteSpace: "pre-wrap" as const,
      overflowWrap: "break-word" as const,
      maxWidth: "100%",
      ...bgStyle,
    };
    return (
      <div style={containerStyle}>
        <div style={{ position: "relative", display: "inline-block" }}>
          <span style={{ ...baseStyle, color: renderParams.secondaryColor, opacity: 0.4 }}>
            {displayText}
          </span>
          <span style={{
            ...baseStyle,
            position: "absolute", left: 0, top: 0,
            width: `${clampedProgress * 100}%`,
            overflow: "hidden", whiteSpace: "nowrap",
            color: renderParams.accentColor, opacity: 1,
          }}>
            {displayText}
          </span>
        </div>
      </div>
    );
  }

  // ── Typewriter mode ──
  if (animType === "typewriter") {
    const visibleChars = Math.floor(displayText.length * clampedProgress);
    const baseStyle: React.CSSProperties = {
      fontFamily: renderParams.fontFamily,
      fontSize: `${renderParams.fontSize}px`,
      fontWeight: renderParams.fontWeight,
      color: textColor,
      textAlign: "center" as const,
      textShadow: textShadowStyle,
      lineHeight: layout.lineSpacing,
      wordBreak: "break-word" as const,
      whiteSpace: "pre-wrap" as const,
      overflowWrap: "break-word" as const,
      maxWidth: "100%",
      ...bgStyle,
    };
    return (
      <div style={containerStyle}>
        <div style={{ position: "relative", display: "inline-block" }}>
          <span style={baseStyle}>
            {displayText.slice(0, visibleChars)}
            {clampedProgress < 1 && (
              <span style={{
                opacity: Math.floor(frame / 15) % 2 ? 1 : 0,
                color: renderParams.accentColor,
              }}>|</span>
            )}
          </span>
        </div>
      </div>
    );
  }

  // ── Normal rendering with keyword highlighting and per-word pop animation ──
  const baseStyle: React.CSSProperties = {
    fontFamily: renderParams.fontFamily,
    fontSize: `${renderParams.fontSize}px`,
    fontWeight: renderParams.fontWeight,
    color: textColor,
    textAlign: "center" as const,
    textShadow: textShadowStyle,
    lineHeight: layout.lineSpacing,
    wordBreak: "break-word" as const,
    whiteSpace: "pre-wrap" as const,
    overflowWrap: "break-word" as const,
    maxWidth: "100%",
    ...bgStyle,
  };

  // Keyword highlighting
  const highlightWords = renderParams.highlightWords || [];
  // Smart word splitting: use Intl.Segmenter for CJK text, fall back to space-splitting
  const words = segmentWords(displayText);
  const wordCount = words.length;

  // ── 节拍驱动增强系数 ──
  const { fps } = useVideoConfig();
  const currentTimeSec = frame / fps;
  const beatBoost = React.useMemo(() => {
    if (!beats || beats.length === 0) return 1.0;
    const window = 0.06;
    const nearestBeat = beats.reduce((closest, beat) => {
      const dist = Math.abs(beat.time - currentTimeSec);
      if (dist < window && dist < Math.abs(closest.time - currentTimeSec)) {
        return beat;
      }
      return closest;
    }, beats[0]);
    const dist = Math.abs(nearestBeat.time - currentTimeSec);
    if (dist < window) {
      // 越接近节拍点，增强越强
      return 1.0 + nearestBeat.strength * 0.5 * (1 - dist / window);
    }
    return 1.0;
  }, [beats, currentTimeSec]);

  // Per-word pop animation timing
  const getWordAnimStyle = (wordIndex: number): React.CSSProperties => {
    let wordStart = 0;
    let wordEnd = 0;
    let hasExactTiming = false;

    if (wordTimestamps && wordIndex < wordTimestamps.length) {
      const wt = wordTimestamps[wordIndex];
      const lineStart = wordTimestamps[0]?.start ?? 0;
      const lineEnd = wordTimestamps[wordTimestamps.length - 1]?.end ?? 0;
      const wordLineDuration = Math.max(0.001, lineEnd - lineStart);
      wordStart = (wt.start - lineStart) / wordLineDuration;
      wordEnd = (wt.end - lineStart) / wordLineDuration;
      hasExactTiming = true;
    } else {
      const wordWindow = wordCount > 0 ? 0.8 / wordCount : 0.8;
      const wordStagger = wordCount > 0 ? 0.6 / wordCount : 0;
      wordStart = Math.min(1, wordStagger * wordIndex);
      wordEnd = Math.min(1, wordStart + wordWindow);
    }

    if (clampedProgress < wordStart) {
      return { opacity: 0, transform: "scale(0.8)" };
    }

    const popWindow = hasExactTiming
      ? Math.min(wordEnd - wordStart, 0.15)
      : Math.max(0.001, wordEnd - wordStart);
    const wordProgress = Math.min(1, (clampedProgress - wordStart) / Math.max(0.001, popWindow));

    const t = wordProgress;
    // 节拍增强：在鼓点附近放大弹性回弹幅度
    const popScale = t < 0.35
      ? 0.8 + t * 0.8 * beatBoost
      : 1.08 - (t - 0.35) * 0.123;
    const finalScale = Math.min(1.12, Math.max(0.8, popScale));
    const bounceY = Math.sin(t * Math.PI * 3) * 3 * (1 - t) * beatBoost;
    const opacity = Math.min(1, t * 4);

    return {
      opacity,
      transform: `translateY(${bounceY}px) scale(${finalScale})`,
      display: "inline-block",
    };
  };

  return (
    <div style={containerStyle}>
      <div style={{ position: "relative", display: "inline-block" }}>
        <span style={baseStyle}>
          {wordPop ? (
            words.map((word, i) => {
              const cleanWord = word.replace(/[^a-zA-Z0-9']/g, "").toLowerCase();
              const isHighlighted = highlightWords.some(
                (hw) => hw.toLowerCase() === cleanWord
              );
              const flashAlpha = isHighlighted
                ? 0.7 + 0.3 * Math.sin(frame * 0.3)
                : 1;
              const wordAnim = getWordAnimStyle(i);
              return (
                <span key={i}>
                  {i > 0 && " "}
                  <span
                    style={{
                      ...wordAnim,
                      color: isHighlighted
                        ? renderParams.accentColor
                        : textColor,
                      opacity: isHighlighted
                        ? flashAlpha * (wordAnim.opacity as number || 1)
                        : (wordAnim.opacity || 1),
                      fontSize: isHighlighted
                        ? `${renderParams.fontSize * 1.08}px`
                        : undefined,
                      fontWeight: isHighlighted
                        ? Math.min(900, renderParams.fontWeight + 100)
                        : renderParams.fontWeight,
                      transition: "color 0.1s ease",
                    }}
                  >
                    {word}
                  </span>
                </span>
              );
            })
          ) : (
            <span>{displayText}</span>
          )}
        </span>
      </div>
    </div>
  );
};
