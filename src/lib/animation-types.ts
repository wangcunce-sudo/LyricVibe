/**
 * Animation Scene Types — AI 自然语言 → Remotion 动画循环底片
 *
 * 用户通过自然语言描述想要的背景动画效果，
 * AI 将其解析为 SceneAnimSpec，然后由 AnimatedBackground 组件渲染。
 *
 * 设计原则：
 *   - 纯 CSS 渲染（不用 Canvas），确保 Remotion SSR 兼容
 *   - 粒子上限 ~300 个，保证渲染性能
 *   - 无缝循环：frame % totalFrames 实现
 *   - 与静态视频背景互斥：用户二选一
 */

// ============================================================
// 渐变背景类型
// ============================================================

export type GradientType = "linear" | "radial" | "conic";

export interface GradientStop {
  color: string;  // HEX or CSS color
  position: number; // 0-1
}

export interface GradientBackground {
  type: GradientType;
  /** 线性渐变角度 (deg)，仅 linear 有效 */
  angle?: number;
  /** 径向渐变中心位置 */
  centerX?: number; // 0-1, default 0.5
  centerY?: number; // 0-1, default 0.5
  /** 色标 */
  stops: GradientStop[];
  /** 动画：渐变旋转或色相偏移速度 */
  animationSpeed?: number; // 0 = 静止, 1 = 慢速
}

// ============================================================
// 粒子系统
// ============================================================

export type ParticleShape =
  | "circle"
  | "star"
  | "heart"
  | "diamond"
  | "cross"
  | "ring"
  | "sparkle";

export type ParticleMotion =
  | "float-up"      // 缓慢上浮（气泡/花瓣）
  | "float-random"  // 随机漂移（雪花/闪光）
  | "fall-down"     // 下落（雨滴/落叶）
  | "pulse"         // 原地脉冲（心跳/鼓点）
  | "orbit"         // 环绕运动（星空旋转）
  | "spiral"        // 螺旋上升
  | "zigzag";       // 锯齿下落（闪电/能量）

export interface ParticleConfig {
  /** 粒子总数 */
  count: number; // 1-300
  /** 粒子形状 */
  shape: ParticleShape;
  /** 基础大小范围 (px) */
  minSize: number;
  maxSize: number;
  /** 颜色列表（随机选择） */
  colors: string[];
  /** 透明度范围 */
  minOpacity: number; // 0-1
  maxOpacity: number; // 0-1
  /** 运动方式 */
  motion: ParticleMotion;
  /** 运动速度系数 */
  speed: number; // 0-1
  /** 闪烁频率 (0 = 不闪烁) */
  twinkle: number; // 0-1
  /** 粒子生命周期（帧数），循环时自动重置 */
  lifespan: number; // frames
  /** 是否渲染光晕 */
  glow: boolean;
  /** 光晕颜色 */
  glowColor?: string;
  /** 光晕强度 */
  glowIntensity?: number; // 0-1
}

// ============================================================
// 图案背景
// ============================================================

export type PatternType =
  | "none"
  | "stars"
  | "grid"
  | "dots"
  | "waves"
  | "hexagon"
  | "noise"
  | "stripes";

export interface PatternBackground {
  type: PatternType;
  color: string;    // 图案颜色
  opacity: number;  // 0-1
  scale: number;    // 图案缩放
  animationSpeed?: number; // 0 = 静止
}

// ============================================================
// 主场景动画规格
// ============================================================

export interface SceneAnimSpec {
  /** 场景名称（AI 生成或预设） */
  name: string;
  /** 用户原始输入描述 */
  description: string;
  /** 渐变背景 */
  background: GradientBackground;
  /** 粒子系统（可选） */
  particles?: ParticleConfig;
  /** 图案叠加（可选） */
  pattern?: PatternBackground;
  /** 动画总循环时长（帧数），默认 150 (5s @30fps) */
  loopFrames: number;
  /** 整体色调叠加 (CSS filter) */
  colorOverlay?: string;
}

// ============================================================
// 预设场景 — AI 不可用时直接使用
// ============================================================

