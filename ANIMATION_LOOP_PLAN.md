# AI → Remotion 动画循环底片 实现计划

## 目标

用户用自然语言描述想要的视觉风格（如"粉色泡泡在海底飘的梦幻背景"），AI 将其转化为 Remotion 可渲染的小段动画（3-5秒），作为音乐视频的循环底片/背景层。

## 现状分析

### 已有能力
1. **AI 接入**：已支持 OpenAI / DeepSeek / Anthropic 三种 provider，有完整的 `analyzeLyrics()`、`parseStylePrompt()`、`generateSubtitleTemplate()` 三个函数
2. **Remotion 渲染**：已有 `LyricVibeVideo` Composition（1920x1080 @30fps），能渲染背景视频+音频+字幕叠加层
3. **字幕模板系统**：`SubtitleTemplate` 类型完整定义了 layout/animation/render 三大块
4. **AI Prompt 设计**：`generateSubtitleTemplate()` 的 system prompt 已经包含中文关键词→JSON 的映射规则

### 缺失能力
1. **没有动画底片/背景动画的 Composition**：当前只有字幕叠加层，背景层只支持静态视频文件
2. **没有 AI→Remotion 动画指令的类型定义**：缺少描述"动画场景"的 TypeScript 类型
3. **没有 AI prompt 用于生成动画场景**：需要新的 prompt template 专门描述动画效果

## 技术方案

### 整体架构

```
用户自然语言描述
       │
       ▼
  ┌─────────────────────────────────────┐
  │  AI 动画场景生成                      │
  │  "粉色泡泡在海底飘" → SceneAnimSpec  │
  └─────────────────────────────────────┘
       │
       ▼
  ┌─────────────────────────────────────┐
  │  Remotion Composition (动画循环底片)  │
  │  - 纯 CSS/JS 动画，无需外部素材        │
  │  - 3-5秒循环，可无缝重复               │
  └─────────────────────────────────────┘
       │
       ▼
  ┌─────────────────────────────────────┐
  │  主 Composition 合并                  │
  │  BackgroundLoop + Video + Subtitles   │
  │  → 最终 MP4 输出                      │
  └─────────────────────────────────────┘
```

### 第 1 步：定义动画场景类型 `SceneAnimSpec`

新增文件 `src/lib/animation-types.ts`：

```typescript
// 粒子类型
type ParticleType = "bubble" | "sparkle" | "confetti" | "snow" | "rain" | "firefly" | "geometric";

// 渐变背景
interface GradientBg {
  type: "gradient";
  colors: string[];        // ["#FF69B4", "#4FC3F7", "#1a1a2e"]
  angle: number;           // 0-360
  animate: boolean;        // 渐变色是否缓慢变化
}

// 图案背景
interface PatternBg {
  type: "pattern";
  pattern: "dots" | "grid" | "waves" | "stripes" | "hexagon";
  color: string;
  opacity: number;
  animate: boolean;
}

// 粒子系统
interface ParticleSystem {
  type: ParticleType;
  count: number;           // 50-500
  color: string | string[];
  size: [number, number];  // [min, max] px
  speed: [number, number]; // [min, max]
  direction: "up" | "down" | "random" | "radial";
  opacity: [number, number];
  // 特效
  blur?: number;
  glow?: boolean;
  sway?: boolean;          // 左右摆动
}

// 动画场景规格
interface SceneAnimSpec {
  name: string;
  description: string;
  durationSeconds: number; // 3-5 秒循环
  background: GradientBg | PatternBg;
  particles: ParticleSystem[];
  // 额外效果
  vignette?: boolean;       // 暗角
  grain?: number;           // 0-1 噪点强度
  colorOverlay?: string;    // 叠加色（如 "rgba(255,105,180,0.1)"）
}
```

### 第 2 步：实现 Remotion 动画循环组件

新增文件 `src/lib/remotion/AnimatedBackground.tsx`：

**核心能力：**
- **渐变背景**：CSS `linear-gradient` + 关键帧动画使颜色缓慢漂移
- **图案背景**：SVG pattern 或 CSS background-pattern + 旋转/位移动画
- **粒子系统**：纯 CSS/React 渲染的粒子（无需 Canvas）：
  - 泡泡：带半透明+高光的圆，缓动上浮
  - 闪光：小星形，旋转+缩放闪烁
  - 几何体：三角形/六边形，旋转漂浮
  - 雪花/雨滴/萤火虫
- **无缝循环**：所有动画使用 `frame % duration` 保证完美循环
- **暗角/噪点**：CSS box-shadow + SVG feTurbulence

**渲染方式：**
- 每个粒子是一个 `<div>`，位置用 `useCurrentFrame()` 计算
- 使用 `@remotion/animation-utils` 或手写缓动函数
- 粒子到达循环终点时从起点重新出现（无缝）

### 第 3 步：AI Prompt 设计

在 `ai-service.ts` 中新增 `generateAnimationScene()` 函数：

