"use client";

import { useRef, useEffect, useCallback, useState } from "react";
import { Play, Pause, SkipBack, SkipForward } from "lucide-react";
import { cn, formatTime } from "@/lib/utils";
import type {
  LyricLine,
  StyleParams,
  FilterType,
  AnimationType,
  AspectRatio,
} from "@/lib/types";
import { FILTER_PRESETS } from "@/lib/types";

interface VideoPreviewProps {
  videoUrl?: string;
  audioUrl: string;
  lyrics: LyricLine[];
  styleParams: StyleParams;
  filter: FilterType;
  speed: number;
  pitch: number;
  aspectRatio: AspectRatio;
  currentTime: number;
  onTimeUpdate: (time: number) => void;
  isPlaying: boolean;
  onPlayPause: () => void;
}

export function VideoPreview({
  videoUrl,
  audioUrl,
  lyrics,
  styleParams,
  filter,
  speed,
  pitch,
  aspectRatio,
  currentTime,
  onTimeUpdate,
  isPlaying,
  onPlayPause,
}: VideoPreviewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);
  const [duration, setDuration] = useState(0);

  // Sync video and audio playback
  useEffect(() => {
    const audio = audioRef.current;
    const video = videoRef.current;
    if (!audio) return;

    audio.playbackRate = speed;

    if (isPlaying) {
      audio.play().catch(() => {});
      if (video && videoUrl) video.play().catch(() => {});
    } else {
      audio.pause();
      if (video && videoUrl) video.pause();
    }
  }, [isPlaying, speed, videoUrl]);

  // Sync currentTime between audio and video
  useEffect(() => {
    const audio = audioRef.current;
    const video = videoRef.current;
    if (!audio) return;

    const diff = Math.abs(audio.currentTime - currentTime);
    if (diff > 0.3) {
      audio.currentTime = currentTime;
      if (video && videoUrl) video.currentTime = currentTime;
    }
  }, [currentTime, videoUrl]);

  // Time update loop
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTimeUpdateHandler = () => {
      onTimeUpdate(audio.currentTime);
    };

    const onLoadedMetadata = () => {
      setDuration(audio.duration);
    };

    audio.addEventListener("timeupdate", onTimeUpdateHandler);
    audio.addEventListener("loadedmetadata", onLoadedMetadata);
    audio.addEventListener("ended", () => onPlayPause());

    return () => {
      audio.removeEventListener("timeupdate", onTimeUpdateHandler);
      audio.removeEventListener("loadedmetadata", onLoadedMetadata);
      audio.removeEventListener("ended", () => onPlayPause());
    };
  }, [onTimeUpdate, onPlayPause]);

  // Render lyrics subtitle on canvas overlay
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const render = () => {
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      // Find current lyric line
      const currentLine = lyrics.find(
        (l) => currentTime >= l.startTime && currentTime < l.endTime
      );

      if (currentLine) {
        const progress =
          (currentTime - currentLine.startTime) /
          (currentLine.endTime - currentLine.startTime);

        drawLyricLine(ctx, currentLine, progress, styleParams, w, h);
      }

      animFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animFrameRef.current);
    };
  }, [lyrics, currentTime, styleParams]);

  // Set canvas size
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      canvas.width = parent.clientWidth;
      canvas.height = parent.clientHeight;
    };

    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  const aspectClass =
    aspectRatio === "9:16"
      ? "aspect-[9/16]"
      : aspectRatio === "1:1"
      ? "aspect-square"
      : aspectRatio === "4:5"
      ? "aspect-[4/5]"
      : "aspect-video";

  return (
    <div className="space-y-3">
      {/* Preview container */}
      <div
        className={cn(
          "relative bg-black rounded-lg overflow-hidden mx-auto max-w-full",
          aspectClass
        )}
        style={{ maxHeight: "60vh" }}
      >
        {/* Background video or solid color */}
        {videoUrl ? (
          <video
            ref={videoRef}
            src={videoUrl}
            className="absolute inset-0 w-full h-full object-cover"
            style={{ filter: FILTER_PRESETS[filter] }}
            playsInline
            muted
          />
        ) : (
          <div
            className="absolute inset-0 w-full h-full"
            style={{
              background: `linear-gradient(135deg, ${styleParams.primaryColor}22, ${styleParams.accentColor}33)`,
            }}
          />
        )}

        {/* Subtitle canvas overlay */}
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full z-10"
        />

        {/* Audio element (hidden) */}
        <audio ref={audioRef} src={audioUrl} preload="auto" />
      </div>

      {/* Playback controls */}
      <div className="flex items-center gap-3 px-2">
        <button
          onClick={onPlayPause}
          className="p-2 rounded-full hover:bg-gray-100 transition-colors"
        >
          {isPlaying ? (
            <Pause className="w-6 h-6" />
          ) : (
            <Play className="w-6 h-6" />
          )}
        </button>

        <span className="text-sm font-mono text-gray-600 min-w-[80px]">
          {formatTime(currentTime)} / {formatTime(duration)}
        </span>

        {/* Progress bar */}
        <div
          className="flex-1 h-2 bg-gray-200 rounded-full cursor-pointer relative"
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const ratio = x / rect.width;
            onTimeUpdate(ratio * duration);
          }}
        >
          <div
            className="h-full bg-purple-500 rounded-full transition-all"
            style={{
              width: duration > 0 ? `${(currentTime / duration) * 100}%` : "0%",
            }}
          />
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Canvas drawing helpers for different animation types
// ============================================================

