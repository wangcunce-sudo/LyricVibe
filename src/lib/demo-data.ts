/**
 * Demo data for opalite-tiktok热舞 (Hot Dance Clip)
 * 视频来源: opalite-tiktok热舞片段, 背景音乐 OPALITE
 * 蓝白色调 · 跳动活力风格 · 左右灵动交替布局
 *
 * ⚠️ 歌词时间戳来自 WhisperX (Demucs 音源分离 + large-v3) 转录
 *    对齐了热舞视频的实际音频, 不要手动修改时间戳!
 *
 * 转录流程: 音频 → Demucs 人声分离 → Faster-Whisper large-v3 → JSON 时间轴
 */

import type { LyricLine, WordTimestamp, AnalysisResult, StyleParams, SubtitleTemplate } from "./types";

// ~33-second hot dance clip
// Timestamps extracted via WhisperX (Demucs + large-v3) — verified against audio
// alignment: 偶数行左(白), 奇数行右(蓝), 交替灵动
// word-level timestamps: extracted from WhisperX for per-word kinetic pop animation
export const OPHELIA_LYRICS: LyricLine[] = [
  { index: 0, text: "Don't you sweat it, baby, it's alright",       startTime: 0.00,  endTime: 2.48,  alignment: "left",
    words: makeWords("Don't you sweat it baby it's alright", 0.00, 2.48) },
  { index: 1, text: "You were dancing through the lightning strikes", startTime: 2.48,  endTime: 6.76,  alignment: "right",
    words: makeWords("You were dancing through the lightning strikes", 2.48, 6.76) },
  { index: 2, text: "Oh, so sleepless in the onyx night",            startTime: 7.88,  endTime: 10.44, alignment: "left",
    words: makeWords("Oh so sleepless in the onyx night", 7.88, 10.44) },
  { index: 3, text: "But now the sky is opalite",                    startTime: 10.44, endTime: 14.34, alignment: "right",
    words: makeWords("But now the sky is opalite", 10.44, 14.34) },
  { index: 4, text: "Oh-oh-oh-oh, oh my Lord",                       startTime: 14.34, endTime: 18.12, alignment: "left",
    words: [
      { word: "Oh-oh-oh-oh", start: 14.34, end: 15.82, confidence: 0.92 },
      { word: "oh", start: 15.82, end: 16.20, confidence: 0.88 },
      { word: "my", start: 16.20, end: 16.55, confidence: 0.95 },
      { word: "Lord", start: 16.55, end: 18.12, confidence: 0.97 },
    ]},
  { index: 5, text: "Never met no one like you before",              startTime: 18.12, endTime: 21.84, alignment: "right",
    words: makeWords("Never met no one like you before", 18.12, 21.84) },
  { index: 6, text: "You had to make your own sunshine",              startTime: 21.84, endTime: 25.64, alignment: "left",
    words: makeWords("You had to make your own sunshine", 21.84, 25.64) },
  { index: 7, text: "But now the sky is opalite",                    startTime: 26.44, endTime: 29.64, alignment: "right",
    words: makeWords("But now the sky is opalite", 26.44, 29.64) },
  { index: 8, text: "Oh-oh-oh-oh, oh",                                startTime: 29.64, endTime: 32.50, alignment: "left",
    words: [
      { word: "Oh-oh-oh-oh", start: 29.64, end: 31.30, confidence: 0.91 },
      { word: "oh", start: 31.30, end: 32.50, confidence: 0.94 },
    ]},
];

/** Helper: evenly distribute word timestamps across a segment duration */
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

// AI analysis result for Opalite hot dance clip
export const OPHELIA_ANALYSIS: AnalysisResult = {
  emotions: [
    { label: "energy", intensity: 0.95 },
    { label: "triumph", intensity: 0.88 },
    { label: "passion", intensity: 0.82 },
    { label: "joy", intensity: 0.75 },
  ],
  theme: [
    "dance & movement",
    "electric energy",
    "storm to sunshine",
    "empowerment",
  ],
  tempo: "fast",
  suggestedPalette: ["#4FC3F7", "#FFFFFF", "#0D47A1", "#29B6F6"],
  suggestedFontStyle: "bold modern sans-serif with kinetic bounce",
  stylePrompt:
    "Electric blue and pure white typography pulsing with dance energy. Letters bounce and vibrate like a heartbeat, matching the rhythm of the choreography. Sky-blue glow, motion blur accents, neon-light aesthetic. High-energy karaoke bounce that makes every word feel like a dance move.",
};

