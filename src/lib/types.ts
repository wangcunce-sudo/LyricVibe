// ============================================================
// Core Data Types for LyricVibe
// ============================================================

export type LyricAlignment = "left" | "center" | "right";

/** Word-level timestamp from WhisperX for per-word pop animation */
export interface WordTimestamp {
  word: string;
  start: number; // seconds — absolute time within the song
  end: number;   // seconds
  confidence?: number; // 0-1
}

export interface LyricLine {
  index: number;
  text: string;
  startTime: number; // seconds
  endTime: number; // seconds
  confidence?: number; // 0-1
  alignment?: LyricAlignment; // for dynamic positioning
  /** Word-level timestamps from WhisperX, for per-word kinetic pop animation */
  words?: WordTimestamp[];
}

export interface EmotionTag {
  label: string;
  intensity: number; // 0-1
}

export type AnimationType =
  | "none"
  | "fade-in"
  | "karaoke"
  | "typewriter"
  | "bounce"
  | "scale-up"
  | "slide-up"
  | "kinetic-pop";

export type DecorationType =
  | "underline"
  | "highlight"
  | "border"
  | "emoji"
  | "none";

export type FilterType =
  | "original"
  | "vintage"
  | "film"
  | "fresh"
  | "bw"
  | "warm"
  | "cool"
  | "faded";

export type AspectRatio = "16:9" | "9:16" | "1:1" | "4:5";

// ============================================================
// Subtitle Template System (字幕模板系统)
// 用户可以通过自然语言描述生成字幕模板，控制弧度、位置等
// ============================================================

/**
 * 字幕模板 — 控制每条字幕的视觉呈现
 * 灵感来自 After Effects 字幕模板概念
 */
export interface SubtitleTemplate {
  /** 模板名称 */
  name: string;
  /** 模板描述（用于 LLM 生成） */
  description: string;
  /** 布局参数 */
  layout: SubtitleLayout;
  /** 动画参数 */
  animation: SubtitleAnimation;
  /** 渲染参数 */
  render: SubtitleRender;
}

/**
 * 字幕布局参数
 */
export interface SubtitleLayout {
  /** 水平位置: 0=最左, 0.5=居中, 1=最右 */
  positionX: number;
  /** 垂直位置: 0=顶部, 0.5=居中, 1=底部 */
  positionY: number;
  /** 交替模式: "none" | "alternate" | "random" | "wave" | "length-adaptive" */
  alternateMode: "none" | "alternate" | "random" | "wave" | "length-adaptive";
  /** 交替幅度 (0-1, 仅在 alternateMode 非 none 时生效) */
  alternateAmplitude: number;
  /** 文字弧度 (弯曲程度, 0=直线, 正值=上弧, 负值=下弧) */
  curvature: number;
  /** 最大宽度比例 (0-1, 相对于画面宽度) */
  maxWidthRatio: number;
  /** 行间距 (相对于 fontSize) */
  lineSpacing: number;
}

/**
 * 字幕动画参数
 */
export interface SubtitleAnimation {
  /** 入场动画类型 */
  entrance: AnimationType;
  /** 入场动画时长 (秒) */
  entranceDuration: number;
  /** 出场动画类型 */
  exit: AnimationType;
  /** 出场动画时长 (秒) */
  exitDuration: number;
  /** 弹性系数 (0-1, 仅 bounce 动画) */
  bounciness: number;
  /** 动画缓动函数 */
  easing: "linear" | "ease" | "ease-in" | "ease-out" | "ease-in-out" | "bounce";
}

/**
 * 字幕渲染参数
 */
