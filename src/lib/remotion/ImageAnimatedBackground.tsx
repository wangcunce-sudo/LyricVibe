/**
 * ImageAnimatedBackground — 基于静态图片的 Remotion 动画背景
 *
 * 支持以下动效：
 *   - Ken Burns 效果（缓慢缩放+平移）
 *   - 头发/衣物飘动模拟（正弦波扭曲效果，通过多个子层模拟）
 *   - 轻微摇摆/呼吸效果
 *   - 粒子叠加（雪花、花瓣、光点等）
 *   - 渐变叠加层
 *
 * 纯 CSS 渲染，确保 Remotion SSR 兼容。
 */

import React, { useMemo } from "react";
import { useCurrentFrame, AbsoluteFill, Img, staticFile } from "remotion";
import type { SceneAnimSpec } from "../animation-types";

// ============================================================
// Props
// ============================================================

export interface ImageAnimatedBackgroundProps {
  /** 图片 URL 或 public 目录下的文件名 */
  imageSrc: string;
  /** 画布尺寸 */
  width: number;
  height: number;
  /** 可选的场景动画规格（用于粒子叠加） */
  scene?: SceneAnimSpec | null;
  /** 动效强度 0-1，默认 0.5 */
  intensity?: number;
}

// ============================================================
// 伪随机数（用于粒子）
// ============================================================

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

// ============================================================
// 主组件
// ============================================================

