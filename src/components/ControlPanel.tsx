"use client";

import { useState } from "react";
import {
  Palette,
  Sparkles,
  Type,
  Music,
  Sliders,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
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
}: ControlPanelProps) {
  const [activeTab, setActiveTab] = useState<Tab>("style");
  const [localPrompt, setLocalPrompt] = useState(stylePrompt);

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "style", label: "Style", icon: <Sparkles className="w-4 h-4" /> },
    { id: "filter", label: "Filter", icon: <Palette className="w-4 h-4" /> },
    { id: "audio", label: "Audio", icon: <Music className="w-4 h-4" /> },
    { id: "advanced", label: "Advanced", icon: <Sliders className="w-4 h-4" /> },
  ];

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200 h-full flex flex-col">
      {/* Tab bar */}
      <div className="flex border-b border-gray-200 px-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex items-center gap-1.5 px-4 py-3 text-sm font-medium transition-colors border-b-2 -mb-px",
              activeTab === tab.id
                ? "border-purple-500 text-purple-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
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
}) {
  return (
    <div className="space-y-5">
      {/* Analysis trigger */}
      {!analysis ? (
        <div className="text-center py-6">
          <Sparkles className="w-10 h-10 mx-auto text-purple-400 mb-3" />
          <p className="text-sm text-gray-600 mb-3">
            Upload audio to analyze lyrics and generate style
          </p>
          <button
            onClick={onAnalyze}
            disabled={isAnalyzing || lyrics.length === 0}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isAnalyzing ? (
              <span className="flex items-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin" />
                Analyzing...
              </span>
            ) : (
              "✨ Analyze Lyrics"
            )}
          </button>
        </div>
      ) : (
        <>
          {/* Emotion tags */}
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Emotions
            </label>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {analysis.emotions.map((e) => (
                <span
                  key={e.label}
                  className="px-2.5 py-1 bg-purple-50 text-purple-700 rounded-full text-xs font-medium"
                  style={{ opacity: 0.5 + e.intensity * 0.5 }}
                >
                  {e.label} {Math.round(e.intensity * 100)}%
                </span>
              ))}
            </div>
          </div>

          {/* Theme */}
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Theme
            </label>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {analysis.theme.map((t) => (
                <span
                  key={t}
                  className="px-2.5 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-medium"
                >
                  {t}
                </span>
              ))}
            </div>
          </div>

          {/* Tempo */}
          <div className="flex items-center gap-2 text-sm">
            <span className="text-xs font-semibold text-gray-500 uppercase">
              Tempo:
            </span>
            <span className="px-2 py-0.5 bg-green-50 text-green-700 rounded text-xs font-medium">
              {analysis.tempo}
            </span>
          </div>

          {/* Style Prompt */}
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Style Prompt
            </label>
            <textarea
              value={localPrompt}
              onChange={(e) => onLocalPromptChange(e.target.value)}
              rows={3}
              className="w-full mt-2 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
              placeholder="Describe your subtitle style..."
            />
            <div className="flex gap-2 mt-2">
              <button
                onClick={onStylePromptApply}
                className="px-3 py-1.5 bg-purple-600 text-white rounded-lg text-xs font-medium hover:bg-purple-700 transition-colors"
              >
                Apply Style
              </button>
              <button
                onClick={onAnalyze}
                className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-xs font-medium hover:bg-gray-200 transition-colors flex items-center gap-1"
              >
                <RefreshCw className="w-3 h-3" />
                Regenerate
              </button>
            </div>
          </div>

          {/* Quick templates */}
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Quick Templates
            </label>
            <div className="grid grid-cols-3 gap-2 mt-2">
              {Object.entries(STYLE_TEMPLATES).map(([key, params]) => (
                <button
                  key={key}
                  onClick={() => onStyleParamsChange(params)}
                  className="p-2 text-xs border border-gray-200 rounded-lg hover:border-purple-400 hover:bg-purple-50 transition-colors text-left"
                >
                  <div
                    className="w-full h-6 rounded mb-1"
                    style={{ backgroundColor: params.accentColor }}
                  />
                  <span className="font-medium capitalize">
                    {key.replace("-", " ")}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Alternative styles (demo-specific) */}
          {alternativeStyles && onApplyAlternativeStyle && (
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Style Variations
              </label>
              <div className="grid grid-cols-3 gap-2 mt-2">
                {Object.keys(alternativeStyles).map((key) => (
                  <button
                    key={key}
                    onClick={() => onApplyAlternativeStyle(key)}
                    className="p-2 text-xs border border-gray-200 rounded-lg hover:border-pink-400 hover:bg-pink-50 transition-colors text-left"
                  >
                    <div
                      className="w-full h-6 rounded mb-1"
                      style={{
                        backgroundColor: alternativeStyles[key].accentColor,
                      }}
                    />
                    <span className="font-medium capitalize">
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

function FilterTab({
  filter,
  onFilterChange,
}: {
  filter: FilterType;
  onFilterChange: (f: FilterType) => void;
}) {
  const filters = Object.entries(FILTER_LABELS) as [FilterType, string][];

  return (
    <div className="space-y-3">
      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
        Video Filter
      </label>
      <div className="grid grid-cols-4 gap-2">
        {filters.map(([key, label]) => (
          <button
            key={key}
            onClick={() => onFilterChange(key)}
            className={cn(
              "p-2 rounded-lg text-xs font-medium transition-all",
              filter === key
                ? "bg-purple-600 text-white shadow-md"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Filter preview strip */}
      <div className="mt-3">
        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
          Preview
        </label>
        <div className="mt-1 h-16 rounded-lg overflow-hidden relative">
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
              filter: FILTER_PRESETS[filter],
            }}
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-white text-sm font-medium drop-shadow-lg">
              {FILTER_LABELS[filter]}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Audio Tab
// ============================================================

function AudioTab({
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
  return (
    <div className="space-y-6">
      {/* Speed control */}
      <div>
        <div className="flex justify-between items-center mb-2">
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Speed
          </label>
          <span className="text-sm font-mono font-bold text-purple-600">
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
          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
        />
        <div className="flex justify-between text-xs text-gray-400 mt-1">
          <span>0.5x</span>
          <span
            className="text-purple-500 font-medium cursor-pointer hover:underline"
            onClick={() => onSpeedChange(1)}
          >
            1x (normal)
          </span>
          <span>2x</span>
        </div>
      </div>

      {/* Pitch control */}
      <div>
        <div className="flex justify-between items-center mb-2">
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Pitch
          </label>
          <span className="text-sm font-mono font-bold text-purple-600">
            {pitch > 0 ? `+${pitch}` : pitch} semitones
          </span>
        </div>
        <input
          type="range"
          min="-12"
          max="12"
          step="1"
          value={pitch}
          onChange={(e) => onPitchChange(parseInt(e.target.value))}
          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
        />
        <div className="flex justify-between text-xs text-gray-400 mt-1">
          <span>-12</span>
          <span
            className="text-purple-500 font-medium cursor-pointer hover:underline"
            onClick={() => onPitchChange(0)}
          >
            0 (original)
          </span>
          <span>+12</span>
        </div>
      </div>

      <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
        <p className="text-xs text-amber-700">
          💡 Speed change uses time-stretch (preserves pitch). Pitch change
          preserves speed. Both sync with subtitle timing automatically.
        </p>
      </div>
    </div>
  );
}

// ============================================================
// Advanced Tab
// ============================================================

function AdvancedTab({
  styleParams,
  onStyleParamsChange,
}: {
  styleParams: StyleParams;
  onStyleParamsChange: (p: StyleParams) => void;
}) {
  const update = (partial: Partial<StyleParams>) => {
    onStyleParamsChange({ ...styleParams, ...partial });
  };

  return (
    <div className="space-y-5">
      {/* Font size */}
      <div>
        <div className="flex justify-between items-center mb-2">
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Font Size
          </label>
          <span className="text-sm font-mono font-bold text-purple-600">
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
          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
        />
      </div>

      {/* Font weight */}
      <div>
        <div className="flex justify-between items-center mb-2">
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Font Weight
          </label>
          <span className="text-sm font-mono font-bold text-purple-600">
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
          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
        />
      </div>

      {/* Animation */}
      <div>
        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
          Animation
        </label>
        <div className="grid grid-cols-3 gap-2 mt-2">
          {(Object.entries(ANIMATION_LABELS) as [AnimationType, string][]).map(
            ([key, label]) => (
              <button
                key={key}
                onClick={() => update({ animation: key })}
                className={cn(
                  "px-2 py-1.5 rounded-lg text-xs font-medium transition-all",
                  styleParams.animation === key
                    ? "bg-purple-600 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                )}
              >
                {label}
              </button>
            )
          )}
        </div>
      </div>

      {/* Decoration */}
      <div>
        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
          Decoration
        </label>
        <div className="grid grid-cols-3 gap-2 mt-2">
          {(
            Object.entries(DECORATION_LABELS) as [DecorationType, string][]
          ).map(([key, label]) => (
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
                  ? "bg-purple-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Text shadow toggle */}
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
          Text Shadow
        </label>
        <button
          onClick={() => update({ textShadow: !styleParams.textShadow })}
          className={cn(
            "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
            styleParams.textShadow ? "bg-purple-600" : "bg-gray-300"
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
        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
          Colors
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
                <span className="text-[10px] text-gray-500 mt-1 block capitalize">
                  {key.replace("Color", "")}
                </span>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}