export interface SubtitleRender {
  /** 字体族 */
  fontFamily: string;
  /** 字号 */
  fontSize: number;
  /** 字重 */
  fontWeight: number;
  /** 主色 (偶数行) */
  primaryColor: string;
  /** 辅色 (奇数行) */
  secondaryColor: string;
  /** 强调色 (高亮关键词) */
  accentColor: string;
  /** 文字阴影 */
  textShadow: boolean;
  /** 发光效果颜色 */
  glowColor: string;
  /** 发光强度 (0-1) */
  glowIntensity: number;
  /** 描边宽度 (px) — 用于厚黑描边分隔背景 */
  strokeWidth: number;
  /** 描边颜色 */
  strokeColor: string;
  /** 背景框: "none" | "solid" | "gradient" | "glass" */
  backgroundType: "none" | "solid" | "gradient" | "glass";
  /** 背景颜色 */
  backgroundColor: string;
  /** 内边距 */
  paddingX: number;
  paddingY: number;
  /** 圆角 */
  borderRadius: number;
  /** 全部大写 (All Caps) — TikTok 风格 */
  allCaps?: boolean;
  /** 关键词高亮列表 — 这些词会用 accentColor 显示 */
  highlightWords?: string[];
}

/**
 * 从 StyleParams 生成默认 SubtitleTemplate
 */
export function styleParamsToTemplate(sp: StyleParams): SubtitleTemplate {
  return {
    name: "Custom Style",
    description: "User-defined style",
    layout: {
      positionX: 0.5,
      positionY: 0.6,
      alternateMode: "alternate",
      alternateAmplitude: 0.3,
      curvature: 0,
      maxWidthRatio: 0.85,
      lineSpacing: 1.4,
    },
    animation: {
      entrance: sp.animation,
      entranceDuration: 0.3,
      exit: "fade-in",
      exitDuration: 0.2,
      bounciness: 0.6,
      easing: "ease-out",
    },
    render: {
      fontFamily: sp.fontFamily,
      fontSize: sp.fontSize,
      fontWeight: sp.fontWeight,
      primaryColor: sp.primaryColor,
      secondaryColor: sp.secondaryColor,
      accentColor: sp.accentColor,
      textShadow: sp.textShadow,
      glowColor: sp.accentColor,
      glowIntensity: 0.5,
      strokeWidth: 0,
      strokeColor: "#000000",
      backgroundType: "none",
      backgroundColor: "rgba(0,0,0,0.5)",
      paddingX: 20,
      paddingY: 10,
      borderRadius: 8,
      allCaps: false,
      highlightWords: [],
    },
  };
}

/**
 * Merge StyleParams into SubtitleTemplate.
 *
 * This is the SINGLE SOURCE OF TRUTH for merging user style overrides
 * into a subtitle template. Previously this logic was duplicated in:
 *   - SubtitleComposition.tsx
 *   - VideoPreview.tsx
 *   - render/route.ts
 *
 * Always use this function to ensure preview and export consistency.
 */
export function mergeTemplateWithStyle(
  template: SubtitleTemplate,
  styleParams: StyleParams
): SubtitleTemplate {
  return {
    ...template,
    render: {
      ...template.render,
      fontFamily: styleParams.fontFamily,
      fontSize: styleParams.fontSize,
      fontWeight: styleParams.fontWeight,
      primaryColor: styleParams.primaryColor,
      secondaryColor: styleParams.secondaryColor,
      accentColor: styleParams.accentColor,
      textShadow: styleParams.textShadow,
    },
    animation: {
      ...template.animation,
      entrance: styleParams.animation,
    },
  };
}

export interface AnalysisResult {
  emotions: EmotionTag[];
  theme: string[];
  tempo: "slow" | "medium" | "fast";
  suggestedPalette: string[]; // HEX colors
  suggestedFontStyle: string;
  stylePrompt: string;
}

export interface StyleParams {
  fontFamily: string;
  fontSize: number;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  animation: AnimationType;
  decoration: DecorationType[];
  fontWeight: number;
  textShadow: boolean;
  /** 逐词弹跳动画 (per-word pop animation) — 默认关闭，用户手动开启 */
  wordPop?: boolean;
}

export interface FileInfo {
  id: string;
  name: string;
  size: number;
  type: string;
  url: string;
  duration?: number; // seconds
}

