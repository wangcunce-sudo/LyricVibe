/**
 * LyricVibe 全流程展示 Demo Video
 *
 * 展示完整的产品工作流：
 * 1. Intro (0-4s)         — 品牌片头
 * 2. Upload (4-12s)       — 拖拽视频进入页面
 * 3. WhisperX+AI (12-24s) — WhisperX 歌词识别 + 映射为 SRT
 * 4. Control (24-30s)     — 自然语言生成字幕模板 + 各方面调整（无声）
 * 5. Showcase (30-50s)    — 导出成品 + 歌词展示（有声）
 *
 * 总时长: ~50 秒 @30fps
 */

import React from "react";
import {
  useCurrentFrame,
  useVideoConfig,
  AbsoluteFill,
  Audio,
  OffthreadVideo,
  staticFile,
  interpolate,
  spring,
  Sequence,
} from "remotion";
import type { LyricLine, WordTimestamp, StyleParams, SubtitleTemplate } from "../types";

// ── Demo video phases (extended) ──

const PHASE = {
  INTRO:      { start: 0,    end: 120  },  // 0-4s   Brand intro
  UPLOAD:     { start: 120,  end: 360  },  // 4-12s  Drag & drop upload
  WHISPERX:   { start: 360,  end: 720  },  // 12-24s WhisperX + AI analysis + template
  CONTROL:    { start: 720,  end: 900  },  // 24-30s Control panel adjustments (no audio)
  SHOWCASE:   { start: 900,  end: 1500 },  // 30-50s Final lyric showcase with audio
} as const;

const TOTAL_FRAMES = PHASE.SHOWCASE.end; // 1500 frames = 50s @30fps

const FPS = 30;
const WIDTH = 1920;
const HEIGHT = 1080;

// ── Brand Colors ──

const BRAND = {
  sky: "#38BDF8",
  blue: "#2563EB",
  white: "#FFFFFF",
  dark: "#0A1628",
  gray: "#94A3B8",
  accent: "#00E5FF",
  green: "#10B981",
  orange: "#F59E0B",
  pink: "#EC4899",
};

// ── Helper: evenly distribute word timestamps ──

function makeWords(text: string, startTime: number, endTime: number): WordTimestamp[] {
  const rawWords = text.split(" ");
  const duration = endTime - startTime;
  const wordDuration = duration / rawWords.length;
  return rawWords.map((w, i) => ({
    word: w,
    start: startTime + i * wordDuration,
    end: startTime + (i + 1) * wordDuration,
    confidence: 0.85,
  }));
}

// ── Demo lyrics (Opalite) ──

const DEMO_LYRICS: LyricLine[] = [
  { index: 0, text: "Don't you sweat it, baby, it's alright",       startTime: 0.00,  endTime: 2.48,  alignment: "center",
    words: makeWords("Don't you sweat it baby it's alright", 0.00, 2.48) },
  { index: 1, text: "You were dancing through the lightning strikes", startTime: 2.48,  endTime: 6.76,  alignment: "center",
    words: makeWords("You were dancing through the lightning strikes", 2.48, 6.76) },
  { index: 2, text: "Oh, so sleepless in the onyx night",            startTime: 7.88,  endTime: 10.44, alignment: "center",
    words: makeWords("Oh so sleepless in the onyx night", 7.88, 10.44) },
  { index: 3, text: "But now the sky is opalite",                    startTime: 10.44, endTime: 14.34, alignment: "center",
    words: makeWords("But now the sky is opalite", 10.44, 14.34) },
  { index: 4, text: "Oh-oh-oh-oh, oh my Lord",                       startTime: 14.34, endTime: 18.12, alignment: "center",
    words: [
      { word: "Oh-oh-oh-oh", start: 14.34, end: 15.82, confidence: 0.92 },
      { word: "oh", start: 15.82, end: 16.20, confidence: 0.88 },
      { word: "my", start: 16.20, end: 16.55, confidence: 0.95 },
      { word: "Lord", start: 16.55, end: 18.12, confidence: 0.97 },
    ]},
  { index: 5, text: "Never met no one like you before",              startTime: 18.12, endTime: 21.84, alignment: "center",
    words: makeWords("Never met no one like you before", 18.12, 21.84) },
  { index: 6, text: "You had to make your own sunshine",              startTime: 21.84, endTime: 25.64, alignment: "center",
    words: makeWords("You had to make your own sunshine", 21.84, 25.64) },
  { index: 7, text: "But now the sky is opalite",                    startTime: 26.44, endTime: 29.64, alignment: "center",
    words: makeWords("But now the sky is opalite", 26.44, 29.64) },
  { index: 8, text: "Oh-oh-oh-oh, oh",                                startTime: 29.64, endTime: 32.50, alignment: "center",
    words: [
      { word: "Oh-oh-oh-oh", start: 29.64, end: 31.30, confidence: 0.91 },
      { word: "oh", start: 31.30, end: 32.50, confidence: 0.94 },
    ]},
];

// Chinese translations
const LYRICS_CN: Record<number, string> = {
  0: "别担心，宝贝，一切都会好的",
  1: "你曾在闪电中起舞",
  2: "在缟玛瑙之夜辗转难眠",
  3: "但现在天空如猫眼石般璀璨",
  4: "噢，我的主啊",
  5: "从未遇见像你这样的人",
  6: "你不得不自己创造阳光",
  7: "但现在天空如猫眼石般璀璨",
  8: "噢~噢~",
};