export const SCENE_PRESETS: Record<string, SceneAnimSpec> = {
  "ocean-bubbles": {
    name: "海底泡泡",
    description: "深蓝色海洋渐变背景，粉色和白色气泡缓缓上浮",
    background: {
      type: "linear",
      angle: 180,
      stops: [
        { color: "#0a1628", position: 0 },
        { color: "#0d2137", position: 0.3 },
        { color: "#0f3460", position: 0.6 },
        { color: "#1a1a4e", position: 1 },
      ],
      animationSpeed: 0.2,
    },
    particles: {
      count: 60,
      shape: "circle",
      minSize: 4,
      maxSize: 24,
      colors: ["#FF69B4", "#FFB6C1", "#87CEEB", "#E0FFFF", "#FF1493", "#FFC0CB"],
      minOpacity: 0.15,
      maxOpacity: 0.5,
      motion: "float-up",
      speed: 0.3,
      twinkle: 0.3,
      lifespan: 180,
      glow: true,
      glowColor: "#FF69B4",
      glowIntensity: 0.3,
    },
    loopFrames: 180,
  },

  "starry-night": {
    name: "星空夜",
    description: "深紫色星空渐变，金色和白色星光闪烁旋转",
    background: {
      type: "radial",
      centerX: 0.5,
      centerY: 0.4,
      stops: [
        { color: "#1a0a2e", position: 0 },
        { color: "#0d0d2b", position: 0.5 },
        { color: "#050510", position: 1 },
      ],
      animationSpeed: 0.1,
    },
    particles: {
      count: 120,
      shape: "sparkle",
      minSize: 2,
      maxSize: 8,
      colors: ["#FFD700", "#FFFFFF", "#87CEEB", "#FFA500", "#E0FFFF", "#FFF8DC"],
      minOpacity: 0.2,
      maxOpacity: 1,
      motion: "orbit",
      speed: 0.15,
      twinkle: 0.8,
      lifespan: 300,
      glow: true,
      glowColor: "#FFD700",
      glowIntensity: 0.5,
    },
    loopFrames: 300,
  },

  "cherry-petals": {
    name: "樱花飘落",
    description: "柔和粉色渐变背景，粉白花瓣随风飘落",
    background: {
      type: "linear",
      angle: 160,
      stops: [
        { color: "#FFF0F5", position: 0 },
        { color: "#FFE4E1", position: 0.4 },
        { color: "#FFDAB9", position: 0.7 },
        { color: "#FFC0CB", position: 1 },
      ],
      animationSpeed: 0,
    },
    particles: {
      count: 40,
      shape: "heart",
      minSize: 6,
      maxSize: 20,
      colors: ["#FFB7C5", "#FFC0CB", "#FFD1DC", "#FFFFFF", "#FFE4E1"],
      minOpacity: 0.3,
      maxOpacity: 0.7,
      motion: "zigzag",
      speed: 0.25,
      twinkle: 0.1,
      lifespan: 200,
      glow: false,
    },
    loopFrames: 200,
  },

  "neon-pulse": {
    name: "霓虹脉冲",
    description: "暗黑背景，霓虹色几何粒子脉冲跳动，赛博朋克风格",
    background: {
      type: "linear",
      angle: 135,
      stops: [
        { color: "#0a0a0a", position: 0 },
        { color: "#1a0033", position: 0.5 },
        { color: "#000011", position: 1 },
      ],
      animationSpeed: 0.3,
    },
    particles: {
      count: 50,
      shape: "diamond",
      minSize: 4,
      maxSize: 14,
      colors: ["#00E5FF", "#FF1493", "#FFD700", "#00FF88", "#FF4500"],
      minOpacity: 0.3,
      maxOpacity: 0.9,
      motion: "pulse",
      speed: 0.6,
      twinkle: 0.5,
      lifespan: 120,
      glow: true,
      glowColor: "#00E5FF",
      glowIntensity: 0.8,
    },
    pattern: {
      type: "grid",
      color: "rgba(0, 229, 255, 0.06)",
      opacity: 0.5,
      scale: 1,
      animationSpeed: 0.1,
    },
    loopFrames: 120,
  },

  "sunset-glow": {
    name: "日落光晕",
    description: "暖橙到紫色渐变，金色圆形粒子缓缓上升，如落日余晖",
    background: {
      type: "linear",
      angle: 180,
      stops: [
        { color: "#FF6B35", position: 0 },
        { color: "#FF4081", position: 0.35 },
        { color: "#7C4DFF", position: 0.7 },
        { color: "#1A237E", position: 1 },
      ],
      animationSpeed: 0.1,
    },
    particles: {
      count: 30,
      shape: "ring",
      minSize: 8,
      maxSize: 30,
      colors: ["#FFD700", "#FFA500", "#FF6347", "#FFB347"],
      minOpacity: 0.1,
      maxOpacity: 0.4,
      motion: "float-up",
      speed: 0.2,
      twinkle: 0.4,
      lifespan: 240,
      glow: true,
      glowColor: "#FFD700",
      glowIntensity: 0.4,
    },
    loopFrames: 240,
  },

  "rain-drops": {
    name: "雨滴下落",
    description: "深灰蓝色背景，细小雨滴持续下落",
    background: {
      type: "linear",
      angle: 180,
      stops: [
        { color: "#1a1a2e", position: 0 },
        { color: "#16213e", position: 0.5 },
        { color: "#0f3460", position: 1 },
      ],
      animationSpeed: 0,
    },
    particles: {
      count: 80,
      shape: "cross",
      minSize: 2,
      maxSize: 4,
      colors: ["#87CEEB", "#B0E0E6", "#ADD8E6", "#E0FFFF"],
      minOpacity: 0.1,
      maxOpacity: 0.4,
      motion: "fall-down",
      speed: 0.7,
      twinkle: 0,
      lifespan: 90,
      glow: false,
    },
    pattern: {
      type: "noise",
      color: "rgba(255,255,255,0.02)",
      opacity: 0.3,
      scale: 1,
      animationSpeed: 0.05,
    },
    loopFrames: 90,
  },

  "disco-party": {
    name: "迪斯科派对",
    description: "多彩闪烁背景，各色粒子跳动，派对氛围",
    background: {
      type: "conic",
      centerX: 0.5,
      centerY: 0.5,
      stops: [
        { color: "#FF0080", position: 0 },
        { color: "#FF8C00", position: 0.2 },
        { color: "#40E0D0", position: 0.4 },
        { color: "#8A2BE2", position: 0.6 },
        { color: "#FF0080", position: 1 },
      ],
      animationSpeed: 0.8,
    },
    particles: {
      count: 80,
      shape: "star",
      minSize: 4,
      maxSize: 16,
      colors: ["#FFFFFF", "#FFD700", "#00FF88", "#FF1493", "#00E5FF"],
      minOpacity: 0.4,
      maxOpacity: 0.9,
      motion: "spiral",
      speed: 0.5,
      twinkle: 0.7,
      lifespan: 150,
      glow: true,
      glowColor: "#FFFFFF",
      glowIntensity: 0.6,
    },
    loopFrames: 150,
  },

  "aurora-borealis": {
    name: "极光幻境",
    description: "深空背景，绿色紫色极光条纹飘动，星光点缀",
    background: {
      type: "linear",
      angle: 200,
      stops: [
        { color: "#001a1a", position: 0 },
        { color: "#003333", position: 0.3 },
        { color: "#1a4d4d", position: 0.6 },
        { color: "#0a2a2a", position: 1 },
      ],
      animationSpeed: 0.15,
    },
    particles: {
      count: 90,
      shape: "sparkle",
      minSize: 2,
      maxSize: 7,
      colors: ["#00FF88", "#7CFC00", "#98FB98", "#FFFFFF", "#E0FFE0"],
      minOpacity: 0.15,
      maxOpacity: 0.8,
      motion: "float-random",
      speed: 0.1,
      twinkle: 0.9,
      lifespan: 250,
      glow: true,
      glowColor: "#00FF88",
      glowIntensity: 0.7,
    },
    pattern: {
      type: "waves",
      color: "rgba(0, 255, 136, 0.03)",
      opacity: 0.4,
      scale: 2,
      animationSpeed: 0.2,
    },
    loopFrames: 250,
  },
};

