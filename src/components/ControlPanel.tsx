"use client";

import { useState, memo } from "react";
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
  DecorationType,
  LyricLine,
} from "@/lib/types";
import {
  FILTER_LABELS,
  FILTER_PRESETS,
  STYLE_TEMPLATES,
  ANIMATION_LABELS,
  DECORATION_LABELS,
} from "@/lib/types";
import { OPHELIA_STYLE, OPHELIA_TEMPLATE } from "@/lib/demo-data";
import type { SubtitleTemplate } from "@/lib/types";

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
}

type Tab = "style" | "filter" | "audio" | "advanced";

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
}) {
  const { locale, t } = useI18n();
  const dict = t("controlPanel").style;

  // Store subtitleTemplate in a local variable (workaround for Turbopack closure tracking)
  // eslint-disable-next-line prefer-const
  const _subtitleTemplate = (arguments as unknown as [Record<string, unknown>])[0]?.subtitleTemplate as SubtitleTemplate | undefined;

  // Pre-compute preset active states outside JSX to avoid closure issues
  const subtitlePresets = [
    { name: "Opalite 热舞", desc: "Impact粗体·弹跳·高亮", color: "#00E5FF", template: OPHELIA_TEMPLATE, style: OPHELIA_STYLE, hint: undefined as string | undefined, isTemplate: true },
    { name: "居中弹跳", desc: "蓝白交替·跳动", color: "#4FC3F7", template: undefined as SubtitleTemplate | undefined, style: undefined as StyleParams | undefined, hint: "蓝白弹跳 左右交替 发光", isTemplate: false },
    { name: "弧形优雅", desc: "金色弯曲·衬线", color: "#FFD700", template: undefined as SubtitleTemplate | undefined, style: undefined as StyleParams | undefined, hint: "居中弧形 金色 优雅衬线体", isTemplate: false },
    { name: "玻璃Vlog", desc: "左下毛玻璃·手写", color: "#69F0AE", template: undefined as SubtitleTemplate | undefined, style: undefined as StyleParams | undefined, hint: "底部玻璃背景 手写体 滑入", isTemplate: false },
    { name: "霓虹跳动", desc: "顶部波浪·描边", color: "#FF6B6B", template: undefined as SubtitleTemplate | undefined, style: undefined as StyleParams | undefined, hint: "顶部波浪 霓虹描边 跳动", isTemplate: false },
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
                  {tStr}
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

          {/* Template Description (字幕模板) */}
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
              {/* 快捷提示词 */}
              <div className="flex flex-wrap gap-1.5 mt-2">
                {[
                  "蓝白弹跳 左右交替 发光",
                  "居中弧形 金色 优雅衬线体",
                  "底部玻璃背景 手写体 滑入",
                  "顶部波浪 霓虹描边 跳动",
                ].map((hint) => (
                  <button
                    key={hint}
                    onClick={() => {
                      onTemplateDescriptionChange(hint);
                      // Use requestAnimationFrame instead of setTimeout for deterministic ordering
                      requestAnimationFrame(() => onTemplateGenerate());
                    }}
                    className="px-2 py-1 text-[10px] bg-gray-100 hover:bg-sky-100 text-gray-500 hover:text-sky-600 rounded-md transition-colors"
                  >
                    {hint}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Quick subtitle template presets */}
          <div>
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              🎨 字幕模板预设
            </label>
            <div className="grid grid-cols-2 gap-2 mt-2">
              {subtitlePresets.map((preset) => {
                // Determine if this preset is currently active
                const isActive = preset.isTemplate
                  ? _subtitleTemplate?.name === preset.template?.name
                  : false;
                return (
                <button
                  key={preset.name}
                  onClick={() => {
                    if (preset.template) {
                      onSubtitleTemplateChange?.(preset.template);
                      if (preset.style) {
                        onStyleParamsChange(preset.style);
                      }
                    } else if (preset.hint) {
                      onTemplateDescriptionChange?.(preset.hint);
                      requestAnimationFrame(() => onTemplateGenerate?.());
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

      {/* Decoration */}
      <div>
        <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
          {dict.decoration}
        </label>
        <div className="grid grid-cols-3 gap-2 mt-2">
          {(
            Object.entries(DECORATION_LABELS) as [DecorationType, string][]
          ).map(([key]) => (
            <button
              key={key}
              onClick={() => {
                const current = styleParams.decoration;
                const updated = current.includes(key)
                  ? current.filter((d) => d !== key)
                  : [...current.filter((d) => d !== "none"), key].filter(
                      (d) => d !== "none" || key === "none"
                    );
                update({
                  decoration:
                    updated.length === 0 || key === "none"
                      ? ["none"]
                      : updated,
                });
              }}
              className={cn(
                "px-2 py-1.5 rounded-lg text-xs font-medium transition-all",
                styleParams.decoration.includes(key)
                  ? "bg-gradient-to-r from-sky-500 to-blue-600 text-white"
                  : "bg-gray-100 text-gray-500 hover:bg-gray-200"
              )}
            >
              {(dict.decorationLabels as Record<string, string>)[key]}
            </button>
          ))}
        </div>
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