const DEMO_STYLE: StyleParams = {
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

const DEMO_TEMPLATE: SubtitleTemplate = {
  name: "Kinetic Typography",
  description: "TikTok-style: Impact bold, All Caps, heavy black stroke, pop animation, keyword highlighting",
  layout: {
    positionX: 0.5, positionY: 0.55,
    alternateMode: "alternate", alternateAmplitude: 0.22,
    curvature: 0, maxWidthRatio: 0.88, lineSpacing: 1.2,
  },
  animation: {
    entrance: "kinetic-pop", entranceDuration: 0.30,
    exit: "fade-in", exitDuration: 0.12,
    bounciness: 0.8, easing: "ease-out",
  },
  render: {
    fontFamily: "'Impact', 'Montserrat', 'Arial Black', 'Noto Sans SC', sans-serif",
    fontSize: 64, fontWeight: 900,
    primaryColor: "#FFFFFF", secondaryColor: "#38BDF8", accentColor: "#00E5FF",
    textShadow: true, glowColor: "#38BDF8", glowIntensity: 0.25,
    strokeWidth: 5, strokeColor: "#000000",
    backgroundType: "none", backgroundColor: "rgba(0,0,0,0.5)",
    paddingX: 20, paddingY: 10, borderRadius: 8,
    allCaps: true,
    highlightWords: ["baby", "dancing", "lightning", "sleepless", "onyx", "opalite", "lord", "never", "sunshine"],
  },
};

// ── Emotion data for AI phase ──

const EMOTIONS = [
  { label: "能量", emoji: "⚡", intensity: 0.95, color: "#FFD700" },
  { label: "凯旋", emoji: "🏆", intensity: 0.88, color: "#FF6B6B" },
  { label: "激情", emoji: "🔥", intensity: 0.82, color: "#FF4500" },
  { label: "喜悦", emoji: "🎉", intensity: 0.75, color: "#4FC3F7" },
];

const THEMES = ["舞动与能量", "电子风暴", "暴风雨到阳光", "自我赋能"];

// WhisperX transcription lines to show
const TRANSCRIPTION_LINES = [
  { time: "00:00.00", text: "Don't you sweat it, baby, it's alright" },
  { time: "00:02.48", text: "You were dancing through the lightning strikes" },
  { time: "00:07.88", text: "Oh, so sleepless in the onyx night" },
  { time: "00:10.44", text: "But now the sky is opalite" },
];

// Template generation prompt text
const TEMPLATE_PROMPT_TEXT = "TikTok风格的粗体大字，白色文字配青色点缀，关键词弹跳动效，厚黑描边";

// ============================================================
// Main Demo Video Composition
// ============================================================

export const DemoVideoComposition: React.FC = () => {
  const frame = useCurrentFrame();

  const phase = getPhase(frame);

  return (
    <AbsoluteFill style={{ backgroundColor: "#0A1628" }}>
      {/* Background video — shared across UPLOAD, WHISPERX, CONTROL, SHOWCASE */}
      <Sequence from={PHASE.UPLOAD.start} durationInFrames={TOTAL_FRAMES - PHASE.UPLOAD.start}>
        <OffthreadVideo
          src={staticFile("demo_mv.mp4")}
          style={{
            position: "absolute",
            width: "100%",
            height: "100%",
            objectFit: "cover",
            opacity: 0.45,
          }}
          muted
        />
      </Sequence>

      {/* Audio — only in SHOWCASE phase (starts at lyrics, NOT at control panel) */}
      <Sequence from={PHASE.SHOWCASE.start}>
        <Audio src={staticFile("demo_audio.mp3")} />
      </Sequence>

      {/* Phase 1: Intro */}
      <Sequence from={PHASE.INTRO.start} durationInFrames={PHASE.INTRO.end - PHASE.INTRO.start}>
        <IntroPhase frame={frame - PHASE.INTRO.start} />
      </Sequence>

      {/* Phase 2: Upload */}
      <Sequence from={PHASE.UPLOAD.start} durationInFrames={PHASE.UPLOAD.end - PHASE.UPLOAD.start}>
        <UploadPhase frame={frame - PHASE.UPLOAD.start} />
      </Sequence>

      {/* Phase 3: WhisperX + AI */}
      <Sequence from={PHASE.WHISPERX.start} durationInFrames={PHASE.WHISPERX.end - PHASE.WHISPERX.start}>
        <WhisperXAIPhase frame={frame - PHASE.WHISPERX.start} />
      </Sequence>

      {/* Phase 4: Control Panel Adjustments (no audio) */}
      <Sequence from={PHASE.CONTROL.start} durationInFrames={PHASE.CONTROL.end - PHASE.CONTROL.start}>
        <ControlPhase frame={frame - PHASE.CONTROL.start} />
      </Sequence>

      {/* Phase 5: Final Lyric Showcase (with audio) */}
      <Sequence from={PHASE.SHOWCASE.start} durationInFrames={PHASE.SHOWCASE.end - PHASE.SHOWCASE.start}>
        <ShowcasePhase frame={frame - PHASE.SHOWCASE.start} />
      </Sequence>

      {/* Transition overlays */}
      <TransitionOverlay frame={frame} />

      {/* Bottom progress bar */}
      <ProgressBar frame={frame} totalFrames={TOTAL_FRAMES} />
    </AbsoluteFill>
  );
};

// ============================================================
// Phase 1: Brand Intro (0-4s)
// ============================================================

const IntroPhase: React.FC<{ frame: number }> = ({ frame }) => {
  const titleSpring = spring({ frame, fps: FPS, config: { damping: 10, mass: 0.8 } });
  const subtitleOpacity = interpolate(frame, [30, 60], [0, 1], { extrapolateRight: "clamp" });
  const birdY = spring({ frame: Math.max(0, frame - 10), fps: FPS, config: { damping: 8, mass: 0.6 } });
  const barWidth = spring({ frame: Math.max(0, frame - 20), fps: FPS, config: { damping: 15 } });

  return (
    <AbsoluteFill
      style={{
        background: "linear-gradient(135deg, #0A1628 0%, #1a3a5c 50%, #0A1628 100%)",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      {/* Animated bird icon */}
      <div
        style={{
          transform: `translateY(${(1 - birdY) * -40}px) scale(${0.5 + birdY * 0.5})`,
          opacity: Math.min(1, frame / 20),
          marginBottom: 24,
        }}
      >
        <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
          <path d="M40 10 C55 15 65 35 60 50 C55 40 45 35 40 38 C35 35 25 40 20 50 C15 35 25 15 40 10Z" fill={BRAND.sky} opacity={0.9} />
          <path d="M40 25 L48 15 L42 28Z" fill={BRAND.accent} />
          <circle cx="44" cy="22" r="3" fill={BRAND.white} />
        </svg>
      </div>

      {/* Main title */}
      <div style={{ transform: `scale(${titleSpring})`, textAlign: "center" }}>
        <h1 style={{
          fontSize: 96, fontWeight: 900,
          background: "linear-gradient(135deg, #38BDF8, #2563EB, #00E5FF)",
          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
          letterSpacing: "-0.03em", lineHeight: 1.1,
        }}>
          LyricVibe
        </h1>
      </div>

      {/* Subtitle */}
      <div style={{ opacity: subtitleOpacity, marginTop: 16, textAlign: "center" }}>
        <p style={{ fontSize: 28, color: BRAND.gray, fontWeight: 500, letterSpacing: "0.05em" }}>
          AI 驱动的歌词字幕 MV 生成器
        </p>
      </div>

      {/* Animated bar */}
      <div style={{ marginTop: 40, width: 240, height: 4, backgroundColor: "rgba(255,255,255,0.1)", borderRadius: 2, overflow: "hidden" }}>
        <div style={{
          height: "100%", width: `${barWidth * 100}%`,
          background: "linear-gradient(90deg, #38BDF8, #2563EB)", borderRadius: 2,
        }} />
      </div>
    </AbsoluteFill>
  );
};

// ============================================================
// Phase 2: Upload — Drag & Drop Video (4-12s)
// ============================================================

const UploadPhase: React.FC<{ frame: number }> = ({ frame }) => {
  const opacity = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: "clamp" });
  const titleY = spring({ frame, fps: FPS, config: { damping: 12 } });

  // Step indicator
  const step1Opacity = interpolate(frame, [0, 15], [0, 1], { extrapolateRight: "clamp" });

  // Cards slide in
  const card1X = spring({ frame: Math.max(0, frame - 25), fps: FPS, config: { damping: 14 } });
  const card2X = spring({ frame: Math.max(0, frame - 50), fps: FPS, config: { damping: 14 } });
  const arrowOpacity = interpolate(frame, [100, 150], [0, 1], { extrapolateRight: "clamp" });

  // Drag indicator animation (simulated drag motion)
  const dragPhase = (frame % 120) / 120;
  const dragX = Math.sin(dragPhase * Math.PI * 2) * 30;
  const dragScale = 1 + Math.sin(dragPhase * Math.PI) * 0.03;

  return (
    <AbsoluteFill
      style={{
        display: "flex", flexDirection: "column",
        justifyContent: "center", alignItems: "center",
        opacity,
      }}
    >
      {/* Step indicator */}
      <div style={{
        display: "flex", alignItems: "center", gap: 10,
        marginBottom: 10,
        transform: `translateY(${(1 - titleY) * -30}px)`,
        opacity: step1Opacity,
      }}>
        <StepBadge num={1} color={BRAND.sky} />
        <span style={{ fontSize: 22, color: BRAND.white, fontWeight: 600 }}>上传素材</span>
      </div>

      <h2 style={{
        fontSize: 40, fontWeight: 700, color: BRAND.white,
        marginBottom: 44,
        transform: `translateY(${(1 - titleY) * -20}px)`,
      }}>
        拖拽视频和音频，开始创作
      </h2>

      {/* Upload cards — matching FileUpload.tsx UI */}
      <div style={{ display: "flex", gap: 32 }}>
        {/* Video card */}
        <div style={{
          width: 380, height: 300,
          borderRadius: 20,
          border: "3px dashed rgba(56, 189, 248, 0.5)",
          background: "rgba(56, 189, 248, 0.08)",
          display: "flex", flexDirection: "column",
          justifyContent: "center", alignItems: "center",
          gap: 14,
          transform: `translateX(${(1 - card1X) * -80}px) scale(${dragScale})`,
          opacity: card1X,
        }}>
          {/* Video icon */}
          <svg width="52" height="52" viewBox="0 0 56 56" fill="none">
            <rect x="8" y="12" width="40" height="32" rx="6" stroke={BRAND.sky} strokeWidth="2.5" />
            <polygon points="22,18 22,38 40,28" fill={BRAND.sky} opacity="0.8" />
          </svg>
          <span style={{ fontSize: 22, fontWeight: 600, color: BRAND.sky }}>上传视频</span>
          <span style={{ fontSize: 14, color: BRAND.gray }}>MP4, MOV, WebM</span>
          <span style={{
            padding: "4px 16px", borderRadius: 99,
            background: "rgba(56, 189, 248, 0.2)",
            color: BRAND.sky, fontSize: 13, fontWeight: 700,
          }}>必需</span>

          {/* Animated "dragging file" indicator */}
          <div style={{
            position: "absolute", bottom: 30,
            transform: `translateX(${dragX}px)`,
            opacity: 0.6,
          }}>
            <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
              <rect x="6" y="4" width="24" height="28" rx="4" stroke={BRAND.sky} strokeWidth="2" />
              <line x1="12" y1="14" x2="24" y2="14" stroke={BRAND.sky} strokeWidth="1.5" />
              <line x1="12" y1="19" x2="24" y2="19" stroke={BRAND.sky} strokeWidth="1.5" />
              <line x1="12" y1="24" x2="18" y2="24" stroke={BRAND.sky} strokeWidth="1.5" />
            </svg>
          </div>
        </div>

        {/* Arrow connector */}
        <div style={{
          display: "flex", alignItems: "center",
          opacity: arrowOpacity,
        }}>
          <svg width="36" height="36" viewBox="0 0 40 40">
            <line x1="4" y1="20" x2="32" y2="20" stroke={BRAND.gray} strokeWidth="2" strokeDasharray="4 4" />
            <polygon points="28,12 36,20 28,28" fill={BRAND.gray} />
          </svg>
        </div>

        {/* Audio card */}
        <div style={{
          width: 380, height: 300,
          borderRadius: 20,
          border: "3px dashed rgba(148, 163, 184, 0.3)",
          background: "rgba(148, 163, 184, 0.05)",
          display: "flex", flexDirection: "column",
          justifyContent: "center", alignItems: "center",
          gap: 14,
          transform: `translateX(${(1 - card2X) * -60}px)`,
          opacity: card2X,
        }}>
          <svg width="52" height="52" viewBox="0 0 56 56" fill="none">
            <circle cx="28" cy="28" r="20" stroke={BRAND.gray} strokeWidth="2.5" />
            <path d="M22 24 L22 32 M26 20 L26 36 M30 18 L30 38 M34 22 L34 34" stroke={BRAND.gray} strokeWidth="2.5" strokeLinecap="round" />
          </svg>
          <span style={{ fontSize: 22, fontWeight: 600, color: BRAND.gray }}>上传音频</span>
          <span style={{ fontSize: 14, color: BRAND.gray }}>MP3, WAV, AAC</span>
          <span style={{
            padding: "4px 16px", borderRadius: 99,
            background: "rgba(148, 163, 184, 0.15)",
            color: BRAND.gray, fontSize: 13, fontWeight: 600,
          }}>可选</span>
        </div>
      </div>

      {/* Hint */}
      <p style={{ marginTop: 40, fontSize: 15, color: "rgba(148, 163, 184, 0.7)" }}>
        💡 不上传音频时，将自动从视频中提取音轨
      </p>
    </AbsoluteFill>
  );
};

// ============================================================
// Phase 3: WhisperX + AI Analysis (12-24s)
// ============================================================

const WhisperXAIPhase: React.FC<{ frame: number }> = ({ frame }) => {
  const opacity = interpolate(frame, [0, 15], [0, 1], { extrapolateRight: "clamp" });
  const titleY = spring({ frame, fps: FPS, config: { damping: 12 } });

  // Sub-phase timing
  const localFrame = frame;
  // 0-180: WhisperX transcription (6s)
  // 180-360: AI analysis + template generation (6s)
  const isTranscribePhase = localFrame < 180;

  // Scanning line
  const scanY = interpolate(localFrame % 90, [0, 90], [0, 100], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill
      style={{
        display: "flex", flexDirection: "column",
        justifyContent: "center", alignItems: "center",
        opacity,
      }}
    >
      {/* Step indicator */}
      <div style={{
        display: "flex", alignItems: "center", gap: 10,
        marginBottom: 10,
        transform: `translateY(${(1 - titleY) * -30}px)`,
      }}>
        <StepBadge num={2} color={BRAND.accent} />
        <span style={{ fontSize: 22, color: BRAND.white, fontWeight: 600 }}>
          {isTranscribePhase ? "WhisperX 歌词识别" : "AI 分析 & 模板生成"}
        </span>
      </div>

      <h2 style={{
        fontSize: 38, fontWeight: 700, color: BRAND.white,
        marginBottom: 36,
        transform: `translateY(${(1 - titleY) * -20}px)`,
      }}>
        {isTranscribePhase ? "Demucs 音源分离 → WhisperX 转录 → SRT 字幕" : "情感分析 → 智能模板 → 实时预览"}
      </h2>

      {/* Main panel */}
      <div style={{
        width: 860,
        background: "rgba(15, 30, 50, 0.92)",
        borderRadius: 20,
        border: "1px solid rgba(56, 189, 248, 0.2)",
        padding: "36px 44px",
      }}>
        {isTranscribePhase ? (
          <WhisperXPanel frame={localFrame} />
        ) : (
          <AIAnalysisPanel frame={localFrame - 180} />
        )}
      </div>
    </AbsoluteFill>
  );
};

/** WhisperX transcription sub-panel */
const WhisperXPanel: React.FC<{ frame: number }> = ({ frame }) => {
  const scanY = interpolate(frame % 90, [0, 90], [0, 100], { extrapolateRight: "clamp" });

  return (
    <>
      {/* Pipeline visualization */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 0, marginBottom: 24 }}>
        <PipelineStep label="视频+音频" active={frame > 20} color={BRAND.sky} />
        <PipelineArrow progress={frame > 40 ? 1 : 0} />
        <PipelineStep label="Demucs\n音源分离" active={frame > 50} color={BRAND.accent} />
        <PipelineArrow progress={frame > 70 ? 1 : 0} />
        <PipelineStep label="WhisperX\nlarge-v3" active={frame > 80} color={BRAND.pink} />
        <PipelineArrow progress={frame > 100 ? 1 : 0} />
        <PipelineStep label="SRT 字幕\n时间轴" active={frame > 110} color={BRAND.green} />
      </div>

      {/* Waveform visualization */}
      <div style={{
        height: 110, background: "rgba(0,0,0,0.35)",
        borderRadius: 12, marginBottom: 20,
        position: "relative", overflow: "hidden",
      }}>
        {/* Waveform bars */}
        {Array.from({ length: 50 }).map((_, i) => {
          const h = 18 + Math.sin(i * 0.45) * 12 + Math.sin(i * 1.2 + frame * 0.08) * 28;
          const isActive = i < frame * 0.55;
          return (
            <div key={i} style={{
              position: "absolute",
              left: `${(i / 50) * 100}%`,
              bottom: "50%", width: 5,
              height: h, transform: "translateY(50%)",
              backgroundColor: isActive ? BRAND.sky : "rgba(56,189,248,0.12)",
              borderRadius: 3,
            }} />
          );
        })}
        {/* Scanning line */}
        <div style={{
          position: "absolute", left: 0, right: 0,
          top: `${scanY}%`, height: 2,
          background: BRAND.accent,
          boxShadow: "0 0 20px rgba(0,229,255,0.6)",
        }} />
        {/* Status text */}
        <div style={{
          position: "absolute", inset: 0,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <span style={{
            color: BRAND.sky, fontSize: 16, fontWeight: 500,
            background: "rgba(10,22,40,0.85)", padding: "6px 20px", borderRadius: 8,
          }}>
            ⏳ Demucs 音源分离 + Faster-Whisper large-v3 转录中...
          </span>
        </div>
      </div>

      {/* SRT transcription results appearing line by line */}
      <div style={{
        background: "rgba(0,0,0,0.25)", borderRadius: 12,
        padding: "16px 20px", fontFamily: "monospace",
      }}>
        <div style={{ fontSize: 12, color: BRAND.gray, marginBottom: 10, fontWeight: 600 }}>
          📝 生成的 SRT 字幕
        </div>
        {TRANSCRIPTION_LINES.map((line, i) => {
          const lineAppear = interpolate(frame, [90 + i * 25, 105 + i * 25], [0, 1], { extrapolateRight: "clamp" });
          const lineX = interpolate(frame, [90 + i * 25, 105 + i * 25], [20, 0], { extrapolateRight: "clamp" });
          return (
            <div key={i} style={{
              opacity: lineAppear,
              transform: `translateX(${lineX}px)`,
              fontSize: 13, color: i < 2 ? BRAND.green : BRAND.gray,
              marginBottom: 4, lineHeight: 1.6,
            }}>
              <span style={{ color: BRAND.sky, marginRight: 8 }}>{i + 1}</span>
              <span style={{ color: BRAND.gray, marginRight: 8 }}>{line.time}</span>
              <span style={{ color: BRAND.white }}>{line.text}</span>
            </div>
          );
        })}
        {frame > 150 && (
          <div style={{
            marginTop: 8, fontSize: 12, color: BRAND.gray,
            opacity: interpolate(frame, [150, 165], [0, 1], { extrapolateRight: "clamp" }),
          }}>
            ... 共识别 9 行歌词，含词级时间戳
          </div>
        )}
      </div>
    </>
  );
};

/** AI Analysis sub-panel */
const AIAnalysisPanel: React.FC<{ frame: number }> = ({ frame }) => {
  return (
    <>
      {/* Emotion bars */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 20 }}>
        <span style={{ fontSize: 16, color: BRAND.gray, fontWeight: 600, marginBottom: 2 }}>
          🎭 情感分析
        </span>
        {EMOTIONS.map((emotion, i) => {
          const barDelay = i * 12;
          const barProgress = frame > 30 + barDelay
            ? spring({ frame: frame - 30 - barDelay, fps: FPS, config: { damping: 12 } })
            : 0;
          return (
            <div key={emotion.label} style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ width: 32, textAlign: "center", fontSize: 22 }}>{emotion.emoji}</span>
              <span style={{ width: 60, fontSize: 15, color: BRAND.gray, fontWeight: 500 }}>
                {emotion.label}
              </span>
              <div style={{ flex: 1, height: 10, backgroundColor: "rgba(255,255,255,0.06)", borderRadius: 5, overflow: "hidden" }}>
                <div style={{
                  height: "100%",
                  width: `${barProgress * emotion.intensity * 100}%`,
                  backgroundColor: emotion.color, borderRadius: 5,
                }} />
              </div>
              <span style={{ width: 40, fontSize: 14, color: emotion.color, fontWeight: 600, textAlign: "right" }}>
                {Math.round(barProgress * emotion.intensity * 100)}%
              </span>
            </div>
          );
        })}
      </div>

      {/* Theme tags */}
      {frame > 70 && (
        <div style={{ marginBottom: 20, display: "flex", gap: 10, flexWrap: "wrap" }}>
          <span style={{ fontSize: 14, color: BRAND.gray, fontWeight: 600, marginRight: 8, alignSelf: "center" }}>🏷️ 主题:</span>
          {THEMES.map((theme, i) => {
            const tagOpacity = interpolate(frame, [70 + i * 15, 85 + i * 15], [0, 1], { extrapolateRight: "clamp" });
            return (
              <span key={theme} style={{
                padding: "4px 14px", borderRadius: 99,
                background: "rgba(56, 189, 248, 0.15)",
                color: BRAND.sky, fontSize: 13, fontWeight: 500,
                opacity: tagOpacity,
              }}>{theme}</span>
            );
          })}
        </div>
      )}

      {/* Natural language template generation */}
      {frame > 100 && (
        <div style={{
          opacity: interpolate(frame, [100, 120], [0, 1], { extrapolateRight: "clamp" }),
          background: "rgba(0,0,0,0.3)", borderRadius: 14,
          padding: "18px 22px",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <span style={{ fontSize: 14, color: BRAND.gray, fontWeight: 600 }}>🤖 自然语言 → 字幕模板</span>
          </div>
          <div style={{
            background: "rgba(56, 189, 248, 0.08)", borderRadius: 10,
            border: "1px solid rgba(56, 189, 248, 0.15)",
            padding: "14px 18px",
            display: "flex", alignItems: "center", gap: 12,
          }}>
            <span style={{ fontSize: 14, color: BRAND.sky }}>💬</span>
            <span style={{
              fontSize: 15, color: BRAND.white,
              overflow: "hidden", whiteSpace: "nowrap",
              width: `${Math.min(100, frame - 100) * 3}%`,
            }}>
              {TEMPLATE_PROMPT_TEXT}
            </span>
          </div>
          {frame > 150 && (
            <div style={{
              marginTop: 12, padding: "10px 16px",
              background: "rgba(16, 185, 129, 0.1)", borderRadius: 8,
              border: "1px solid rgba(16, 185, 129, 0.2)",
              display: "flex", alignItems: "center", gap: 8,
              opacity: interpolate(frame, [150, 165], [0, 1], { extrapolateRight: "clamp" }),
            }}>
              <span style={{ fontSize: 18 }}>✅</span>
              <span style={{ fontSize: 14, color: BRAND.green, fontWeight: 500 }}>
                已生成 "Kinetic Typography" 模板 — Impact 粗体 · All Caps · 厚黑描边 · Pop 动效
              </span>
            </div>
          )}
        </div>
      )}
    </>
  );
};

// ============================================================
// Phase 4: Control Panel Adjustments (24-30s, no audio)
// ============================================================

const ControlPhase: React.FC<{ frame: number }> = ({ frame }) => {
  return (
    <AbsoluteFill style={{ backgroundColor: "#111" }}>
      {/* Background video full screen */}
      <OffthreadVideo
        src={staticFile("demo_mv.mp4")}
        style={{
          position: "absolute", width: "100%", height: "100%",
          objectFit: "cover",
        }}
        muted
      />

      {/* Dark overlay */}
      <div style={{
        position: "absolute", inset: 0,
        background: "linear-gradient(to top, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.08) 40%, rgba(0,0,0,0.4) 100%)",
      }} />

      <ControlAdjustmentsPanel frame={frame} />

      {/* Brand watermark */}
      <Watermark frame={frame} />
    </AbsoluteFill>
  );
};

// ============================================================
// Phase 5: Final Lyric Showcase (30-50s, with audio)
// ============================================================

const ShowcasePhase: React.FC<{ frame: number }> = ({ frame }) => {
  return (
    <AbsoluteFill style={{ backgroundColor: "#111" }}>
      {/* Background video full screen */}
      <OffthreadVideo
        src={staticFile("demo_mv.mp4")}
        style={{
          position: "absolute", width: "100%", height: "100%",
          objectFit: "cover",
        }}
        muted
      />

      {/* Dark overlay */}
      <div style={{
        position: "absolute", inset: 0,
        background: "linear-gradient(to top, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.08) 40%, rgba(0,0,0,0.4) 100%)",
      }} />

      <LyricShowcasePanel frame={frame} />

      {/* Brand watermark */}
      <Watermark frame={frame} />
    </AbsoluteFill>
  );
};

/** Control panel adjustments visualization */
const ControlAdjustmentsPanel: React.FC<{ frame: number }> = ({ frame }) => {
  const panelX = spring({ frame, fps: FPS, config: { damping: 14 } });

  // Tab switching animation
  const tabs = ["样式", "滤镜", "音频", "高级"];
  const currentTabIndex = Math.floor(frame / 45) % tabs.length;
  const currentTab = tabs[currentTabIndex];

  return (
    <AbsoluteFill style={{
      display: "flex", flexDirection: "column",
      justifyContent: "center", alignItems: "center",
    }}>
      {/* Step indicator */}
      <div style={{
        display: "flex", alignItems: "center", gap: 10,
        marginBottom: 24,
        opacity: interpolate(frame, [0, 15], [0, 1], { extrapolateRight: "clamp" }),
      }}>
        <StepBadge num={3} color={BRAND.green} />
        <span style={{ fontSize: 22, color: BRAND.white, fontWeight: 600 }}>调整样式 & 导出</span>
      </div>

      {/* Right-side control panel simulation */}
      <div style={{
        width: 420,
        background: "rgba(255,255,255,0.95)",
        borderRadius: 18,
        overflow: "hidden",
        boxShadow: "0 25px 60px rgba(0,0,0,0.4)",
        transform: `translateX(${(1 - panelX) * 80}px)`,
      }}>
        {/* Panel header — Tab bar */}
        <div style={{
          display: "flex", borderBottom: "1px solid #E5E7EB",
          background: "#F8FAFC",
        }}>
          {tabs.map((tab, i) => {
            const isActive = i === currentTabIndex;
            return (
              <div key={tab} style={{
                flex: 1, padding: "12px 8px",
                textAlign: "center",
                fontSize: 13, fontWeight: isActive ? 600 : 400,
                color: isActive ? BRAND.blue : "#9CA3AF",
                borderBottom: isActive ? `2px solid ${BRAND.blue}` : "2px solid transparent",
                background: isActive ? "white" : "transparent",
                transition: "all 0.3s",
              }}>
                {tab}
              </div>
            );
          })}
        </div>

        {/* Panel content */}
        <div style={{ padding: "20px 24px" }}>
          {currentTabIndex === 0 && <StyleTabContent />}
          {currentTabIndex === 1 && <FilterTabContent />}
          {currentTabIndex === 2 && <AudioTabContent />}
          {currentTabIndex === 3 && <AdvancedTabContent />}
        </div>

        {/* Export button */}
        <div style={{
          padding: "16px 24px", borderTop: "1px solid #E5E7EB",
          display: "flex", justifyContent: "center",
        }}>
          <div style={{
            width: "100%", padding: "12px",
            background: "linear-gradient(135deg, #38BDF8, #2563EB)",
            borderRadius: 10,
            textAlign: "center",
            color: BRAND.white, fontSize: 16, fontWeight: 700,
            boxShadow: "0 4px 14px rgba(56, 189, 248, 0.3)",
          }}>
            ⬇️ 导出视频
          </div>
        </div>
      </div>

      {/* Export progress overlay after adjustment phase */}
      {frame > 160 && (
        <div style={{
          position: "absolute", inset: 0,
          background: "rgba(0,0,0,0.75)",
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
          opacity: interpolate(frame, [160, 175], [0, 1], { extrapolateRight: "clamp" }),
        }}>
          <div style={{ width: 320, textAlign: "center" }}>
            <div style={{
              width: 56, height: 56, borderRadius: "50%",
              background: "linear-gradient(135deg, #38BDF8, #2563EB)",
              display: "flex", alignItems: "center", justifyContent: "center",
              margin: "0 auto 16px",
              animation: "pulse 2s infinite",
            }}>
              <div style={{
                width: 24, height: 24,
                border: "3px solid white",
                borderTopColor: "transparent",
                borderRadius: "50%",
                animation: "spin 1s linear infinite",
              }} />
            </div>
            <div style={{ fontSize: 20, fontWeight: 700, color: BRAND.white, marginBottom: 8 }}>
              正在渲染视频...
            </div>
            <div style={{ fontSize: 13, color: BRAND.gray, marginBottom: 20 }}>
              合成画面 · 渲染字幕 · 编码输出
            </div>
            {/* Progress bar */}
            <div style={{
              width: "100%", height: 6,
              background: "rgba(255,255,255,0.1)", borderRadius: 3,
              overflow: "hidden",
            }}>
              <div style={{
                height: "100%",
                width: `${Math.min(100, (frame - 160) * 6)}%`,
                background: "linear-gradient(90deg, #38BDF8, #2563EB)",
                borderRadius: 3,
              }} />
            </div>
            <div style={{ fontSize: 13, color: BRAND.sky, marginTop: 8, fontWeight: 600 }}>
              {Math.min(99, (frame - 160) * 6)}%
            </div>
          </div>
        </div>
      )}
    </AbsoluteFill>
  );
};

/** Style tab mock content */
const StyleTabContent: React.FC = () => (
  <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
    <div style={{ display: "flex", gap: 8 }}>
      <ColorSwatch color="#FFFFFF" active />
      <ColorSwatch color="#38BDF8" />
      <ColorSwatch color="#00E5FF" />
      <ColorSwatch color="#FF6B6B" />
    </div>
    <div style={{ display: "flex", gap: 8 }}>
      <Chip label="kinetic-pop" active />
      <Chip label="bounce" />
      <Chip label="fade-in" />
      <Chip label="typewriter" />
    </div>
    <div style={{ fontSize: 12, color: "#9CA3AF", marginTop: 4 }}>
      字体: Impact 900 · 64px · All Caps · 厚黑描边
    </div>
  </div>
);

/** Filter tab mock content */
const FilterTabContent: React.FC = () => (
  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
    {["原始", "复古", "胶片", "清新", "黑白", "暖调", "冷调", "褪色"].map((f, i) => (
      <div key={f} style={{
        padding: "6px 14px", borderRadius: 8,
        background: i === 0 ? "rgba(56, 189, 248, 0.12)" : "#F3F4F6",
        border: i === 0 ? "1px solid rgba(56, 189, 248, 0.3)" : "1px solid #E5E7EB",
        fontSize: 12, fontWeight: i === 0 ? 600 : 400,
        color: i === 0 ? BRAND.blue : "#6B7280",
      }}>{f}</div>
    ))}
  </div>
);

/** Audio tab mock content */
const AudioTabContent: React.FC = () => (
  <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
    <div>
      <div style={{ fontSize: 12, color: "#6B7280", marginBottom: 4 }}>速度 1.0x</div>
      <div style={{
        height: 6, background: "#E5E7EB", borderRadius: 3,
        position: "relative",
      }}>
        <div style={{
          position: "absolute", left: "50%", top: -4,
          width: 14, height: 14, borderRadius: "50%",
          background: BRAND.blue, boxShadow: "0 2px 6px rgba(37, 99, 235, 0.4)",
        }} />
      </div>
    </div>
    <div>
      <div style={{ fontSize: 12, color: "#6B7280", marginBottom: 4 }}>音高 0 semitones</div>
      <div style={{
        height: 6, background: "#E5E7EB", borderRadius: 3,
        position: "relative",
      }}>
        <div style={{
          position: "absolute", left: "50%", top: -4,
          width: 14, height: 14, borderRadius: "50%",
          background: BRAND.blue, boxShadow: "0 2px 6px rgba(37, 99, 235, 0.4)",
        }} />
      </div>
    </div>
  </div>
);

/** Advanced tab mock content */
const AdvancedTabContent: React.FC = () => (
  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
    <div style={{ fontSize: 12, color: "#6B7280" }}>画幅比例</div>
    <div style={{ display: "flex", gap: 8 }}>
      {["16:9", "9:16", "1:1", "4:3"].map((ratio, i) => (
        <div key={ratio} style={{
          padding: "6px 14px", borderRadius: 8,
          background: i === 0 ? "rgba(56, 189, 248, 0.12)" : "#F3F4F6",
          border: i === 0 ? "1px solid rgba(56, 189, 248, 0.3)" : "1px solid #E5E7EB",
          fontSize: 12, fontWeight: i === 0 ? 600 : 400,
          color: i === 0 ? BRAND.blue : "#6B7280",
        }}>{ratio}</div>
      ))}
    </div>
    <div style={{ fontSize: 12, color: "#6B7280", marginTop: 4 }}>
      帧率: 30fps · 分辨率: 1920×1080
    </div>
  </div>
);

/** Final lyric showcase — the actual result */
const LyricShowcasePanel: React.FC<{ frame: number }> = ({ frame }) => {
  const fps = FPS;
  const currentTimeSec = frame / fps;

  const currentLine = DEMO_LYRICS.find(
    (l) => currentTimeSec >= l.startTime && currentTimeSec < l.endTime
  );

  const progress = currentLine
    ? (currentTimeSec - currentLine.startTime) / (currentLine.endTime - currentLine.startTime)
    : 0;

  return (
    <AbsoluteFill
      style={{
        display: "flex", flexDirection: "column",
        justifyContent: "center",
        padding: `${HEIGHT * 0.05}px ${WIDTH * 0.08}px`,
        pointerEvents: "none", overflow: "hidden",
      }}
    >
      {currentLine && (
        <LyricText
          text={currentLine.text}
          translation={LYRICS_CN[currentLine.index]}
          progress={progress}
          styleParams={DEMO_STYLE}
          template={DEMO_TEMPLATE}
          frame={frame}
          lineIndex={currentLine.index}
          totalLines={DEMO_LYRICS.length}
          width={WIDTH}
          height={HEIGHT}
          wordTimestamps={currentLine.words}
        />
      )}

      {/* "Export Complete" badge after lyrics finish */}
      {frame > 950 && (
        <div style={{
          position: "absolute", top: 60, left: "50%",
          transform: `translateX(-50%)`,
          opacity: interpolate(frame, [950, 970], [0, 1], { extrapolateRight: "clamp" }),
        }}>
          <span style={{
            padding: "8px 24px", borderRadius: 99,
            background: "rgba(16, 185, 129, 0.15)",
            border: "1px solid rgba(16, 185, 129, 0.3)",
            color: BRAND.green, fontSize: 16, fontWeight: 600,
          }}>
            ✅ 导出完成 — Made with LyricVibe
          </span>
        </div>
      )}
    </AbsoluteFill>
  );
};

// ============================================================
// Reusable Components
// ============================================================

/** Phase detection */
function getPhase(frame: number) {
  if (frame < PHASE.INTRO.end) return "intro";
  if (frame < PHASE.UPLOAD.end) return "upload";
  if (frame < PHASE.WHISPERX.end) return "whisperx";
  if (frame < PHASE.CONTROL.end) return "control";
  return "showcase";
}

/** Step badge */
const StepBadge: React.FC<{ num: number; color: string }> = ({ num, color }) => (
  <span style={{
    width: 34, height: 34, borderRadius: "50%",
    background: color,
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: 17, color: "#0A1628", fontWeight: 700,
  }}>{num}</span>
);

/** Pipeline step */
const PipelineStep: React.FC<{ label: string; active: boolean; color: string }> = ({ label, active, color }) => (
  <div style={{
    display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
    opacity: active ? 1 : 0.3,
  }}>
    <div style={{
      width: 40, height: 40, borderRadius: 12,
      background: active ? `${color}20` : "rgba(255,255,255,0.05)",
      border: `2px solid ${active ? color : "rgba(255,255,255,0.1)"}`,
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      <div style={{
        width: 12, height: 12, borderRadius: "50%",
        background: active ? color : "transparent",
      }} />
    </div>
    <span style={{
      fontSize: 11, color: active ? color : BRAND.gray,
      fontWeight: 500, textAlign: "center", whiteSpace: "pre-line",
      lineHeight: 1.4,
    }}>{label}</span>
  </div>
);

/** Pipeline arrow */
const PipelineArrow: React.FC<{ progress: number }> = ({ progress }) => (
  <div style={{ width: 50, display: "flex", alignItems: "center", paddingBottom: 24 }}>
    <svg width="50" height="20" viewBox="0 0 50 20">
      <line x1="4" y1="10" x2="42" y2="10" stroke={BRAND.gray} strokeWidth="1.5" strokeDasharray="3 3" opacity={0.4} />
      <polygon points="38,5 46,10 38,15" fill={BRAND.gray} opacity={0.5 + progress * 0.5} />
    </svg>
  </div>
);

/** Color swatch */
const ColorSwatch: React.FC<{ color: string; active?: boolean }> = ({ color, active }) => (
  <div style={{
    width: 32, height: 32, borderRadius: 8,
    background: color,
    border: active ? `3px solid ${BRAND.blue}` : "2px solid #E5E7EB",
    boxShadow: active ? "0 0 8px rgba(37, 99, 235, 0.3)" : "none",
  }} />
);

/** Chip / tag */
const Chip: React.FC<{ label: string; active?: boolean }> = ({ label, active }) => (
  <span style={{
    padding: "5px 12px", borderRadius: 8,
    background: active ? "rgba(56, 189, 248, 0.12)" : "#F3F4F6",
    border: active ? "1px solid rgba(56, 189, 248, 0.3)" : "1px solid #E5E7EB",
    fontSize: 12, fontWeight: active ? 600 : 400,
    color: active ? BRAND.blue : "#6B7280",
  }}>{label}</span>
);

/** Smooth fade transitions */
const TransitionOverlay: React.FC<{ frame: number }> = ({ frame }) => {
  const transitions = [
    { at: PHASE.INTRO.end },
    { at: PHASE.UPLOAD.end },
    { at: PHASE.WHISPERX.end },
    { at: PHASE.CONTROL.end },
  ];

  return (
    <>
      {transitions.map((t, i) => {
        const relFrame = frame - t.at;
        if (relFrame < -20 || relFrame > 20) return null;
        const opacity = interpolate(relFrame, [-20, 0, 20], [0, 1, 0], {
          extrapolateLeft: "clamp", extrapolateRight: "clamp",
        });
        return (
          <div key={i} style={{
            position: "absolute", inset: 0,
            backgroundColor: "#0A1628", opacity,
            pointerEvents: "none",
          }} />
        );
      })}
    </>
  );
};

/** Bottom progress bar */
const ProgressBar: React.FC<{ frame: number; totalFrames: number }> = ({ frame, totalFrames }) => {
  const progress = Math.min(1, frame / totalFrames);
  const phase = getPhase(frame);
  const phaseLabels: Record<string, string> = {
    intro: "品牌片头",
    upload: "拖拽上传",
    whisperx: "WhisperX + AI 分析",
    control: "字幕模板 & 调整",
    showcase: "导出成品",
  };

  return (
    <div style={{
      position: "absolute", bottom: 0, left: 0, right: 0,
      height: 4, background: "rgba(255,255,255,0.06)",
    }}>
      <div style={{
        height: "100%", width: `${progress * 100}%`,
        background: "linear-gradient(90deg, #38BDF8, #2563EB, #00E5FF)",
        borderRadius: "0 2px 2px 0",
      }} />
      <div style={{
        position: "absolute", bottom: 10, right: 20,
        fontSize: 11, color: "rgba(255,255,255,0.3)", fontWeight: 500,
      }}>
        {phaseLabels[phase]}
      </div>
    </div>
  );
};

/** Brand watermark */
const Watermark: React.FC<{ frame: number }> = ({ frame }) => {
  const opacity = interpolate(frame, [0, 60], [0, 0.55], { extrapolateRight: "clamp" });

  return (
    <div style={{
      position: "absolute", bottom: 50, left: 0, right: 0,
      textAlign: "center", opacity,
    }}>
      <span style={{
        fontSize: 16, fontWeight: 600, color: BRAND.white,
        background: "rgba(0,0,0,0.5)", padding: "6px 22px",
        borderRadius: 99, letterSpacing: "0.05em",
      }}>
        Made with <span style={{ color: BRAND.sky }}>LyricVibe</span>
      </span>
    </div>
  );
};

// ============================================================
// Lyric Text Component — Kinetic Typography 风格
// ============================================================

const LyricText: React.FC<{
  text: string;
  translation?: string;
  progress: number;
  styleParams: StyleParams;
  template: SubtitleTemplate;
  frame: number;
  lineIndex: number;
  totalLines: number;
  width: number;
  height: number;
  wordTimestamps?: WordTimestamp[];
}> = ({
  text, translation, progress, styleParams, template,
  frame, lineIndex, totalLines, width, height, wordTimestamps,
}) => {
  const { layout, animation, render: renderParams } = template;
  const clampedProgress = Math.max(0, Math.min(1, progress));
  const hasTranslation = !!translation;

  const displayText = renderParams.allCaps ? text.toUpperCase() : text;

  // Layout positioning
  let posX = layout.positionX;
  const posY = layout.positionY;
  const isEven = lineIndex % 2 === 0;

  switch (layout.alternateMode) {
    case "alternate":
      posX = isEven ? layout.positionX - layout.alternateAmplitude : layout.positionX + layout.alternateAmplitude;
      break;
    case "wave": {
      const wavePhase = (lineIndex / Math.max(totalLines - 1, 1)) * Math.PI * 2;
      posX = layout.positionX + Math.sin(wavePhase) * layout.alternateAmplitude;
      break;
    }
  }
  posX = Math.max(0.08, Math.min(0.92, posX));

  const xPx = posX * width;
  const yPx = posY * height;

  // Color alternation
  const primaryColor = isEven ? renderParams.primaryColor : renderParams.secondaryColor;
  const secondaryColor = isEven ? renderParams.secondaryColor : renderParams.primaryColor;

  // Animation
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
      const popScale = t < 0.4 ? 0.8 + t * 0.7 : 1.08 - (t - 0.4) * 0.133;
      const finalScale = Math.min(1.08, Math.max(0.8, popScale));
      const bounceY = Math.sin(t * Math.PI * 2.5) * 4 * (1 - t) * (1 - exitProgress);
      const opacity = Math.min(1, t * 3) * (1 - exitProgress);
      animStyle = { opacity, transform: `translateY(${bounceY}px) scale(${finalScale})` };
      break;
    }
    case "bounce": {
      const t = entranceProgress;
      const bY = Math.sin(t * Math.PI * 2) * 8 * (1 - t) * (1 - exitProgress);
      const bS = 1 + Math.sin(t * Math.PI) * 0.06 + Math.sin(t * Math.PI * 3) * 0.02 * (1 - t);
      animStyle = { opacity: Math.min(1, entranceProgress * 2.5) * (1 - exitProgress), transform: `translateY(${bY}px) scale(${bS})` };
      break;
    }
    case "fade-in":
      animStyle = { opacity: Math.min(1, entranceProgress * 2) * (1 - exitProgress) };
      break;
    case "slide-up":
      animStyle = { opacity: Math.min(1, entranceProgress * 2) * (1 - exitProgress), transform: `translateY(${(1 - entranceProgress) * 20}px)` };
      break;
    case "scale-up":
      animStyle = { opacity: Math.min(1, entranceProgress * 1.5) * (1 - exitProgress), transform: `scale(${0.85 + entranceProgress * 0.15})` };
      break;
  }

  // Stroke & shadow
  const strokeW = renderParams.strokeWidth || 5;
  const strokeColor = renderParams.strokeColor || "#000000";
  const textShadowStyle = `0 0 8px rgba(0,0,0,0.9), 2px 2px 4px rgba(0,0,0,0.8), 0 0 20px rgba(0,0,0,0.5)`;

  // Main text style
  const mainTextStyle: React.CSSProperties = {
    fontFamily: renderParams.fontFamily,
    fontSize: `${renderParams.fontSize}px`,
    fontWeight: renderParams.fontWeight,
    color: primaryColor,
    textAlign: "center" as const,
    textShadow: textShadowStyle,
    lineHeight: 1.15,
    wordBreak: "break-word" as const,
    whiteSpace: "pre-wrap" as const,
    maxWidth: "100%",
    WebkitTextStroke: `${strokeW}px ${strokeColor}`,
    paintOrder: "stroke fill",
    letterSpacing: "-0.01em",
  };

  // Sub text style (Chinese)
  const subTextStyle: React.CSSProperties = {
    fontFamily: renderParams.fontFamily,
    fontSize: `${renderParams.fontSize * 0.45}px`,
    fontWeight: 600,
    color: secondaryColor,
    textAlign: "center" as const,
    textShadow: textShadowStyle,
    lineHeight: 1.3,
    wordBreak: "break-word" as const,
    whiteSpace: "pre-wrap" as const,
    maxWidth: "100%",
    marginBottom: 6,
    WebkitTextStroke: `${Math.max(1, strokeW * 0.5)}px ${strokeColor}`,
    paintOrder: "stroke fill",
  };

  const containerStyle: React.CSSProperties = {
    position: "absolute",
    left: xPx, top: yPx,
    transform: "translate(-50%, -50%)",
    display: "flex", flexDirection: "column",
    alignItems: "center",
    maxWidth: `${(layout.maxWidthRatio || 0.88) * 100}%`,
    overflow: "visible",
    ...animStyle,
  };

  // Per-word pop animation
  const highlightWords = renderParams.highlightWords || [];
  const words = displayText.split(" ");
  const wordCount = words.length;

  const getWordAnimStyle = (wordIndex: number): React.CSSProperties => {
    let wordStart = 0;
    let wordEnd = 0;
    let hasExactTiming = false;

    if (wordTimestamps && wordIndex < wordTimestamps.length) {
      const wt = wordTimestamps[wordIndex];
      const lineStart = wordTimestamps[0]?.start ?? 0;
      const lineEnd = wordTimestamps[wordTimestamps.length - 1]?.end ?? 0;
      const ld = Math.max(0.001, lineEnd - lineStart);
      wordStart = (wt.start - lineStart) / ld;
      wordEnd = (wt.end - lineStart) / ld;
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

    const popWindow = hasExactTiming ? Math.min(wordEnd - wordStart, 0.15) : Math.max(0.001, wordEnd - wordStart);
    const wordProgress = Math.min(1, (clampedProgress - wordStart) / Math.max(0.001, popWindow));
    const t = wordProgress;
    const popScale = t < 0.35 ? 0.8 + t * 0.8 : 1.08 - (t - 0.35) * 0.123;
    const finalScale = Math.min(1.08, Math.max(0.8, popScale));
    const bounceY = Math.sin(t * Math.PI * 3) * 3 * (1 - t);
    const opacity = Math.min(1, t * 4);

    return { opacity, transform: `translateY(${bounceY}px) scale(${finalScale})`, display: "inline-block" };
  };

  return (
    <div style={containerStyle}>
      {hasTranslation && <span style={subTextStyle}>{translation}</span>}
      <span style={mainTextStyle}>
        {words.map((word, i) => {
          const cleanWord = word.replace(/[^a-zA-Z0-9']/g, "").toLowerCase();
          const isHighlighted = highlightWords.some((hw) => hw.toLowerCase() === cleanWord);
          const flashAlpha = isHighlighted ? 0.75 + 0.25 * Math.sin(frame * 0.35) : 1;
          const wordAnim = getWordAnimStyle(i);
          return (
            <span key={i}>
              {i > 0 && " "}
              <span style={{
                ...wordAnim,
                color: isHighlighted ? renderParams.accentColor : primaryColor,
                opacity: isHighlighted ? flashAlpha * ((wordAnim.opacity as number) || 1) : (wordAnim.opacity || 1),
                fontSize: isHighlighted ? `${renderParams.fontSize * 1.06}px` : undefined,
                fontWeight: isHighlighted ? Math.min(900, renderParams.fontWeight + 100) : renderParams.fontWeight,
              }}>{word}</span>
            </span>
          );
        })}
      </span>
    </div>
  );
};