export const ImageAnimatedBackground: React.FC<ImageAnimatedBackgroundProps> = ({
  imageSrc,
  width,
  height,
  scene,
  intensity = 0.5,
}) => {
  const frame = useCurrentFrame();
  const loopFrames = scene?.loopFrames || 180;
  const loopFrame = frame % loopFrames;
  const progress = loopFrame / Math.max(1, loopFrames);

  // 解析图片路径
  const resolvedSrc = imageSrc.startsWith("http") || imageSrc.startsWith("/")
    ? imageSrc
    : staticFile(imageSrc);

  // ============================================================
  // 1. Ken Burns 效果：缓慢缩放 + 平移
  // ============================================================
  const kenBurnsScale = 1 + Math.sin(progress * Math.PI * 2) * 0.04 * intensity
    + progress * 0.06 * intensity; // 总体缓慢放大

  const kenBurnsX = Math.cos(progress * Math.PI * 1.5) * 3 * intensity;
  const kenBurnsY = Math.sin(progress * Math.PI * 0.8) * 2 * intensity;

  // ============================================================
  // 2. 呼吸/摇摆效果
  // ============================================================
  const breatheScale = 1 + Math.sin(frame * 0.03) * 0.01 * intensity;
  const swayRotate = Math.sin(frame * 0.02 + 0.5) * 0.5 * intensity; // 轻微摇摆（度）

  // ============================================================
  // 3. 头发飘动模拟：多层正弦波 offset
  // ============================================================
  const hairWaveAmplitude = 6 * intensity;
  const hairWave1 = Math.sin(frame * 0.08) * hairWaveAmplitude;
  const hairWave2 = Math.sin(frame * 0.08 + 1.2) * hairWaveAmplitude * 0.7;
  const hairWave3 = Math.sin(frame * 0.08 + 2.4) * hairWaveAmplitude * 0.5;

  // ============================================================
  // 4. 光效闪烁
  // ============================================================
  const lightFlicker = 1 + Math.sin(frame * 0.15) * 0.03 * intensity
    + Math.sin(frame * 0.37) * 0.02 * intensity;

  // ============================================================
  // 5. 粒子数据（如果提供了 scene）
  // ============================================================
  const particles = useMemo(() => {
    if (!scene?.particles) return [];
    const rng = seededRandom(99);
    const count = Math.min(scene.particles.count, 80); // 图片模式粒子少一些
    const result: Array<{
      x: number; y: number; size: number; color: string;
      opacity: number; phase: number; speedMul: number;
    }> = [];

    for (let i = 0; i < count; i++) {
      const colorIdx = Math.floor(rng() * scene.particles!.colors.length);
      result.push({
        x: rng() * width,
        y: rng() * height,
        size: scene.particles!.minSize + rng() * (scene.particles!.maxSize - scene.particles!.minSize),
        color: scene.particles!.colors[colorIdx],
        opacity: scene.particles!.minOpacity + rng() * (scene.particles!.maxOpacity - scene.particles!.minOpacity),
        phase: rng(),
        speedMul: 0.5 + rng() * 1.0,
      });
    }
    return result;
  }, [scene, width, height]);

  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      {/* 深色底色 */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "linear-gradient(180deg, #0a0a0f 0%, #1a1a2e 50%, #0d0d1a 100%)",
        }}
      />

      {/* ======== 主图片层：Ken Burns + 呼吸 ======== */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transform: `translate(${kenBurnsX}px, ${kenBurnsY}px)`,
          willChange: "transform",
        }}
      >
        <div
          style={{
            width: "100%",
            height: "100%",
            transform: `scale(${kenBurnsScale * breatheScale}) rotate(${swayRotate}deg)`,
            transformOrigin: "center center",
            willChange: "transform",
          }}
        >
          <Img
            src={resolvedSrc}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              objectPosition: "center 30%", // 偏上，人脸区域居中
            }}
          />
        </div>
      </div>

      {/* ======== 头发飘动叠加层（clip-path 模拟） ======== */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          opacity: 0.15 * intensity,
          filter: `blur(${4 * intensity}px)`,
          transform: `translateX(${hairWave1}px)`,
          pointerEvents: "none",
        }}
      >
        <Img
          src={resolvedSrc}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            objectPosition: "center 30%",
          }}
        />
      </div>

      {/* ======== 光效叠加层 ======== */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `radial-gradient(ellipse at 50% 40%, 
            rgba(255, 255, 255, ${0.06 * intensity * lightFlicker}) 0%, 
            transparent 60%)`,
          pointerEvents: "none",
        }}
      />

      {/* ======== 暗角效果 ======== */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `radial-gradient(ellipse at center, 
            transparent 50%, 
            rgba(0, 0, 0, ${0.35 + 0.15 * intensity}) 100%)`,
          pointerEvents: "none",
        }}
      />

      {/* ======== 粒子层（如果提供了 scene） ======== */}
      {particles.length > 0 && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            overflow: "hidden",
            pointerEvents: "none",
          }}
        >
          {particles.map((p, i) => {
            const lifeProgress = ((loopFrame + p.phase * loopFrames) % Math.max(1, scene?.particles?.lifespan || 180))
              / Math.max(1, scene?.particles?.lifespan || 180);
            const floatY = -lifeProgress * height * 0.8;
            const floatX = Math.sin(lifeProgress * Math.PI * 3 + p.phase * 8) * width * 0.03;
            const fadeIn = Math.min(1, lifeProgress * 3);
            const fadeOut = Math.min(1, (1 - lifeProgress) * 3);
            const twinkle = 1 + Math.sin(frame * 0.1 + p.phase * Math.PI * 2) * 0.3;
            const finalOpacity = p.opacity * fadeIn * fadeOut * twinkle * 0.7;

            return (
              <div
                key={i}
                style={{
                  position: "absolute",
                  left: p.x + floatX,
                  top: height + floatY,
                  width: p.size,
                  height: p.size,
                  borderRadius: "50%",
                  background: p.color,
                  opacity: Math.max(0, Math.min(1, finalOpacity)),
                  transform: "translate(-50%, -50%)",
                  boxShadow: `0 0 ${p.size * 2}px ${p.color}`,
                  willChange: "transform, opacity",
                }}
              />
            );
          })}
        </div>
      )}

      {/* ======== 整体色调调整层 ======== */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "rgba(10, 10, 30, 0.1)",
          mixBlendMode: "multiply" as const,
          pointerEvents: "none",
        }}
      />
    </AbsoluteFill>
  );
};
