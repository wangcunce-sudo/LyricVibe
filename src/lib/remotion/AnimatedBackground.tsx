/**
 * AnimatedBackground — 纯 CSS 动画循环底片
 *
 * 将 SceneAnimSpec 渲染为 Remotion 兼容的动画背景。
 * 所有粒子使用纯 CSS transform/opacity 动画，不依赖 Canvas，
 * 确保 Remotion SSR（headless Chromium）可以正确渲染。
 *
 * 无缝循环：所有动画基于 frame % loopFrames 计算。
 *
 * 性能：
 *   - 粒子上限 300 个
 *   - 使用 will-change: transform, opacity 优化 GPU 合成
 *   - 粒子尺寸 < 40px 避免大量像素填充
 */

import React, { useMemo } from "react";
import { useCurrentFrame, AbsoluteFill } from "remotion";
import type { SceneAnimSpec, ParticleConfig, GradientBackground, PatternBackground } from "../animation-types";

// ============================================================
// 伪随机数生成器（确定性，确保 Remotion 帧一致性）
// ============================================================

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

// ============================================================
// Props
// ============================================================

export interface AnimatedBackgroundProps {
  scene: SceneAnimSpec;
  /** 画布宽度 */
  width: number;
  /** 画布高度 */
  height: number;
}

// ============================================================
// 主组件
// ============================================================

export const AnimatedBackground: React.FC<AnimatedBackgroundProps> = ({
  scene,
  width,
  height,
}) => {
  const frame = useCurrentFrame();

  // 循环帧
  const loopFrame = frame % Math.max(1, scene.loopFrames);
  const progress = loopFrame / Math.max(1, scene.loopFrames);

  // 预计算粒子数据（确定性随机，每帧不变 seed）
  const particleData = useMemo(() => {
    if (!scene.particles) return [];
    return generateParticles(scene.particles, width, height);
  }, [scene.particles, width, height]);

  return (
    <AbsoluteFill
      style={{
        overflow: "hidden",
      }}
    >
      {/* 渐变背景层 */}
      <GradientLayer
        gradient={scene.background}
        frame={loopFrame}
        loopFrames={scene.loopFrames}
        width={width}
        height={height}
      />

      {/* 图案叠加层 */}
      {scene.pattern && scene.pattern.type !== "none" && (
        <PatternLayer
          pattern={scene.pattern}
          frame={loopFrame}
          loopFrames={scene.loopFrames}
          width={width}
          height={height}
        />
      )}

      {/* 粒子层 */}
      {scene.particles && (
        <ParticleLayer
          config={scene.particles}
          particles={particleData}
          frame={loopFrame}
          loopFrames={scene.loopFrames}
          width={width}
          height={height}
        />
      )}

      {/* 颜色叠加层 */}
      {scene.colorOverlay && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: scene.colorOverlay,
            mixBlendMode: "overlay" as const,
            pointerEvents: "none",
          }}
        />
      )}
    </AbsoluteFill>
  );
};

// ============================================================
// 渐变背景层
// ============================================================

const GradientLayer: React.FC<{
  gradient: GradientBackground;
  frame: number;
  loopFrames: number;
  width: number;
  height: number;
}> = ({ gradient, frame, loopFrames }) => {
  const animProgress = frame / Math.max(1, loopFrames);

  // 构建 CSS 渐变字符串
  const stops = gradient.stops
    .map((s) => `${s.color} ${s.position * 100}%`)
    .join(", ");

  let gradientStyle: React.CSSProperties = {};

  switch (gradient.type) {
    case "linear": {
      const angle = (gradient.angle ?? 180) + (gradient.animationSpeed ?? 0) * animProgress * 360;
      gradientStyle.background = `linear-gradient(${angle}deg, ${stops})`;
      break;
    }
    case "radial": {
      const cx = (gradient.centerX ?? 0.5) * 100;
      const cy = (gradient.centerY ?? 0.5) * 100;
      gradientStyle.background = `radial-gradient(circle at ${cx}% ${cy}%, ${stops})`;
      break;
    }
    case "conic": {
      const cx = (gradient.centerX ?? 0.5) * 100;
      const cy = (gradient.centerY ?? 0.5) * 100;
      const rotation = (gradient.animationSpeed ?? 0) * animProgress * 360;
      gradientStyle.background = `conic-gradient(from ${rotation}deg at ${cx}% ${cy}%, ${stops})`;
      break;
    }
  }

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        ...gradientStyle,
      }}
    />
  );
};

