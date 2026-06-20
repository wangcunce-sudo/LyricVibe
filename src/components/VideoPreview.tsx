"use client";

import { useRef, useEffect, useCallback, useState, useMemo } from "react";
import { Play, Pause, Volume2, VolumeX, Gauge, Loader2, RefreshCw } from "lucide-react";
import { cn, formatTime } from "@/lib/utils";
import { logger } from "@/lib/logger";
import type {
  LyricLine,
  StyleParams,
  FilterType,
  AspectRatio,
  SubtitleTemplate,
} from "@/lib/types";
import { FILTER_PRESETS, styleParamsToTemplate } from "@/lib/types";
import { toneEngine } from "@/lib/tone-engine";
import { Player } from "@remotion/player";
import { SubtitleComposition } from "@/lib/remotion/SubtitleComposition";
import type { BeatInfo } from "@/lib/beat-detector";
import { detectBeatsFromUrl } from "@/lib/beat-detector";

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
  subtitleTemplate?: SubtitleTemplate;
}

const SPEED_OPTIONS = [0.5, 0.75, 1, 1.25, 1.5, 2];
const SEEK_THRESHOLD_SEC = 0.3;
const FPS = 30;

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
  subtitleTemplate,
}: VideoPreviewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [duration, setDuration] = useState(0);
  const [audioLoaded, setAudioLoaded] = useState(false);
  const [muted, setMuted] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [localSpeed, setLocalSpeed] = useState(speed);
  const [engineReady, setEngineReady] = useState(false);
  const [beats, setBeats] = useState<BeatInfo[] | undefined>(undefined);
  const audioInitializedRef = useRef(false);

  const hasVideo = !!videoUrl;

  // ── Merge styleParams into subtitleTemplate ──
  const template = useMemo(() => {
    const base = subtitleTemplate || styleParamsToTemplate(styleParams);
    return {
      ...base,
      render: {
        ...base.render,
        fontFamily: styleParams.fontFamily,
        fontSize: styleParams.fontSize,
        fontWeight: styleParams.fontWeight,
        primaryColor: styleParams.primaryColor,
        secondaryColor: styleParams.secondaryColor,
        accentColor: styleParams.accentColor,
        textShadow: styleParams.textShadow,
      },
      animation: {
        ...base.animation,
        entrance: styleParams.animation,
      },
    };
  }, [subtitleTemplate, styleParams]);

  // ── Find current lyric line and progress ──
  const currentLine = lyrics.find(
    (l) => currentTime >= l.startTime && currentTime < l.endTime
  ) || null;

  const progress = currentLine
    ? (currentTime - currentLine.startTime) /
      (currentLine.endTime - currentLine.startTime)
    : 0;

  // ── Calculate current frame from currentTime ──
  const currentFrame = Math.floor(currentTime * FPS);

  // ── Calculate total duration in frames ──
  const durationInFrames = useMemo(() => {
    if (lyrics.length === 0) return 30 * FPS;
    const lastLine = lyrics[lyrics.length - 1];
    return Math.ceil((lastLine.endTime + 1) * FPS);
  }, [lyrics]);

  // ── Clamp inFrame to avoid Player error (must be < durationInFrames) ──
  const safeFrame = Math.max(0, Math.min(currentFrame, Math.max(1, durationInFrames) - 1));

  // ── Beat detection ──
  useEffect(() => {
    if (!audioUrl) return;

    let cancelled = false;
    setBeats(undefined);

    detectBeatsFromUrl(audioUrl)
      .then((result) => {
        if (cancelled) return;
        setBeats(result.beats);
        logger.info("VideoPreview", `Beat detection: ${result.beats.length} beats, BPM: ${result.bpm}`);
      })
      .catch((err) => {
        logger.warn("VideoPreview", "Beat detection failed:", err);
      });

    return () => { cancelled = true; };
  }, [audioUrl]);

  // ── Tone.js audio engine setup ──
  useEffect(() => {
    if (!audioUrl) return;

    let cancelled = false;
    setAudioLoaded(false);
    setEngineReady(false);
    audioInitializedRef.current = false;

    const init = async () => {
      try {
        await toneEngine.load(audioUrl);
        if (cancelled) return;
        setDuration(toneEngine.duration);
        setAudioLoaded(true);
        setEngineReady(true);
        audioInitializedRef.current = true;
      } catch (err) {
        logger.warn("VideoPreview", "Tone.js engine load failed:", err);
        setAudioLoaded(true);
        setEngineReady(false);
      }
    };

    toneEngine.setCallbacks({
      onTimeUpdate: (time: number) => {
        onTimeUpdate(time);
      },
      onEnded: () => {
        onPlayPause();
      },
      onStateChange: () => {},
    });

    init();

    return () => {
      cancelled = true;
      toneEngine.pause();
      toneEngine.setCallbacks({});
    };
  }, [audioUrl]);

  // ── Video element setup ──
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !videoUrl) {
      setVideoReady(true);
      return;
    }

    setVideoReady(false);

    const onLoaded = () => {
      setVideoReady(true);
    };

    video.addEventListener("loadeddata", onLoaded);
    video.src = videoUrl;
    video.load();

    return () => {
      video.removeEventListener("loadeddata", onLoaded);
    };
  }, [videoUrl]);

  // ── Sync speed from props ──
  useEffect(() => {
    setLocalSpeed(speed);
  }, [speed]);

  // ── Apply speed & pitch to Tone.js engine ──
  useEffect(() => {
    if (!audioInitializedRef.current) return;
    toneEngine.setSpeed(localSpeed);
  }, [localSpeed]);

  useEffect(() => {
    if (!audioInitializedRef.current) return;
    toneEngine.setPitch(pitch);
  }, [pitch]);

  // ── Apply speed to video element ──
  useEffect(() => {
    if (videoRef.current) videoRef.current.playbackRate = localSpeed;
  }, [localSpeed]);

  // ── Handle play/pause ──
  useEffect(() => {
    const video = videoRef.current;
    if (!audioInitializedRef.current) return;

    if (isPlaying) {
      toneEngine.play();
      if (video && hasVideo) {
        video.currentTime = toneEngine.currentTime;
        video.play().catch((e) => logger.warn("VideoPreview", "Video play failed:", e));
      }
    } else {
      toneEngine.pause();
      if (video && hasVideo) video.pause();
    }
  }, [isPlaying, hasVideo]);

  // ── Sync currentTime (seek) ──
  useEffect(() => {
    const video = videoRef.current;
    if (!audioInitializedRef.current) return;
    const diff = Math.abs(toneEngine.currentTime - currentTime);
    if (diff > SEEK_THRESHOLD_SEC) {
      toneEngine.seek(currentTime);
      if (video && hasVideo) video.currentTime = currentTime;
    }
  }, [currentTime, hasVideo]);

  // ── Mute control ──
  useEffect(() => {
    if (audioInitializedRef.current) {
      toneEngine.setVolume(muted ? 0 : 1);
    }
    if (videoRef.current) videoRef.current.muted = true;
  }, [muted]);

  // ── Seek handler ──
  const handleSeek = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const ratio = x / rect.width;
      const newTime = ratio * duration;
      onTimeUpdate(newTime);
      toneEngine.seek(newTime);
      if (videoRef.current && hasVideo)
        videoRef.current.currentTime = newTime;
    },
    [duration, hasVideo, onTimeUpdate]
  );

  // ── Keyboard shortcuts ──
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.code === "Space") {
        e.preventDefault();
        onPlayPause();
      }
      if (e.code === "ArrowRight") {
        const newTime = Math.min(currentTime + 5, duration);
        onTimeUpdate(newTime);
        toneEngine.seek(newTime);
      }
      if (e.code === "ArrowLeft") {
        const newTime = Math.max(currentTime - 5, 0);
        onTimeUpdate(newTime);
        toneEngine.seek(newTime);
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [currentTime, duration, onPlayPause, onTimeUpdate]);

  const aspectClass =
    aspectRatio === "9:16"
      ? "aspect-[9/16]"
      : aspectRatio === "1:1"
        ? "aspect-square"
        : aspectRatio === "4:5"
          ? "aspect-[4/5]"
          : "aspect-video";

  // Player composition dimensions
  const compWidth = 1920;
  const compHeight = 1080;

  return (
    <div className="space-y-3 w-full">
      {/* Preview container */}
      <div
        className={cn(
          "relative bg-black rounded-lg overflow-hidden mx-auto max-w-full group",
          aspectClass
        )}
        style={{ maxHeight: "60vh" }}
      >
        {/* Background video or gradient */}
        {hasVideo ? (
          <video
            ref={videoRef}
            className="absolute inset-0 w-full h-full object-cover"
            style={{ filter: FILTER_PRESETS[filter] }}
            playsInline
            muted
            preload="auto"
          />
        ) : (
          <div
            className="absolute inset-0 w-full h-full"
            style={{
              background: `linear-gradient(135deg, ${styleParams.primaryColor}22, ${styleParams.accentColor}33)`,
            }}
          />
        )}

        {/* ── Remotion Player 字幕层 ──
            替代原来的 Canvas，100% 还原 Remotion 渲染效果 */}
        <div className="absolute inset-0 z-10 pointer-events-none">
          <Player
            component={SubtitleComposition}
            inputProps={{
              currentLine,
              progress,
              styleParams,
              subtitleTemplate: template,
              totalLines: lyrics.length,
              width: compWidth,
              height: compHeight,
              speed,
              beats,
            }}
            durationInFrames={Math.max(1, durationInFrames)}
            fps={FPS}
            compositionWidth={compWidth}
            compositionHeight={compHeight}
            style={{
              width: "100%",
              height: "100%",
              background: "transparent",
            }}
            controls={false}
            loop={false}
            // Manually seek to current frame (synced with Tone.js audio)
            // Clamped to avoid "inFrame must be < durationInFrames" error
            inFrame={safeFrame}
            initiallyMuted
            showPosterWhenPaused={false}
            showPosterWhenEnded={false}
          />
        </div>

        {/* Loading overlay */}
        {!audioLoaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 z-20">
            <div className="text-white text-sm flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              加载音频引擎...
            </div>
          </div>
        )}

        {/* Center play/pause button */}
        {audioLoaded && (
          <button
            onClick={onPlayPause}
            className={cn(
              "absolute inset-0 flex items-center justify-center bg-black/20 z-20 transition-opacity",
              isPlaying ? "opacity-0 hover:opacity-100" : "opacity-100 hover:bg-black/30"
            )}
          >
            <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur flex items-center justify-center hover:scale-110 transition-transform">
              {isPlaying ? (
                <Pause className="w-8 h-8 text-white" />
              ) : (
                <Play className="w-8 h-8 text-white ml-1" />
              )}
            </div>
          </button>
        )}

        {/* Refresh button */}
        {audioLoaded && (
          <button
            onClick={() => {
              toneEngine.dispose();
              setAudioLoaded(false);
              setEngineReady(false);
              audioInitializedRef.current = false;
              toneEngine.setCallbacks({
                onTimeUpdate: (time: number) => {
                  onTimeUpdate(time);
                },
                onEnded: () => {
                  onPlayPause();
                },
                onStateChange: () => {},
              });
              toneEngine.load(audioUrl).then(() => {
                setDuration(toneEngine.duration);
                setAudioLoaded(true);
                setEngineReady(true);
                audioInitializedRef.current = true;
              }).catch((err) => {
                logger.warn("VideoPreview", "Tone.js reload failed:", err);
                setAudioLoaded(true);
                setEngineReady(false);
              });
            }}
            className="absolute top-3 right-3 z-20 p-2 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur transition-colors"
            title="刷新视频"
          >
            <RefreshCw className="w-4 h-4 text-white" />
          </button>
        )}
      </div>

      {/* ── Full-featured playback controls ── */}
      <div className="flex items-center gap-3 px-1">
        {/* Play/Pause button */}
        <button
          onClick={onPlayPause}
          className="p-2 rounded-full hover:bg-sky-100 transition-colors text-sky-600"
          disabled={!audioLoaded}
          title={isPlaying ? "暂停" : "播放"}
        >
          {isPlaying ? (
            <Pause className="w-5 h-5" />
          ) : (
            <Play className="w-5 h-5" />
          )}
        </button>

        {/* Time display */}
        <span className="text-sm font-mono text-gray-500 min-w-[90px] tabular-nums">
          {formatTime(currentTime)} / {formatTime(duration)}
        </span>

        {/* Progress bar */}
        <div
          className="flex-1 h-2 bg-gray-200 rounded-full cursor-pointer relative group/progress hover:h-3 transition-all"
          onClick={handleSeek}
        >
          <div
            className="h-full bg-gradient-to-r from-sky-400 to-blue-500 rounded-full transition-all relative"
            style={{
              width: duration > 0 ? `${(currentTime / duration) * 100}%` : "0%",
            }}
          >
            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-white rounded-full shadow-md border-2 border-sky-400 opacity-0 group-hover/progress:opacity-100 transition-opacity" />
          </div>
        </div>

        {/* Speed control */}
        <div className="relative">
          <button
            onClick={() => setShowSpeedMenu(!showSpeedMenu)}
            className="flex items-center gap-1 px-2 py-1 rounded-md hover:bg-sky-100 transition-colors text-sm font-mono text-sky-600"
            title="倍速"
          >
            <Gauge className="w-4 h-4" />
            <span>{localSpeed}x</span>
          </button>

          {showSpeedMenu && (
            <>
              <div
                className="fixed inset-0 z-30"
                onClick={() => setShowSpeedMenu(false)}
              />
              <div className="absolute bottom-full right-0 mb-2 bg-white rounded-xl shadow-xl border border-gray-200 py-1 z-40 min-w-[80px]">
                {SPEED_OPTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => {
                      setLocalSpeed(s);
                      setShowSpeedMenu(false);
                    }}
                    className={cn(
                      "w-full px-4 py-2 text-sm text-left hover:bg-sky-50 transition-colors font-mono",
                      localSpeed === s
                        ? "text-sky-600 font-bold bg-sky-50"
                        : "text-gray-600"
                    )}
                  >
                    {s}x
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Mute button */}
        <button
          onClick={() => setMuted(!muted)}
          className="p-1.5 rounded-full hover:bg-sky-100 transition-colors"
          title={muted ? "取消静音" : "静音"}
        >
          {muted ? (
            <VolumeX className="w-4 h-4 text-gray-400" />
          ) : (
            <Volume2 className="w-4 h-4 text-sky-600" />
          )}
        </button>
      </div>
    </div>
  );
}
