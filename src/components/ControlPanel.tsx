"use client";

import { useState, memo, useEffect } from "react";
import {
  Palette,
  Sparkles,
  Type,
  Music,
  Sliders,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { tEmotion } from "@/lib/i18n/dictionaries";
import type {
  AnalysisResult,
  StyleParams,
  FilterType,
  AnimationType,
  LyricLine,
  FileInfo,
} from "@/lib/types";
import {
  FILTER_LABELS,
  FILTER_PRESETS,
  STYLE_TEMPLATES,
  ANIMATION_LABELS,
} from "@/lib/types";
import { PRESET_TEMPLATES, PRESET_STYLES, OPHELIA_TEMPLATE, OPHELIA_STYLE } from "@/lib/demo-data";
import type { SubtitleTemplate } from "@/lib/types";
import type { SceneAnimSpec } from "@/lib/animation-types";
import { SCENE_PRESETS } from "@/lib/animation-types";

interface ControlPanelProps {
  analysis: AnalysisResult | null;
  styleParams: StyleParams;
  stylePrompt: string;
  filter: FilterType;
  speed: number;
  pitch: number;
  lyrics: LyricLine[];
  onStylePromptChange: (prompt: string) => void;
  onStylePromptApply: () => void;
  onStyleParamsChange: (params: StyleParams) => void;
  onFilterChange: (filter: FilterType) => void;
  onSpeedChange: (speed: number) => void;
  onPitchChange: (pitch: number) => void;
  onAnalyze: () => void;
  isAnalyzing: boolean;
  alternativeStyles?: Record<string, StyleParams>;
  onApplyAlternativeStyle?: (key: string) => void;
  /** 字幕模板相关 */
  subtitleTemplate?: SubtitleTemplate;
  templateDescription?: string;
  onTemplateDescriptionChange?: (desc: string) => void;
  onTemplateGenerate?: () => void;
  onSubtitleTemplateChange?: (template: SubtitleTemplate) => void;
  /** AI 识别到的歌曲名 */
  songTitle?: string | null;
  /** 动画底片场景相关 */
  backgroundScene?: import("@/lib/animation-types").SceneAnimSpec | null;
  backgroundSceneDescription?: string;
  onBackgroundSceneDescriptionChange?: (desc: string) => void;
  onBackgroundSceneGenerate?: () => void;
  onBackgroundSceneChange?: (scene: import("@/lib/animation-types").SceneAnimSpec | null) => void;
  isGeneratingScene?: boolean;
  /** 图片背景相关 */
  backgroundImageFile?: FileInfo | null;
  onBackgroundImageFileChange?: (file: FileInfo | null) => void;
}

type Tab = "style" | "filter" | "audio" | "advanced" | "scene";

export function ControlPanel({
  analysis,
  styleParams,
  stylePrompt,
  filter,
  speed,
  pitch,
  lyrics,
  onStylePromptChange,
  onStylePromptApply,
  onStyleParamsChange,
  onFilterChange,
  onSpeedChange,
  onPitchChange,
  onAnalyze,
  isAnalyzing,
  alternativeStyles,
  onApplyAlternativeStyle,
  subtitleTemplate,
  templateDescription = "",
  onTemplateDescriptionChange,
  onTemplateGenerate,
  onSubtitleTemplateChange,
  songTitle,
  backgroundScene,
  backgroundSceneDescription = "",
  onBackgroundSceneDescriptionChange,
  onBackgroundSceneGenerate,
  onBackgroundSceneChange,
  isGeneratingScene = false,
  backgroundImageFile,
  onBackgroundImageFileChange,
}: ControlPanelProps) {
  const { locale, t } = useI18n();
  const cpDict = t("controlPanel");

  const [activeTab, setActiveTab] = useState<Tab>("style");
  const [localPrompt, setLocalPrompt] = useState(stylePrompt);

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "style", label: cpDict.tabs.style, icon: <Sparkles className="w-4 h-4" /> },
    { id: "filter", label: cpDict.tabs.filter, icon: <Palette className="w-4 h-4" /> },
    { id: "audio", label: cpDict.tabs.audio, icon: <Music className="w-4 h-4" /> },
    { id: "advanced", label: cpDict.tabs.advanced, icon: <Sliders className="w-4 h-4" /> },
    { id: "scene", label: "背景", icon: <Palette className="w-4 h-4" /> },
  ];

  return (
    <div className="bg-white rounded-xl shadow-lg border border-sky-100 h-full flex flex-col">
      {/* Tab bar */}
      <div className="flex border-b border-gray-200 px-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex items-center gap-1.5 px-4 py-3 text-sm font-medium transition-colors border-b-2 -mb-px",
              activeTab === tab.id
                ? "border-sky-500 text-sky-600"
                : "border-transparent text-gray-400 hover:text-gray-600"
            )}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === "style" && (
          <StyleTab
            analysis={analysis}
            styleParams={styleParams}
            stylePrompt={stylePrompt}
            localPrompt={localPrompt}
            onLocalPromptChange={setLocalPrompt}
            onStylePromptApply={onStylePromptApply}
            onStyleParamsChange={onStyleParamsChange}
            onAnalyze={onAnalyze}
            isAnalyzing={isAnalyzing}
            lyrics={lyrics}
            alternativeStyles={alternativeStyles}
            onApplyAlternativeStyle={onApplyAlternativeStyle}
            templateDescription={templateDescription}
            onTemplateDescriptionChange={onTemplateDescriptionChange}
            onTemplateGenerate={onTemplateGenerate}
            onSubtitleTemplateChange={onSubtitleTemplateChange}
            subtitleTemplate={subtitleTemplate}
            songTitle={songTitle}
          />
        )}

        {activeTab === "filter" && (
          <FilterTab
            filter={filter}
            onFilterChange={onFilterChange}
          />
        )}

        {activeTab === "audio" && (
          <AudioTab
            speed={speed}
            pitch={pitch}
            onSpeedChange={onSpeedChange}
            onPitchChange={onPitchChange}
          />
        )}

        {activeTab === "advanced" && (
          <AdvancedTab
            styleParams={styleParams}
            onStyleParamsChange={onStyleParamsChange}
          />
        )}

        {activeTab === "scene" && (
          <SceneTab
            backgroundScene={backgroundScene}
            description={backgroundSceneDescription}
            onDescriptionChange={onBackgroundSceneDescriptionChange}
            onGenerate={onBackgroundSceneGenerate}
            onSceneChange={onBackgroundSceneChange}
            isGenerating={isGeneratingScene}
            backgroundImageFile={backgroundImageFile}
            onBackgroundImageFileChange={onBackgroundImageFileChange}
          />
        )}
      </div>
    </div>
  );
}