// ============================================================
// 图案叠加层
// ============================================================

const PatternLayer: React.FC<{
  pattern: PatternBackground;
  frame: number;
  loopFrames: number;
  width: number;
  height: number;
}> = ({ pattern, frame, loopFrames }) => {
  const animOffset = ((pattern.animationSpeed ?? 0) * frame / Math.max(1, loopFrames)) * 100;

  const patternStyle = getPatternCSS(pattern, animOffset);

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        opacity: pattern.opacity,
        ...patternStyle,
        pointerEvents: "none",
      }}
    />
  );
};

function getPatternCSS(
  pattern: PatternBackground,
  offset: number
): React.CSSProperties {
  const scale = pattern.scale * 100;
  const color = pattern.color;

  switch (pattern.type) {
    case "stars":
      return {
        backgroundImage: `radial-gradient(2px 2px at ${20 + offset * 0.3}% ${30}%, ${color} 50%, transparent 50%),
          radial-gradient(2px 2px at ${50 + offset * 0.2}% ${60}%, ${color} 50%, transparent 50%),
          radial-gradient(1px 1px at ${70}% ${20 + offset * 0.1}%, ${color} 50%, transparent 50%),
          radial-gradient(1px 1px at ${35 + offset * 0.15}% ${80}%, ${color} 50%, transparent 50%),
          radial-gradient(2px 2px at ${80}% ${50}%, ${color} 50%, transparent 50%),
          radial-gradient(1px 1px at ${10}% ${45}%, ${color} 50%, transparent 50%)`,
        backgroundSize: `${scale}px ${scale}px`,
      };
    case "grid":
      return {
        backgroundImage: `linear-gradient(${color} 1px, transparent 1px),
          linear-gradient(90deg, ${color} 1px, transparent 1px)`,
        backgroundSize: `${scale}px ${scale}px`,
        backgroundPosition: `${offset}px ${offset * 0.5}px`,
      };
    case "dots":
      return {
        backgroundImage: `radial-gradient(circle, ${color} 1px, transparent 1px)`,
        backgroundSize: `${scale}px ${scale}px`,
        backgroundPosition: `${offset * 0.5}px ${offset * 0.3}px`,
      };
    case "waves":
      return {
        backgroundImage: `repeating-linear-gradient(0deg, transparent, transparent ${scale * 0.5}px, ${color} ${scale * 0.5}px, ${color} ${scale * 0.5 + 1}px)`,
        backgroundSize: `${scale * 2}px ${scale * 2}px`,
        backgroundPosition: `${offset * 0.5}px ${offset}px`,
        transform: `rotate(${offset * 0.1}deg)`,
      };
    case "hexagon":
      return {
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M30 5L55 20v30L30 55 5 50V20z' fill='none' stroke='${encodeURIComponent(color)}' stroke-width='1'/%3E%3C/svg%3E")`,
        backgroundSize: `${scale}px ${scale}px`,
        backgroundPosition: `${offset * 0.3}px ${offset * 0.2}px`,
      };
    case "noise":
      // Noise is complex to do purely in CSS; use a subtle dot pattern as approximation
      return {
        backgroundImage: `radial-gradient(rgba(255,255,255,0.03) 1px, transparent 1px)`,
        backgroundSize: `4px 4px`,
      };
    case "stripes":
      return {
        backgroundImage: `repeating-linear-gradient(${45 + offset * 0.5}deg, transparent, transparent ${scale * 0.3}px, ${color} ${scale * 0.3}px, ${color} ${scale * 0.3 + 1}px)`,
        backgroundSize: `${scale}px ${scale}px`,
      };
    default:
      return {};
  }
}

// ============================================================
// 粒子数据生成
// ============================================================

interface ParticleInstance {
  id: number;
  x: number;
  y: number;
  size: number;
  color: string;
  opacity: number;
  phase: number;     // 生命周期相位偏移 (0-1)
  speedMul: number;  // 速度倍率 (0.5-1.5)
  orbitRadius: number; // orbit 运动半径
  orbitCenterX: number;
  orbitCenterY: number;
  spiralRadius: number;
  spiralAngle: number;
}

