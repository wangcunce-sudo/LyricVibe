"use client";

import { Film, Music, Wand2, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

export type CreateMode = "video" | "audio-scene";

interface ModeSelectorProps {
  selectedMode: CreateMode | null;
  onSelect: (mode: CreateMode) => void;
}

export function ModeSelector({ selectedMode, onSelect }: ModeSelectorProps) {
  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-white mb-2">
          选择创作方式
        </h2>
        <p className="text-gray-400 text-sm">
          选择一种方式开始制作你的歌词字幕视频
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* 选项 1: 视频模式 */}
        <button
          onClick={() => onSelect("video")}
          className={cn(
            "relative group rounded-2xl border-2 p-8 text-left transition-all duration-300",
            "hover:scale-[1.02] hover:shadow-2xl",
            selectedMode === "video"
              ? "border-sky-400 bg-sky-500/10 shadow-lg shadow-sky-500/20"
              : "border-gray-600 bg-gray-800/50 hover:border-sky-400/60 hover:bg-gray-800"
          )}
        >
          {/* 选中指示器 */}
          {selectedMode === "video" && (
            <div className="absolute top-3 right-3 w-5 h-5 bg-sky-400 rounded-full flex items-center justify-center">
              <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
          )}

          <div className={cn(
            "w-14 h-14 rounded-xl flex items-center justify-center mb-4 transition-colors",
            selectedMode === "video"
              ? "bg-sky-500/20 text-sky-400"
              : "bg-gray-700 text-gray-400 group-hover:bg-sky-500/10 group-hover:text-sky-400"
          )}>
            <Film className="w-7 h-7" />
          </div>

          <h3 className="text-lg font-semibold text-white mb-2">
            📹 上传视频
          </h3>
          <p className="text-sm text-gray-400 leading-relaxed">
            上传你的视频和音频，AI 自动分析歌词情感，生成匹配的字幕样式。保留原始视频画面作为背景。
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            {["MP4", "MOV", "WebM", "音频可选"].map((tag) => (
              <span
                key={tag}
                className={cn(
                  "px-2.5 py-1 text-xs rounded-full font-medium",
                  selectedMode === "video"
                    ? "bg-sky-500/10 text-sky-300"
                    : "bg-gray-700 text-gray-400"
                )}
              >
                {tag}
              </span>
            ))}
          </div>
        </button>

        {/* 选项 2: 音频 + AI 背景模式 */}
        <button
          onClick={() => onSelect("audio-scene")}
          className={cn(
            "relative group rounded-2xl border-2 p-8 text-left transition-all duration-300",
            "hover:scale-[1.02] hover:shadow-2xl",
            selectedMode === "audio-scene"
              ? "border-purple-400 bg-purple-500/10 shadow-lg shadow-purple-500/20"
              : "border-gray-600 bg-gray-800/50 hover:border-purple-400/60 hover:bg-gray-800"
          )}
        >
          {/* 选中指示器 */}
          {selectedMode === "audio-scene" && (
            <div className="absolute top-3 right-3 w-5 h-5 bg-purple-400 rounded-full flex items-center justify-center">
              <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
          )}

          <div className={cn(
            "w-14 h-14 rounded-xl flex items-center justify-center mb-4 transition-colors",
            selectedMode === "audio-scene"
              ? "bg-purple-500/20 text-purple-400"
              : "bg-gray-700 text-gray-400 group-hover:bg-purple-500/10 group-hover:text-purple-400"
          )}>
            <Wand2 className="w-7 h-7" />
          </div>

          <h3 className="text-lg font-semibold text-white mb-2">
            🎵 音频 + AI 背景
          </h3>
          <p className="text-sm text-gray-400 leading-relaxed">
            上传音频 + 用自然语言描述想要的背景，AI 为你生成循环动画底片。无需视频文件。
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            {["MP3", "WAV", "AI 动画背景", "自然语言"].map((tag) => (
              <span
                key={tag}
                className={cn(
                  "px-2.5 py-1 text-xs rounded-full font-medium",
                  selectedMode === "audio-scene"
                    ? "bg-purple-500/10 text-purple-300"
                    : "bg-gray-700 text-gray-400"
                )}
              >
                {tag}
              </span>
            ))}
          </div>
        </button>
      </div>
    </div>
  );
}