// ============================================================
// 关键词 → 预设场景映射（AI 不可用时的 fallback）
// ============================================================

const KEYWORD_SCENE_MAP: Array<{ keywords: string[]; scene: string }> = [
  { keywords: ["海", "水", "泡泡", "气泡", "鱼", "海底", "ocean", "sea", "bubble", "water", "underwater", "深海", "海洋"], scene: "ocean-bubbles" },
  { keywords: ["星", "星空", "星星", "银河", "宇宙", "夜空", "star", "night", "space", "galaxy", "cosmic", "星光", "星河", "星空夜", "星夜"], scene: "starry-night" },
  { keywords: ["樱", "花", "花瓣", "飘落", "春天", "樱花", "cherry", "petal", "sakura", "blossom", "粉色", "浪漫", "少女", "桃花"], scene: "cherry-petals" },
  { keywords: ["霓虹", "赛博", "赛博朋克", "cyberpunk", "neon", "脉冲", "pulse", "数码", "电子", "未来", "激光", "科技", "科幻"], scene: "neon-pulse" },
  { keywords: ["日落", "夕阳", "黄昏", "晚霞", "落日", "sunset", "dusk", "twilight", "金色", "橙", "暖", "光晕", "余晖"], scene: "sunset-glow" },
  { keywords: ["雨", "下雨", "rain", "暴雨", "细雨", "雨滴", "雨天", "水滴", "潮湿", "阴天"], scene: "rain-drops" },
  { keywords: ["派对", "舞会", "迪斯科", "disco", "party", "disco", "club", "蹦迪", "狂欢", "炫彩", "彩色", "舞池", "夜店"], scene: "disco-party" },
  { keywords: ["极光", "aurora", "北极光", "幻境", "仙境", "魔幻", "魔法", "奇幻", "神秘", "绿色", "翠绿", "翡翠", "精灵"], scene: "aurora-borealis" },
];

/**
 * 根据中文/英文关键词匹配最合适的预设场景
 * 返回匹配的场景 key，没有匹配则返回 "ocean-bubbles"
 */
export function matchSceneByKeywords(description: string): string {
  const lower = description.toLowerCase();

  let bestMatch = "ocean-bubbles";
  let bestScore = 0;

  for (const entry of KEYWORD_SCENE_MAP) {
    let score = 0;
    for (const kw of entry.keywords) {
      if (lower.includes(kw.toLowerCase())) {
        score += 1;
      }
    }
    if (score > bestScore) {
      bestScore = score;
      bestMatch = entry.scene;
    }
  }

  return bestMatch;
}