function generateParticles(
  config: ParticleConfig,
  width: number,
  height: number
): ParticleInstance[] {
  const rng = seededRandom(42); // 固定 seed
  const particles: ParticleInstance[] = [];

  const count = Math.min(config.count, 300);

  for (let i = 0; i < count; i++) {
    const colorIdx = Math.floor(rng() * config.colors.length);
    particles.push({
      id: i,
      x: rng() * width,
      y: rng() * height,
      size: config.minSize + rng() * (config.maxSize - config.minSize),
      color: config.colors[colorIdx],
      opacity: config.minOpacity + rng() * (config.maxOpacity - config.minOpacity),
      phase: rng(),
      speedMul: 0.5 + rng() * 1.0,
      orbitRadius: 30 + rng() * Math.min(width, height) * 0.35,
      orbitCenterX: width * 0.3 + rng() * width * 0.4,
      orbitCenterY: height * 0.3 + rng() * height * 0.4,
      spiralRadius: 20 + rng() * Math.min(width, height) * 0.3,
      spiralAngle: rng() * Math.PI * 2,
    });
  }

  return particles;
}

// ============================================================
// 粒子渲染层
// ============================================================

const ParticleLayer: React.FC<{
  config: ParticleConfig;
  particles: ParticleInstance[];
  frame: number;
  loopFrames: number;
  width: number;
  height: number;
}> = ({ config, particles, frame, loopFrames, width, height }) => {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        overflow: "hidden",
        pointerEvents: "none",
      }}
    >
      {particles.map((p) => (
        <Particle
          key={p.id}
          instance={p}
          config={config}
          frame={frame}
          loopFrames={loopFrames}
          width={width}
          height={height}
        />
      ))}
    </div>
  );
};

// ============================================================
// 单个粒子
// ============================================================

const Particle: React.FC<{
  instance: ParticleInstance;
  config: ParticleConfig;
  frame: number;
  loopFrames: number;
  width: number;
  height: number;
}> = ({ instance: p, config, frame, loopFrames, width, height }) => {
  // 粒子生命周期内的局部进度
  const lifeProgress = ((frame + p.phase * loopFrames) % Math.max(1, config.lifespan)) / Math.max(1, config.lifespan);

  // 计算位置
  const { x, y, opacity: baseOpacity } = getParticlePosition(
    p,
    config,
    lifeProgress,
    width,
    height
  );

  // 闪烁
  const twinkleAmount = config.twinkle > 0
    ? 1 - config.twinkle * 0.5 + Math.sin(frame * 0.1 + p.phase * Math.PI * 2) * config.twinkle * 0.5
    : 1;

  // 淡入淡出（生命周期首尾）
  const fadeIn = Math.min(1, lifeProgress * 3);
  const fadeOut = Math.min(1, (1 - lifeProgress) * 3);
  const finalOpacity = p.opacity * baseOpacity * twinkleAmount * fadeIn * fadeOut;

  // 粒子形状 SVG
  const shapeSvg = getParticleShape(config.shape, p.size);

  // 光晕
  const glowStyle: React.CSSProperties = {};
  if (config.glow && config.glowColor) {
    const intensity = config.glowIntensity ?? 0.5;
    glowStyle.filter = `drop-shadow(0 0 ${p.size * intensity * 2}px ${config.glowColor})`;
    glowStyle.boxShadow = `0 0 ${p.size * intensity * 3}px ${config.glowColor}`;
  }

  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: p.size,
        height: p.size,
        opacity: Math.max(0, Math.min(1, finalOpacity)),
        transform: "translate(-50%, -50%)",
        willChange: "transform, opacity",
        ...glowStyle,
      }}
    >
      <div
        style={{
          width: "100%",
          height: "100%",
          color: p.color,
        }}
        dangerouslySetInnerHTML={{ __html: shapeSvg }}
      />
    </div>
  );
};

// ============================================================
// 粒子位置计算
// ============================================================