```typescript
export async function generateAnimationScene(
  userDescription: string,
  analysis?: AnalysisResult
): Promise<SceneAnimSpec>
```

**System Prompt 设计思路：**
```
你是一个视觉动画设计师。将用户的自然语言描述转化为精确的动画场景参数。

输出 JSON 格式，包含：
- background: 渐变或图案背景
- particles: 粒子系统数组（最多3个）
- 效果: vignette, grain, colorOverlay

中文关键词映射规则：
- "泡泡/气泡/泡沫" → particle type=bubble, direction=up
- "星空/星星/闪烁" → particle type=sparkle, glow=true
- "海底/深海/海洋" → gradient blue→dark, bubble particles
- "梦幻/仙境/魔法" → sparkle + glow + soft gradient
- "下雨/雨滴" → particle type=rain, direction=down
- "飘雪/雪花" → particle type=snow, direction=down, sway=true
- "霓虹/赛博朋克" → pattern type=grid, neon colors, geometric particles
- "复古/胶片" → grain=0.3, vignette=true, warm gradient
- "极简/干净" → simple gradient, no particles
- "粉色/少女/可爱" → pink gradient, small bubbles, confetti
- "暗黑/酷" → dark gradient, geometric particles, minimal
- "自然/森林" → green gradient, firefly particles
- "火焰/热力" → red/orange gradient, spark particles, direction=up
```

### 第 4 步：集成到现有渲染流程

#### 4.1 修改 `Root.tsx`：新增 `AnimatedLoop` Composition

```tsx
<Composition
  id="AnimatedLoop"
  component={AnimatedBackground}
  durationInFrames={150}  // 5s @30fps
  fps={30}
  width={1920}
  height={1080}
  defaultProps={{ scene: defaultSceneSpec }}
/>
```

#### 4.2 修改 `Composition.tsx`：背景层支持动画

在 `LyricVibeComposition` 中，当 `backgroundScene` 存在时，用 `<AnimatedBackground>` 替代静态视频：

```tsx
{backgroundScene ? (
  <AnimatedBackground scene={backgroundScene} />
) : resolvedVideoSrc ? (
  <OffthreadVideo src={resolvedVideoSrc} ... />
) : (
  <div style={{ backgroundColor: "#111" }} />
)}
```

#### 4.3 修改 `CompositionProps`：新增字段

```typescript
interface CompositionProps {
  // ... existing
  backgroundScene?: SceneAnimSpec;  // AI 生成的动画底片
}
```

### 第 5 步：前端 UI 集成

#### 5.1 在 ControlPanel 中新增"动画底片"Tab

用户输入自然语言描述 → 调用 AI 生成 → 实时预览 → 确认后作为背景层。

#### 5.2 预设几个默认动画底片

作为 fallback（无 AI 时使用）：
- "星空闪烁" - 深蓝渐变 + 金色闪光粒子
- "海底泡泡" - 蓝绿渐变 + 泡泡上浮
- "霓虹城市" - 暗色 + 网格线 + 几何粒子
- "粉色梦境" - 粉紫渐变 + 小花/爱心粒子
- "简约纯净" - 柔和渐变，无粒子

#### 5.3 VideoPreview 支持动画底片预览

在 `VideoPreview.tsx` 中，当选择了动画底片时，在 Player 上方渲染动画层。

### 第 6 步：渲染输出

修改 `render/route.ts`，使渲染 API 支持 `backgroundScene` 参数，将其传入 `LyricVibeVideo` Composition 的 inputProps。

## 实现优先级

| 优先级 | 任务 | 预估工作量 |
|--------|------|-----------|
| P0 | 定义 `SceneAnimSpec` 类型 | 小 |
| P0 | 实现 `AnimatedBackground` 组件（含粒子系统） | 中-大 |
| P0 | AI prompt + `generateAnimationScene()` 函数 | 中 |
| P1 | 集成到 `Composition.tsx` 背景层 | 小 |
| P1 | 前端 UI：输入框 + 预览 + 确认 | 中 |
| P1 | 预设 fallback 场景 | 小 |
| P2 | 渲染 API 支持 `backgroundScene` | 小 |
| P2 | 无缝循环优化 | 中 |

## 技术挑战与解决方案

### 1. 纯 CSS 粒子性能
- 使用 `will-change: transform, opacity` 优化
- 粒子数上限 300 个（1080p 下足够密集）
- 使用 `useMemo` 预计算粒子初始状态

### 2. 无缝循环
- 粒子生命周期 = `durationSeconds`
- 使用 `frame % totalFrames` 确保精确循环
- 在循环边界处粒子位置连续

### 3. AI 输出一致性
- 使用 `response_format: { type: "json_object" }` 强制 JSON
- 在 prompt 中给出所有枚举值
- `safeJsonParse()` 多层回退
- 默认值覆盖所有字段

### 4. 与现有视频背景的兼容
- `backgroundScene` 和 `videoUrl` 互斥（选其一）
- 当用户同时提供视频和动画描述时，优先动画底片