// ============================================================
// Style Tab
// ============================================================

function StyleTab({
  analysis,
  styleParams,
  stylePrompt,
  localPrompt,
  onLocalPromptChange,
  onStylePromptApply,
  onStyleParamsChange,
  onAnalyze,
  isAnalyzing,
  lyrics,
  alternativeStyles,
  onApplyAlternativeStyle,
  templateDescription = "",
  onTemplateDescriptionChange,
  onTemplateGenerate,
  onSubtitleTemplateChange,
  subtitleTemplate,
  songTitle,
}: {
  analysis: AnalysisResult | null;
  styleParams: StyleParams;
  stylePrompt: string;
  localPrompt: string;
  onLocalPromptChange: (v: string) => void;
  onStylePromptApply: () => void;
  onStyleParamsChange: (p: StyleParams) => void;
  onAnalyze: () => void;
  isAnalyzing: boolean;
  lyrics: LyricLine[];
  alternativeStyles?: Record<string, StyleParams>;
  onApplyAlternativeStyle?: (key: string) => void;
  templateDescription?: string;
  onTemplateDescriptionChange?: (desc: string) => void;
  onTemplateGenerate?: () => void;
  onSubtitleTemplateChange?: (template: SubtitleTemplate) => void;
  subtitleTemplate?: SubtitleTemplate;
  songTitle?: string | null;
}) {
  const { locale, t } = useI18n();
  const dict = t("controlPanel").style;

  // Sync localPrompt when stylePrompt prop changes (e.g. after AI analysis)
  useEffect(() => {
    if (stylePrompt) {
      onLocalPromptChange(stylePrompt);
    }
  }, [stylePrompt]);

  // Store subtitleTemplate in a local variable (workaround for Turbopack closure tracking)
  // eslint-disable-next-line prefer-const
  const _subtitleTemplate = (arguments as unknown as [Record<string, unknown>])[0]?.subtitleTemplate as SubtitleTemplate | undefined;

  // Pre-compute 8 preset active states outside JSX to avoid closure issues
  const subtitlePresets = [
    { key: "opalite-flash",  name: "Opalite 蓝白闪光", desc: "白蓝交替·跳动·TikTok热舞", color: "#4FC3F7", template: OPHELIA_TEMPLATE, style: OPHELIA_STYLE },
    { key: "douyin-kapai",   name: "抖音卡点风",   desc: "Kinetic·鼓点·厚描边",     color: "#FFD700", template: PRESET_TEMPLATES["douyin-kapai"],   style: PRESET_STYLES["douyin-kapai"] },
    { key: "lyrical-ballad", name: "抒情民谣风",   desc: "Georgia衬线·淡入·温暖",   color: "#FFB6C1", template: PRESET_TEMPLATES["lyrical-ballad"], style: PRESET_STYLES["lyrical-ballad"] },
    { key: "neon-cyberpunk", name: "霓虹赛博朋克", desc: "荧光·弧形·发光·交替",      color: "#00E5FF", template: PRESET_TEMPLATES["neon-cyberpunk"], style: PRESET_STYLES["neon-cyberpunk"] },
    { key: "japanese-fresh", name: "日系清新风",   desc: "手写体·长短自适应·弹跳",   color: "#FFB7C5", template: PRESET_TEMPLATES["japanese-fresh"], style: PRESET_STYLES["japanese-fresh"] },
    { key: "hiphop-street",  name: "嘻哈街头风",   desc: "超粗体·随机跳·6px描边",    color: "#FF6600", template: PRESET_TEMPLATES["hiphop-street"],  style: PRESET_STYLES["hiphop-street"] },
    { key: "minimal-business", name: "简约商务风", desc: "Inter·淡入·下弧·克制",     color: "#A0C4FF", template: PRESET_TEMPLATES["minimal-business"], style: PRESET_STYLES["minimal-business"] },
    { key: "romantic-lovesong", name: "浪漫情歌风", desc: "衬线·渐变·波浪·粉色",     color: "#FF69B4", template: PRESET_TEMPLATES["romantic-lovesong"], style: PRESET_STYLES["romantic-lovesong"] },
    { key: "dynamic-highlight", name: "动态多词高亮", desc: "逐词闪烁·回弹·长短自适应", color: "#00E5FF", template: PRESET_TEMPLATES["dynamic-highlight"], style: PRESET_STYLES["dynamic-highlight"] },
  ] as const;

  return (
    <div className="space-y-5">
      {/* Analysis trigger */}
      {!analysis ? (
        <div className="text-center py-6">
          <Sparkles className="w-10 h-10 mx-auto text-sky-400 mb-3" />
          <p className="text-sm text-gray-500 mb-3">
            {dict.noAnalysis}
          </p>
          <button
            onClick={onAnalyze}
            disabled={isAnalyzing || lyrics.length === 0}
            className="px-4 py-2 bg-gradient-to-r from-sky-500 to-blue-600 text-white rounded-lg text-sm font-medium hover:from-sky-400 hover:to-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isAnalyzing ? (
              <span className="flex items-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin" />
                {dict.analyzing}
              </span>
            ) : (
              dict.analyzeBtn
            )}
          </button>
        </div>
      ) : (
        <>
          {/* Emotion tags */}
          <div>
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              {dict.emotions}
            </label>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {analysis.emotions.map((e) => (
                <span
                  key={e.label}
                  className="px-2.5 py-1 bg-sky-50 text-sky-600 rounded-full text-xs font-medium"
                  style={{ opacity: 0.5 + e.intensity * 0.5 }}
                >
                  {tEmotion(e.label, locale)} {Math.round(e.intensity * 100)}%
                </span>
              ))}
            </div>
          </div>

          {/* Theme */}
          <div>
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              {dict.theme}
            </label>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {analysis.theme.map((tStr) => (
                <span
                  key={tStr}
                  className="px-2.5 py-1 bg-blue-50 text-blue-600 rounded-full text-xs font-medium"
                >
                  {tEmotion(tStr, locale)}
                </span>
              ))}
            </div>
          </div>

          {/* Tempo */}
          <div className="flex items-center gap-2 text-sm">
            <span className="text-xs font-semibold text-gray-400 uppercase">
              {dict.tempo}:
            </span>
            <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded text-xs font-medium">
              {tEmotion(analysis.tempo, locale)}
            </span>
          </div>

          {/* Song identified by AI */}
          {songTitle && (
            <div className="p-3 bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl border border-amber-200">
              <div className="flex items-center gap-2">
                <Music className="w-4 h-4 text-amber-500" />
                <span className="text-xs font-semibold text-amber-700">
                  DeepSeek 识别到歌曲
                </span>
              </div>
              <p className="text-sm font-bold text-amber-800 mt-1">
                🎵 {songTitle}
              </p>
              <p className="text-[10px] text-amber-500 mt-0.5">
                AI 已根据原曲歌词校验语音识别，并基于歌曲背景分析情感与风格
              </p>
            </div>
          )}

          {/* Style Prompt */}
          <div>
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              {dict.stylePrompt}
            </label>
            <textarea
              value={localPrompt}
              onChange={(e) => onLocalPromptChange(e.target.value)}
              rows={3}
              className="w-full mt-2 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-sky-400 focus:border-transparent resize-none"
              placeholder={dict.stylePromptPlaceholder}
            />
            <div className="flex gap-2 mt-2">
              <button
                onClick={onStylePromptApply}
                className="px-3 py-1.5 bg-gradient-to-r from-sky-500 to-blue-600 text-white rounded-lg text-xs font-medium hover:from-sky-400 hover:to-blue-500 transition-colors"
              >
                {dict.applyStyle}
              </button>
              <button
                onClick={onAnalyze}
                className="px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg text-xs font-medium hover:bg-gray-200 transition-colors flex items-center gap-1"
              >
                <RefreshCw className="w-3 h-3" />
                {dict.regenerate}
              </button>
            </div>
          </div>

          {/* Template Description (字幕模板) — AI 自然语言生成 */}
          {onTemplateDescriptionChange && onTemplateGenerate && (
            <div>
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                🤖 AI 字幕模板生成
              </label>
              <p className="text-[10px] text-gray-400 mt-0.5 mb-1">
                用自然语言描述你想要的字幕效果（弧度、位置、动画等）
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={templateDescription}
                  onChange={(e) => onTemplateDescriptionChange(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && onTemplateGenerate()}
                  placeholder="例: 左上角弧形字幕，金色发光，弹跳动画"
                  className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-sky-400 focus:border-transparent"
                />
                <button
                  onClick={onTemplateGenerate}
                  disabled={!templateDescription.trim()}
                  className="px-3 py-2 bg-gradient-to-r from-sky-500 to-blue-600 text-white rounded-lg text-xs font-medium hover:opacity-90 disabled:opacity-50 transition-all whitespace-nowrap"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* 动效字幕风格 — 8 种内置预设 */}
          <div>
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              🎨 动效字幕风格
            </label>
            <div className="grid grid-cols-2 gap-2 mt-2">
              {subtitlePresets.map((preset) => {
                const isActive = _subtitleTemplate?.name === preset.template?.name;
                return (
                <button
                  key={preset.key}
                  onClick={() => {
                    if (onSubtitleTemplateChange) {
                      onSubtitleTemplateChange(preset.template);
                    }
                    if (onStyleParamsChange) {
                      onStyleParamsChange(preset.style);
                    }
                  }}
                  className={cn(
                    "p-2.5 border rounded-lg hover:border-sky-300 hover:bg-sky-50 transition-colors text-left group",
                    isActive
                      ? "border-sky-500 bg-sky-50 ring-1 ring-sky-200"
                      : "border-gray-200"
                  )}
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <div
                      className="w-5 h-5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: preset.color }}
                    />
                    <span className={cn(
                      "text-xs font-semibold group-hover:text-sky-600",
                      isActive ? "text-sky-700" : "text-gray-600"
                    )}>
                      {preset.name}
                    </span>
                    {isActive && (
                      <span className="text-[9px] bg-sky-500 text-white px-1.5 py-0.5 rounded-full font-medium">
                        当前
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-gray-400">{preset.desc}</p>
                </button>
                );
              })}
            </div>
          </div>

          {/* Quick style templates */}
          <div>
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              {dict.quickTemplates}
            </label>
            <div className="grid grid-cols-3 gap-2 mt-2">
              {Object.entries(STYLE_TEMPLATES).map(([key, params]) => (
                <button
                  key={key}
                  onClick={() => onStyleParamsChange(params)}
                  className="p-2 text-xs border border-gray-200 rounded-lg hover:border-sky-300 hover:bg-sky-50 transition-colors text-left"
                >
                  <div
                    className="w-full h-6 rounded mb-1"
                    style={{ backgroundColor: params.accentColor }}
                  />
                  <span className="font-medium capitalize text-gray-600">
                    {key.replace("-", " ")}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Alternative styles (demo-specific) */}
          {alternativeStyles && onApplyAlternativeStyle && (
            <div>
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                {dict.styleVariations}
              </label>
              <div className="grid grid-cols-3 gap-2 mt-2">
                {Object.keys(alternativeStyles).map((key) => (
                  <button
                    key={key}
                    onClick={() => onApplyAlternativeStyle(key)}
                    className="p-2 text-xs border border-gray-200 rounded-lg hover:border-sky-300 hover:bg-sky-50 transition-colors text-left"
                  >
                    <div
                      className="w-full h-6 rounded mb-1"
                      style={{
                        backgroundColor: alternativeStyles[key].accentColor,
                      }}
                    />
                    <span className="font-medium capitalize text-gray-600">
                      {key.replace("-", " ")}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ============================================================
// Filter Tab
// ============================================================

const FilterTab = memo(function FilterTab({
  filter,
  onFilterChange,
}: {
  filter: FilterType;
  onFilterChange: (f: FilterType) => void;
}) {
  const { t } = useI18n();
  const dict = t("controlPanel").filter;
  const labels = dict.labels;

  const filters = Object.entries(FILTER_LABELS) as [FilterType, string][];

  return (
    <div className="space-y-3">
      <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
        {dict.videoFilter}
      </label>
      <div className="grid grid-cols-4 gap-2">
        {filters.map(([key]) => (
          <button
            key={key}
            onClick={() => onFilterChange(key)}
            className={cn(
              "p-2 rounded-lg text-xs font-medium transition-all",
              filter === key
                ? "bg-gradient-to-r from-sky-500 to-blue-600 text-white shadow-md"
                : "bg-gray-100 text-gray-500 hover:bg-gray-200"
            )}
          >
            {(labels as Record<string, string>)[key]}
          </button>
        ))}
      </div>

      {/* Filter preview strip */}
      <div className="mt-3">
        <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
          {dict.preview}
        </label>
        <div className="mt-1 h-16 rounded-lg overflow-hidden relative">
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(135deg, #0ea5e9 0%, #3b82f6 100%)",
              filter: FILTER_PRESETS[filter],
            }}
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-white text-sm font-medium drop-shadow-lg">
              {(labels as Record<string, string>)[filter]}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
});

const AudioTab = memo(function AudioTab({
  speed,
  pitch,
  onSpeedChange,
  onPitchChange,
}: {
  speed: number;
  pitch: number;
  onSpeedChange: (s: number) => void;
  onPitchChange: (p: number) => void;
}) {
  const { t } = useI18n();
  const dict = t("controlPanel").audio;

  return (
    <div className="space-y-6">
      {/* Speed control */}
      <div>
        <div className="flex justify-between items-center mb-2">
          <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
            {dict.speed}
          </label>
          <span className="text-sm font-mono font-bold text-sky-600">
            {speed.toFixed(1)}x
          </span>
        </div>
        <input
          type="range"
          min="0.5"
          max="2"
          step="0.1"
          value={speed}
          onChange={(e) => onSpeedChange(parseFloat(e.target.value))}
          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-sky-500"
        />
        <div className="relative text-xs text-gray-400 mt-1 h-5">
          <span className="absolute left-0">0.5x</span>
          <span
            className="absolute text-sky-500 font-medium cursor-pointer hover:underline"
            style={{ left: `${((1 - 0.5) / (2 - 0.5)) * 100}%`, transform: "translateX(-50%)" }}
            onClick={() => onSpeedChange(1)}
          >
            1x ({dict.normal})
          </span>
          <span className="absolute right-0">2x</span>
        </div>
      </div>

      {/* Pitch control */}
      <div>
        <div className="flex justify-between items-center mb-2">
          <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
            {dict.pitch}
          </label>
          <span className="text-sm font-mono font-bold text-sky-600">
            {pitch > 0 ? `+${pitch}` : pitch} {dict.semitones}
          </span>
        </div>
        <input
          type="range"
          min="-12"
          max="12"
          step="1"
          value={pitch}
          onChange={(e) => onPitchChange(parseInt(e.target.value))}
          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-sky-500"
        />
        <div className="flex justify-between text-xs text-gray-400 mt-1">
          <span>-12</span>
          <span
            className="text-sky-500 font-medium cursor-pointer hover:underline"
            onClick={() => onPitchChange(0)}
          >
            0 ({dict.original})
          </span>
          <span>+12</span>
        </div>
      </div>

      <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
        <p className="text-xs text-amber-700">
          {dict.tip}
        </p>
      </div>
    </div>
  );
});

// ============================================================
// Advanced Tab
// ============================================================

const AdvancedTab = memo(function AdvancedTab({
  styleParams,
  onStyleParamsChange,
}: {
  styleParams: StyleParams;
  onStyleParamsChange: (p: StyleParams) => void;
}) {
  const { t } = useI18n();
  const dict = t("controlPanel").advanced;

  const update = (partial: Partial<StyleParams>) => {
    onStyleParamsChange({ ...styleParams, ...partial });
  };

  return (
    <div className="space-y-5">
      {/* Font size */}
      <div>
        <div className="flex justify-between items-center mb-2">
          <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
            {dict.fontSize}
          </label>
          <span className="text-sm font-mono font-bold text-sky-600">
            {styleParams.fontSize}px
          </span>
        </div>
        <input
          type="range"
          min="24"
          max="72"
          step="2"
          value={styleParams.fontSize}
          onChange={(e) => update({ fontSize: parseInt(e.target.value) })}
          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-sky-500"
        />
      </div>

      {/* Font weight */}
      <div>
        <div className="flex justify-between items-center mb-2">
          <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
            {dict.fontWeight}
          </label>
          <span className="text-sm font-mono font-bold text-sky-600">
            {styleParams.fontWeight}
          </span>
        </div>
        <input
          type="range"
          min="300"
          max="800"
          step="100"
          value={styleParams.fontWeight}
          onChange={(e) => update({ fontWeight: parseInt(e.target.value) })}
          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-sky-500"
        />
      </div>

      {/* Animation */}
      <div>
        <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
          {dict.animation}
        </label>
        <div className="grid grid-cols-3 gap-2 mt-2">
          {(Object.entries(ANIMATION_LABELS) as [AnimationType, string][]).map(
            ([key]) => (
              <button
                key={key}
                onClick={() => update({ animation: key })}
                className={cn(
                  "px-2 py-1.5 rounded-lg text-xs font-medium transition-all",
                  styleParams.animation === key
                    ? "bg-gradient-to-r from-sky-500 to-blue-600 text-white"
                    : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                )}
              >
                {(dict.animationLabels as Record<string, string>)[key]}
              </button>
            )
          )}
        </div>
      </div>

      {/* Word Pop toggle — 逐词弹跳动画 */}
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
          逐词弹跳
        </label>
        <button
          onClick={() => update({ wordPop: !styleParams.wordPop })}
          className={cn(
            "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
            styleParams.wordPop ? "bg-sky-500" : "bg-gray-300"
          )}
        >
          <span
            className={cn(
              "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
              styleParams.wordPop ? "translate-x-6" : "translate-x-1"
            )}
          />
        </button>
      </div>

      {/* Text shadow toggle */}
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
          {dict.textShadow}
        </label>
        <button
          onClick={() => update({ textShadow: !styleParams.textShadow })}
          className={cn(
            "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
            styleParams.textShadow ? "bg-sky-500" : "bg-gray-300"
          )}
        >
          <span
            className={cn(
              "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
              styleParams.textShadow ? "translate-x-6" : "translate-x-1"
            )}
          />
        </button>
      </div>

      {/* Color pickers */}
      <div>
        <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
          {dict.colors}
        </label>
        <div className="grid grid-cols-3 gap-3 mt-2">
          {(["primaryColor", "secondaryColor", "accentColor"] as const).map(
            (key) => (
              <div key={key} className="text-center">
                <input
                  type="color"
                  value={styleParams[key]}
                  onChange={(e) => update({ [key]: e.target.value })}
                  className="w-full h-10 rounded-lg cursor-pointer border border-gray-200"
                />
                <span className="text-[10px] text-gray-400 mt-1 block capitalize">
                  {key.replace("Color", "")}
                </span>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
});

// ============================================================
// Scene Tab — AI 动画循环底片
// ============================================================

const SCENE_TAB_ITEMS = Object.entries(SCENE_PRESETS).map(([key, scene]) => ({
  key,
  name: scene.name,
  description: scene.description,
  scene,
}));

function SceneTab({
  backgroundScene,
  description,
  onDescriptionChange,
  onGenerate,
  onSceneChange,
  isGenerating,
  backgroundImageFile,
  onBackgroundImageFileChange,
}: {
  backgroundScene?: SceneAnimSpec | null;
  description: string;
  onDescriptionChange?: (desc: string) => void;
  onGenerate?: () => void;
  onSceneChange?: (scene: SceneAnimSpec | null) => void;
  isGenerating: boolean;
  backgroundImageFile?: FileInfo | null;
  onBackgroundImageFileChange?: (file: FileInfo | null) => void;
}) {
  const currentSceneKey = backgroundScene
    ? Object.entries(SCENE_PRESETS).find(([, s]) => s.name === backgroundScene.name)?.[0]
    : null;

  return (
    <div className="space-y-4">
      {/* 标题 */}
      <div className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-purple-500" />
        AI 动画循环底片
      </div>

      <p className="text-xs text-gray-500">
        用自然语言描述你想要的背景动画效果，AI 会将其生成为循环播放的粒子动画底片。留空则使用上传的视频作为背景。
      </p>

      {/* 自然语言输入 */}
      <div className="space-y-2">
        <label className="text-xs font-medium text-gray-500">描述想要的背景</label>
        <div className="flex gap-2">
          <input
            type="text"
            value={description}
            onChange={(e) => onDescriptionChange?.(e.target.value)}
            placeholder="例如：粉色泡泡在海底飘的梦幻背景"
            className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !isGenerating) onGenerate?.();
            }}
          />
          <button
            onClick={onGenerate}
            disabled={!description.trim() || isGenerating}
            className="px-3 py-2 bg-purple-500 text-white rounded-lg text-sm font-medium hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5 shrink-0"
          >
            {isGenerating ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Sparkles className="w-3.5 h-3.5" />
            )}
            生成
          </button>
        </div>
      </div>

      {/* 当前场景 */}
      {backgroundScene && (
        <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-sm font-semibold text-purple-700">{backgroundScene.name}</span>
              <p className="text-xs text-purple-500 mt-0.5">{backgroundScene.description}</p>
            </div>
            <button
              onClick={() => onSceneChange?.(null)}
              className="text-xs text-purple-400 hover:text-purple-600 transition-colors"
            >
              ✕ 清除
            </button>
          </div>
          {backgroundScene.particles && (
            <div className="mt-2 flex flex-wrap gap-1">
              <span className="text-[10px] bg-purple-100 text-purple-600 px-1.5 py-0.5 rounded">
                {backgroundScene.particles.count} 粒子
              </span>
              <span className="text-[10px] bg-purple-100 text-purple-600 px-1.5 py-0.5 rounded">
                {backgroundScene.particles.motion}
              </span>
              <span className="text-[10px] bg-purple-100 text-purple-600 px-1.5 py-0.5 rounded">
                {backgroundScene.particles.shape}
              </span>
              {backgroundScene.particles.glow && (
                <span className="text-[10px] bg-purple-100 text-purple-600 px-1.5 py-0.5 rounded">发光</span>
              )}
            </div>
          )}
        </div>
      )}

      {/* 预设场景快捷选择 */}
      <div>
        <label className="text-xs font-medium text-gray-500 mb-2 block">
          或选择预设场景
        </label>
        <div className="grid grid-cols-2 gap-1.5 max-h-[240px] overflow-y-auto">
          {SCENE_TAB_ITEMS.map(({ key, name, description: desc, scene }) => {
            const isActive = key === currentSceneKey;
            return (
              <button
                key={key}
                onClick={() => onSceneChange?.(scene)}
                className={cn(
                  "text-left p-2 rounded-lg border transition-all",
                  isActive
                    ? "border-purple-400 bg-purple-50 ring-1 ring-purple-300"
                    : "border-gray-100 bg-gray-50 hover:border-gray-200 hover:bg-gray-100"
                )}
              >
                <div className="text-xs font-semibold text-gray-700">{name}</div>
                <div className="text-[10px] text-gray-400 line-clamp-1 mt-0.5">{desc}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 分隔线 */}
      <div className="flex items-center gap-2">
        <div className="flex-1 h-px bg-gray-200" />
        <span className="text-[10px] text-gray-400">或</span>
        <div className="flex-1 h-px bg-gray-200" />
      </div>

      {/* 图片背景上传 */}
      <div className="space-y-2">
        <label className="text-xs font-medium text-gray-500 flex items-center gap-1.5">
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
            <circle cx="8.5" cy="8.5" r="1.5"/>
            <polyline points="21,15 16,10 5,21"/>
          </svg>
          图片背景（Ken Burns + 飘动动效）
        </label>
        <p className="text-[10px] text-gray-400">
          上传静态图片，Remotion 会自动添加缩放、飘动、光效等电影级动效
        </p>

        {!backgroundImageFile ? (
          <label className="relative border-2 border-dashed rounded-lg p-4 text-center transition-all cursor-pointer block border-amber-300/60 hover:border-amber-400 hover:bg-amber-50/50">
            <svg className="w-6 h-6 mx-auto text-amber-400 mb-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
              <circle cx="8.5" cy="8.5" r="1.5"/>
              <polyline points="21,15 16,10 5,21"/>
            </svg>
            <p className="text-gray-500 text-xs font-medium">拖入图片或点击上传</p>
            <p className="text-gray-400 text-[10px]">PNG, JPG, WebP</p>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const formData = new FormData();
                formData.append("image", file);
                try {
                  const res = await fetch("/api/upload", { method: "POST", body: formData });
                  let url = URL.createObjectURL(file);
                  if (res.ok) {
                    const d = await res.json();
                    url = d.image?.url || d.url || url;
                  }
                  onBackgroundImageFileChange?.({
                    id: `bg-img-${Date.now()}`,
                    name: file.name,
                    size: file.size,
                    type: file.type,
                    url,
                  });
                } catch {
                  onBackgroundImageFileChange?.({
                    id: `bg-img-${Date.now()}`,
                    name: file.name,
                    size: file.size,
                    type: file.type,
                    url: URL.createObjectURL(file),
                  });
                }
              }}
            />
          </label>
        ) : (
          <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            <svg className="w-4 h-4 text-amber-500 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
              <circle cx="8.5" cy="8.5" r="1.5"/>
              <polyline points="21,15 16,10 5,21"/>
            </svg>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-gray-700 truncate">{backgroundImageFile.name}</p>
              <p className="text-[10px] text-amber-600">Ken Burns 缩放 + 飘动动效</p>
            </div>
            <button
              onClick={() => onBackgroundImageFileChange?.(null)}
              className="text-gray-400 hover:text-red-500 transition-colors shrink-0"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