export type ProjectStatus =
  | "idle"
  | "uploading"
  | "analyzing"
  | "ready"
  | "rendering"
  | "done"
  | "error";

export interface Project {
  id: string;
  title: string;
  videoSource?: FileInfo;
  audioSource: FileInfo;
  aiBackground?: string;
  lyrics: LyricLine[];
  analysis?: AnalysisResult;
  stylePrompt: string;
  styleParams: StyleParams;
  subtitleTemplate?: SubtitleTemplate; // 字幕模板（支持弧度、位置调整）
  filter: FilterType;
  speed: number; // 0.5 - 2.0
  pitch: number; // -12 ~ +12
  aspectRatio: AspectRatio;
  status: ProjectStatus;
}

// ============================================================
// Style Template Presets (fallback when AI is unavailable)
// ============================================================

export const STYLE_TEMPLATES: Record<string, StyleParams> = {
  "kinetic-pop": {
    fontFamily: "'Impact', 'Montserrat', 'Arial Black', 'Noto Sans SC', sans-serif",
    fontSize: 64,
    primaryColor: "#FFFFFF",
    secondaryColor: "#38BDF8",
    accentColor: "#00E5FF",
    animation: "kinetic-pop",
    decoration: ["none"],
    fontWeight: 900,
    textShadow: true,
  },
  "minimal-modern": {
    fontFamily: "Inter, sans-serif",
    fontSize: 48,
    primaryColor: "#FFFFFF",
    secondaryColor: "#CCCCCC",
    accentColor: "#FF6B6B",
    animation: "fade-in",
    decoration: ["none"],
    fontWeight: 500,
    textShadow: false,
  },
  "vintage-film": {
    fontFamily: "Georgia, serif",
    fontSize: 44,
    primaryColor: "#FFE4B5",
    secondaryColor: "#D4A574",
    accentColor: "#FF8C42",
    animation: "typewriter",
    decoration: ["underline"],
    fontWeight: 600,
    textShadow: true,
  },
  "journal-diary": {
    fontFamily: "'Caveat', 'Kalam', cursive",
    fontSize: 50,
    primaryColor: "#2C1810",
    secondaryColor: "#8B5E3C",
    accentColor: "#E8956A",
    animation: "slide-up",
    decoration: ["emoji", "highlight"],
    fontWeight: 400,
    textShadow: false,
  },
};

// ============================================================
// Filter presets (CSS filter strings)
// ============================================================

export const FILTER_PRESETS: Record<FilterType, string> = {
  original: "none",
  vintage: "sepia(0.5) contrast(0.9) brightness(0.9)",
  film: "sepia(0.3) contrast(1.1) saturate(1.2) brightness(0.95)",
  fresh: "saturate(1.3) contrast(1.05) brightness(1.05)",
  bw: "grayscale(1) contrast(1.1)",
  warm: "sepia(0.3) saturate(1.4) brightness(1.05)",
  cool: "hue-rotate(180deg) saturate(0.8) brightness(1.05)",
  faded: "contrast(0.85) brightness(1.1) saturate(0.7)",
};

export const FILTER_LABELS: Record<FilterType, string> = {
  original: "Original",
  vintage: "Vintage",
  film: "Film",
  fresh: "Fresh",
  bw: "B&W",
  warm: "Warm",
  cool: "Cool",
  faded: "Faded",
};

export const ANIMATION_LABELS: Record<AnimationType, string> = {
  none: "None",
  "fade-in": "Fade In",
  karaoke: "Karaoke",
  typewriter: "Typewriter",
  bounce: "Bounce",
  "scale-up": "Scale Up",
  "slide-up": "Slide Up",
  "kinetic-pop": "Kinetic Pop",
};

export const DECORATION_LABELS: Record<DecorationType, string> = {
  none: "None",
  underline: "Underline",
  highlight: "Highlight",
  border: "Border",
  emoji: "Emoji",
};