function getParticlePosition(
  p: ParticleInstance,
  config: ParticleConfig,
  progress: number,
  width: number,
  height: number
): { x: number; y: number; opacity: number } {
  const speed = config.speed * p.speedMul;

  switch (config.motion) {
    case "float-up": {
      // 从底部缓慢上浮，带水平漂移
      const y = height - progress * height * (1 + speed * 0.3);
      const driftX = Math.sin(progress * Math.PI * 2 + p.phase * 10) * width * 0.05 * speed;
      const x = p.x + driftX;
      return { x: ((x % width) + width) % width, y: ((y % height) + height) % height, opacity: 1 };
    }

    case "float-random": {
      // 随机漂移
      const driftX = Math.sin(progress * Math.PI * 2.3 + p.phase * 7) * width * 0.06 * speed;
      const driftY = Math.cos(progress * Math.PI * 1.7 + p.phase * 5) * height * 0.04 * speed;
      const x = p.x + driftX;
      const y = p.y + driftY;
      return { x: ((x % width) + width) % width, y: ((y % height) + height) % height, opacity: 1 };
    }

    case "fall-down": {
      // 从顶部下落
      const y = progress * height * (1 + speed * 0.5);
      const wobble = Math.sin(progress * Math.PI * 4 + p.phase * 8) * width * 0.02 * speed;
      const x = p.x + wobble;
      return { x: ((x % width) + width) % width, y: y % (height + 20) - 20, opacity: 1 };
    }

    case "pulse": {
      // 原地脉冲
      const pulseScale = 1 + Math.sin(progress * Math.PI * 2 * speed * 3) * 0.3;
      const pulseOpacity = 0.5 + 0.5 * Math.sin(progress * Math.PI * 2 * speed * 2 + p.phase);
      return { x: p.x, y: p.y, opacity: pulseOpacity };
    }

    case "orbit": {
      // 环绕运动
      const angle = progress * Math.PI * 2 * speed + p.phase * Math.PI * 2;
      const x = p.orbitCenterX + Math.cos(angle) * p.orbitRadius;
      const y = p.orbitCenterY + Math.sin(angle) * p.orbitRadius * 0.6;
      return { x, y, opacity: 1 };
    }

    case "spiral": {
      // 螺旋上升
      const angle = progress * Math.PI * 2 * 3 * speed + p.spiralAngle;
      const r = p.spiralRadius * (0.3 + progress * 0.7);
      const x = width * 0.5 + Math.cos(angle) * r;
      const y = height * 0.5 + Math.sin(angle) * r * 0.5 - progress * height * 0.3;
      return { x, y: y + height * 0.15, opacity: 1 };
    }

    case "zigzag": {
      // 锯齿下落
      const y = progress * height * (1 + speed * 0.4);
      const zigzag = Math.abs(((progress * 8 + p.phase) % 2) - 1) * 2 - 1;
      const driftX = zigzag * width * 0.08 * speed + Math.sin(progress * 20) * width * 0.02;
      const x = p.x + driftX;
      return { x: ((x % width) + width) % width, y: y % (height + 20) - 20, opacity: 1 };
    }

    default:
      return { x: p.x, y: p.y, opacity: 1 };
  }
}

// ============================================================
// 粒子形状 SVG
// ============================================================

function getParticleShape(shape: string, size: number): string {
  switch (shape) {
    case "circle":
      return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}" fill="currentColor"/></svg>`;

    case "star":
      return `<svg width="${size}" height="${size}" viewBox="0 0 24 24"><polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" fill="currentColor"/></svg>`;

    case "heart":
      return `<svg width="${size}" height="${size}" viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" fill="currentColor"/></svg>`;

    case "diamond":
      return `<svg width="${size}" height="${size}" viewBox="0 0 24 24"><polygon points="12,2 22,12 12,22 2,12" fill="currentColor"/></svg>`;

    case "cross":
      return `<svg width="${size}" height="${size}" viewBox="0 0 24 24"><line x1="12" y1="2" x2="12" y2="22" stroke="currentColor" stroke-width="2"/><line x1="2" y1="12" x2="22" y2="12" stroke="currentColor" stroke-width="2"/></svg>`;

    case "ring":
      return `<svg width="${size}" height="${size}" viewBox="0 0 24 24"><circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" stroke-width="2"/></svg>`;

    case "sparkle":
      return `<svg width="${size}" height="${size}" viewBox="0 0 24 24"><path d="M12 2 L13 9 L12 10 L11 9 L12 2Z M12 14 L13 21 L12 22 L11 21 L12 14Z M2 12 L9 13 L10 12 L9 11 L2 12Z M14 12 L21 13 L22 12 L21 11 L14 12Z" fill="currentColor"/></svg>`;

    default:
      return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}" fill="currentColor"/></svg>`;
  }
}