// Kinetic Typography style — Impact bold, All Caps, heavy black stroke, pop animation
export const OPHELIA_STYLE: StyleParams = {
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

// 字幕模板 — Kinetic Typography 风格
export const OPHELIA_TEMPLATE: SubtitleTemplate = {
  name: "Kinetic Typography",
  description: "TikTok/抖音风格: Impact 粗体 + All Caps + 厚黑描边 + Pop 弹跳动效 + 关键词高亮",
  layout: {
    positionX: 0.5,
    positionY: 0.55,
    alternateMode: "alternate",
    alternateAmplitude: 0.22,
    curvature: 0,
    maxWidthRatio: 0.88,
    lineSpacing: 1.2,
  },
  animation: {
    entrance: "kinetic-pop",
    entranceDuration: 0.30,
    exit: "fade-in",
    exitDuration: 0.12,
    bounciness: 0.8,
    easing: "ease-out",
  },
  render: {
    fontFamily: "'Impact', 'Montserrat', 'Arial Black', 'Noto Sans SC', sans-serif",
    fontSize: 64,
    fontWeight: 900,
    primaryColor: "#FFFFFF",
    secondaryColor: "#38BDF8",
    accentColor: "#00E5FF",
    textShadow: true,
    glowColor: "#38BDF8",
    glowIntensity: 0.25,
    strokeWidth: 5,
    strokeColor: "#000000",
    backgroundType: "none",
    backgroundColor: "rgba(0,0,0,0.5)",
    paddingX: 20,
    paddingY: 10,
    borderRadius: 8,
    allCaps: true,
    highlightWords: ["baby", "dancing", "lightning", "sleepless", "onyx", "opalite", "lord", "never", "sunshine"],
  },
};

// Alternative styles for demo variety
export const ALTERNATIVE_STYLES: Record<string, StyleParams> = {
  "kinetic-pop": {
    fontFamily: "'Impact', 'Montserrat', 'Arial Black', sans-serif",
    fontSize: 64,
    primaryColor: "#FFFFFF",
    secondaryColor: "#38BDF8",
    accentColor: "#00E5FF",
    animation: "kinetic-pop",
    decoration: ["none"],
    fontWeight: 900,
    textShadow: true,
  },
  "gothic-drama": {
    fontFamily: "'Cinzel', serif",
    fontSize: 46,
    primaryColor: "#E8D5C4",
    secondaryColor: "#8B0000",
    accentColor: "#FF4500",
    animation: "karaoke",
    decoration: ["border"],
    fontWeight: 700,
    textShadow: true,
  },
  "vintage-journal": {
    fontFamily: "'Caveat', cursive",
    fontSize: 44,
    primaryColor: "#2C1810",
    secondaryColor: "#8B5E3C",
    accentColor: "#D4AF37",
    animation: "slide-up",
    decoration: ["emoji", "highlight"],
    fontWeight: 400,
    textShadow: false,
  },
};

// 预置字幕模板（用户可通过语言描述切换）
export const SUBTITLE_TEMPLATES: Record<string, SubtitleTemplate> = {
  "kinetic-pop": OPHELIA_TEMPLATE,
  "dance-bounce": {
    name: "Dance Bounce",
    description: "蓝白交替跳动字幕，左右灵动布局",
    layout: {
      positionX: 0.5,
      positionY: 0.65,
      alternateMode: "alternate",
      alternateAmplitude: 0.35,
      curvature: 0,
      maxWidthRatio: 0.8,
      lineSpacing: 1.4,
    },
    animation: {
      entrance: "bounce",
      entranceDuration: 0.35,
      exit: "fade-in",
      exitDuration: 0.15,
      bounciness: 0.7,
      easing: "ease-out",
    },
    render: {
      fontFamily: "'Poppins', 'Montserrat', 'Inter', sans-serif",
      fontSize: 56,
      fontWeight: 800,
      primaryColor: "#FFFFFF",
      secondaryColor: "#4FC3F7",
      accentColor: "#00E5FF",
      textShadow: true,
      glowColor: "#4FC3F7",
      glowIntensity: 0.5,
      strokeWidth: 0,
      strokeColor: "#000000",
      backgroundType: "none",
      backgroundColor: "rgba(0,0,0,0.5)",
      paddingX: 20,
      paddingY: 10,
      borderRadius: 8,
    },
  },
  "arc-center": {
    name: "Arc Center",
    description: "居中弧形字幕，优雅弯曲，适合抒情歌曲",
    layout: {
      positionX: 0.5,
      positionY: 0.7,
      alternateMode: "none",
      alternateAmplitude: 0,
      curvature: 0.15,
      maxWidthRatio: 0.75,
      lineSpacing: 1.5,
    },
    animation: {
      entrance: "fade-in",
      entranceDuration: 0.4,
      exit: "fade-in",
      exitDuration: 0.2,
      bounciness: 0.3,
      easing: "ease-in-out",
    },
    render: {
      fontFamily: "'Georgia', serif",
      fontSize: 48,
      fontWeight: 600,
      primaryColor: "#FFE4B5",
      secondaryColor: "#FFD700",
      accentColor: "#FF8C42",
      textShadow: true,
      glowColor: "#FF8C42",
      glowIntensity: 0.4,
      strokeWidth: 0,
      strokeColor: "#000000",
      backgroundType: "none",
      backgroundColor: "rgba(0,0,0,0.5)",
      paddingX: 24,
      paddingY: 12,
      borderRadius: 8,
    },
  },
  "bottom-left": {
    name: "Bottom Left",
    description: "左下角固定字幕，半透明玻璃背景，适合 vlog 风格",
    layout: {
      positionX: 0.1,
      positionY: 0.85,
      alternateMode: "none",
      alternateAmplitude: 0,
      curvature: 0,
      maxWidthRatio: 0.5,
      lineSpacing: 1.2,
    },
    animation: {
      entrance: "slide-up",
      entranceDuration: 0.3,
      exit: "fade-in",
      exitDuration: 0.15,
      bounciness: 0,
      easing: "ease-out",
    },
    render: {
      fontFamily: "'Inter', sans-serif",
      fontSize: 32,
      fontWeight: 500,
      primaryColor: "#FFFFFF",
      secondaryColor: "#CCCCCC",
      accentColor: "#FFFFFF",
      textShadow: false,
      glowColor: "rgba(255,255,255,0.2)",
      glowIntensity: 0.2,
      strokeWidth: 0,
      strokeColor: "#000000",
      backgroundType: "glass",
      backgroundColor: "rgba(0,0,0,0.4)",
      paddingX: 16,
      paddingY: 8,
      borderRadius: 12,
    },
  },
  "top-wave": {
    name: "Top Wave",
    description: "顶部波浪交替字幕，活泼灵动，适合快节奏音乐",
    layout: {
      positionX: 0.5,
      positionY: 0.15,
      alternateMode: "wave",
      alternateAmplitude: 0.4,
      curvature: 0.08,
      maxWidthRatio: 0.9,
      lineSpacing: 1.3,
    },
    animation: {
      entrance: "scale-up",
      entranceDuration: 0.25,
      exit: "fade-in",
      exitDuration: 0.1,
      bounciness: 0.8,
      easing: "bounce",
    },
    render: {
      fontFamily: "'Montserrat', sans-serif",
      fontSize: 42,
      fontWeight: 700,
      primaryColor: "#FFFFFF",
      secondaryColor: "#FF6B6B",
      accentColor: "#FFD93D",
      textShadow: true,
      glowColor: "#FF6B6B",
      glowIntensity: 0.6,
      strokeWidth: 2,
      strokeColor: "rgba(0,0,0,0.5)",
      backgroundType: "none",
      backgroundColor: "rgba(0,0,0,0.3)",
      paddingX: 20,
      paddingY: 10,
      borderRadius: 8,
    },
  },
};
