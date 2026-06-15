// ============================================================
// Core Data Types for LyricVibe
// ============================================================

export interface LyricLine {
  index: number;
  text: string;
  startTime: number; // seconds
  endTime: number; // seconds
  confidence?: number; // 0-1
}

export interface EmotionTag {
  label: string;
  intensity: number; // 0-1
}

export type AnimationType =
  | "fade-in"
  | "karaoke"
  | "typewriter"
  | "bounce"
  | "scale-up"
  | "slide-up";

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
  "fade-in": "Fade In",
  karaoke: "Karaoke",
  typewriter: "Typewriter",
  bounce: "Bounce",
  "scale-up": "Scale Up",
  "slide-up": "Slide Up",
};

export const DECORATION_LABELS: Record<DecorationType, string> = {
  none: "None",
  underline: "Underline",
  highlight: "Highlight",
  border: "Border",
  emoji: "Emoji",
};