function drawLyricLine(
  ctx: CanvasRenderingContext2D,
  line: { text: string; startTime: number; endTime: number },
  progress: number,
  params: StyleParams,
  w: number,
  h: number
) {
  const {
    fontFamily,
    fontSize,
    primaryColor,
    secondaryColor,
    accentColor,
    animation,
    fontWeight,
    textShadow,
  } = params;

  ctx.save();

  // Set font
  ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  const x = w / 2;
  const y = h * 0.75;
  const clampedProgress = Math.max(0, Math.min(1, progress));

  // Text shadow for readability
  if (textShadow) {
    ctx.shadowColor = "rgba(0,0,0,0.7)";
    ctx.shadowBlur = fontSize * 0.3;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;
  } else {
    ctx.shadowColor = "rgba(0,0,0,0.5)";
    ctx.shadowBlur = fontSize * 0.15;
    ctx.shadowOffsetX = 1;
    ctx.shadowOffsetY = 1;
  }

  switch (animation) {
    case "karaoke":
      drawKaraoke(ctx, line.text, x, y, clampedProgress, primaryColor, accentColor);
      break;
    case "typewriter":
      drawTypewriter(ctx, line.text, x, y, clampedProgress, primaryColor, secondaryColor);
      break;
    case "bounce":
      drawBounce(ctx, line.text, x, y, clampedProgress, primaryColor, fontSize);
      break;
    case "scale-up":
      drawScaleUp(ctx, line.text, x, y, clampedProgress, primaryColor, fontSize);
      break;
    case "slide-up":
      drawSlideUp(ctx, line.text, x, y, clampedProgress, primaryColor, fontSize);
      break;
    case "fade-in":
    default:
      drawFadeIn(ctx, line.text, x, y, clampedProgress, primaryColor, secondaryColor);
      break;
  }

  ctx.restore();
}

function drawFadeIn(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  progress: number,
  primary: string,
  secondary: string
) {
  const alpha = Math.min(1, progress * 2);
  ctx.globalAlpha = 0.3 + alpha * 0.7;

  // Draw background text (previous line effect)
  ctx.fillStyle = secondary;
  ctx.globalAlpha = 0.2;
  ctx.fillText(text, x, y + 60);
  ctx.globalAlpha = 0.3 + alpha * 0.7;

  ctx.fillStyle = primary;
  ctx.fillText(text, x, y);
}

function drawKaraoke(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  progress: number,
  primary: string,
  accent: string
) {
  // Full text in dim
  ctx.fillStyle = primary;
  ctx.globalAlpha = 0.3;
  ctx.fillText(text, x, y);

  // Measure text for clipping
  const metrics = ctx.measureText(text);
  const textWidth = metrics.width;
  const clipWidth = textWidth * progress;

  // Draw highlighted portion
  ctx.save();
  ctx.beginPath();
  ctx.rect(x - textWidth / 2, y - 60, clipWidth, 120);
  ctx.clip();

  ctx.fillStyle = accent;
  ctx.globalAlpha = 1;
  ctx.fillText(text, x, y);
  ctx.restore();
}

function drawTypewriter(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  progress: number,
  primary: string,
  secondary: string
) {
  const visibleChars = Math.floor(text.length * progress);
  const visibleText = text.slice(0, visibleChars);

  ctx.fillStyle = primary;
  ctx.globalAlpha = 1;
  ctx.fillText(visibleText, x, y);

  // Blinking cursor
  if (progress < 1 && Math.floor(Date.now() / 500) % 2 === 0) {
    const metrics = ctx.measureText(visibleText);
    const cursorX = x + metrics.width / 2 + 4;
    ctx.fillStyle = primary;
    ctx.fillRect(cursorX, y - 24, 3, 48);
  }
}

function drawBounce(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  progress: number,
  primary: string,
  fontSize: number
) {
  const bounce = Math.sin(progress * Math.PI) * 8;
  const scale = 1 + Math.sin(progress * Math.PI) * 0.05;

  ctx.save();
  ctx.translate(x, y + bounce);
  ctx.scale(scale, scale);
  ctx.fillStyle = primary;
  ctx.globalAlpha = Math.min(1, progress * 2);
  ctx.fillText(text, 0, 0);
  ctx.restore();
}

function drawScaleUp(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  progress: number,
  primary: string,
  fontSize: number
) {
  const scale = 0.8 + progress * 0.3;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.fillStyle = primary;
  ctx.globalAlpha = Math.min(1, progress * 1.5);
  ctx.fillText(text, 0, 0);
  ctx.restore();
}

function drawSlideUp(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  progress: number,
  primary: string,
  fontSize: number
) {
  const offsetY = (1 - progress) * 30;
  ctx.fillStyle = primary;
  ctx.globalAlpha = Math.min(1, progress * 2);
  ctx.fillText(text, x, y + offsetY);
}
