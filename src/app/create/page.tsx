"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Download,
  Loader2,
  Sparkles,
  Play,
  RefreshCw,
} from "lucide-react";
import { FileUpload } from "@/components/FileUpload";
import { VideoPreview } from "@/components/VideoPreview";
import { ControlPanel } from "@/components/ControlPanel";
import type {
  FileInfo,
  LyricLine,
  AnalysisResult,
  StyleParams,
  FilterType,
  AspectRatio,
} from "@/lib/types";
import { STYLE_TEMPLATES } from "@/lib/types";
import {
  OPHELIA_LYRICS,
  OPHELIA_ANALYSIS,
  OPHELIA_STYLE,
  ALTERNATIVE_STYLES,
} from "@/lib/demo-data";

export default function CreatePage() {
  const [videoFile, setVideoFile] = useState<FileInfo | null>(null);
  const [audioFile, setAudioFile] = useState<FileInfo | null>(null);
  const [lyrics, setLyrics] = useState<LyricLine[]>([]);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [stylePrompt, setStylePrompt] = useState("");
  const [styleParams, setStyleParams] = useState<StyleParams>(
    STYLE_TEMPLATES["minimal-modern"]
  );
  const [filter, setFilter] = useState<FilterType>("original");
  const [speed, setSpeed] = useState(1);
  const [pitch, setPitch] = useState(0);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>("16:9");
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportUrl, setExportUrl] = useState<string | null>(null);
  const [mode, setMode] = useState<"upload" | "demo">("upload");
  const [showIntro, setShowIntro] = useState(true);

  const hasMedia = audioFile !== null || mode === "demo";

  // Load demo data
  const loadDemo = useCallback(() => {
    setMode("demo");
    setVideoFile({
      id: "demo-video",
      name: "Taylor Swift - The Fate of Ophelia (MV)",
      size: 25235770,
      type: "video/mp4",
      url: "/demo_mv.mp4",
    });
    setAudioFile({
      id: "demo-audio",
      name: "Taylor Swift - The Fate of Ophelia",
      size: 5063232,
      type: "audio/mp3",
      url: "/demo_audio.mp3",
      duration: 238,
    });
    setLyrics(OPHELIA_LYRICS);
    setAnalysis(OPHELIA_ANALYSIS);
    setStylePrompt(OPHELIA_ANALYSIS.stylePrompt);
    setStyleParams(OPHELIA_STYLE);
    setShowIntro(false);
  }, []);

  // Analyze lyrics (for user-uploaded content)
  const handleAnalyze = useCallback(async () => {
    if (!audioFile && mode !== "demo") return;

    setIsAnalyzing(true);

    try {
      if (mode === "demo") {
        // Already have demo data, just re-apply
        setLyrics(OPHELIA_LYRICS);
        setAnalysis(OPHELIA_ANALYSIS);
        setStylePrompt(OPHELIA_ANALYSIS.stylePrompt);
        setStyleParams(OPHELIA_STYLE);
      } else {
        const response = await fetch("/api/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ lyrics: OPHELIA_LYRICS }),
        });

        if (response.ok) {
          const data = await response.json();
          setLyrics(OPHELIA_LYRICS);
          setAnalysis(data.analysis);
          setStylePrompt(data.stylePrompt);
          setStyleParams(data.styleParams);
        } else {
          // Fallback
          setLyrics(OPHELIA_LYRICS);
          setAnalysis(OPHELIA_ANALYSIS);
          setStylePrompt(OPHELIA_ANALYSIS.stylePrompt);
          setStyleParams(OPHELIA_STYLE);
        }
      }
    } catch (error) {
      // Fallback on error
      setLyrics(OPHELIA_LYRICS);
      setAnalysis(OPHELIA_ANALYSIS);
      setStylePrompt(OPHELIA_ANALYSIS.stylePrompt);
      setStyleParams(OPHELIA_STYLE);
    } finally {
      setIsAnalyzing(false);
    }
  }, [audioFile, mode]);

  // Apply style prompt changes
  const handleStylePromptApply = useCallback(async () => {
    if (!stylePrompt || !analysis) return;

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lyrics, stylePrompt }),
      });

      if (response.ok) {
        const data = await response.json();
        setStyleParams(data.styleParams);
      }
    } catch {
      // Silent fail — keep current style
    }
  }, [stylePrompt, analysis, lyrics]);

  // Apply alternative style
  const applyAlternativeStyle = useCallback((key: string) => {
    const style = ALTERNATIVE_STYLES[key];
    if (style) {
      setStyleParams(style);
      setStylePrompt(
        key === "gothic-drama"
          ? "Dark gothic serif typography with blood-red accents. Dramatic karaoke highlight animation. Ornate borders frame each line like a medieval manuscript."
          : key === "modern-pop"
          ? "Bold modern sans-serif in bright white with gold shimmer. Bouncy energetic animation. Playful emoji decorations between verses."
          : "Warm handwritten cursive on cream texture. Gentle slide-up animation. Scattered emoji and highlight decorations — intimate diary feel."
      );
    }
  }, []);

  // Export video
  const handleExport = useCallback(async () => {
    if (!hasMedia) return;
    setIsExporting(true);

    try {
      const response = await fetch("/api/render", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          videoUrl: videoFile?.url,
          audioUrl: audioFile?.url,
          lyrics,
          styleParams,
          filter,
          speed,
          pitch,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setExportUrl(data.downloadUrl);
      }
    } catch (error) {
      console.error("Export failed:", error);
    } finally {
      setIsExporting(false);
    }
  }, [hasMedia, videoFile, audioFile, lyrics, styleParams, filter, speed, pitch]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top nav */}
      <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between z-20 relative">
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="flex items-center gap-1.5 text-gray-500 hover:text-gray-700 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm hidden sm:inline">Back</span>
          </Link>
          <h1 className="text-lg font-bold bg-gradient-to-r from-purple-600 to-pink-500 bg-clip-text text-transparent">
            LyricVibe
          </h1>
          {mode === "demo" && (
            <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded-full font-medium">
              Demo Mode
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {mode !== "demo" && (
            <button
              onClick={loadDemo}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-purple-600 hover:bg-purple-50 rounded-lg transition-colors font-medium"
            >
              <Sparkles className="w-4 h-4" />
              Try Demo
            </button>
          )}
          <button
            onClick={handleExport}
            disabled={!hasMedia || lyrics.length === 0 || isExporting}
            className="flex items-center gap-2 px-5 py-2 bg-purple-600 text-white rounded-lg text-sm font-semibold hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {isExporting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                Export
              </>
            )}
          </button>
        </div>
      </header>

      {/* Main workspace */}
      <div className="flex flex-col lg:flex-row gap-0 h-[calc(100vh-57px)]">
        {/* Preview area */}
        <div className="flex-1 p-4 md:p-6 flex flex-col items-center justify-center bg-gray-900 overflow-hidden">
          {!hasMedia && showIntro ? (
            /* Initial state: upload or demo */
            <div className="text-center max-w-lg">
              <div className="mb-8">
                <FileUpload
                  onVideoUploaded={setVideoFile}
                  onAudioUploaded={setAudioFile}
                  videoFile={videoFile}
                  audioFile={audioFile}
                />
              </div>

              <div className="flex items-center gap-4 mb-4">
                <div className="flex-1 h-px bg-gray-700" />
                <span className="text-gray-500 text-sm">or</span>
                <div className="flex-1 h-px bg-gray-700" />
              </div>

              <button
                onClick={loadDemo}
                className="px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-500 text-white rounded-xl text-lg font-bold hover:scale-105 transition-all shadow-2xl shadow-purple-600/20 flex items-center gap-3 mx-auto"
              >
                <Play className="w-5 h-5" />
                Try Demo — Taylor Swift
              </button>
              <p className="text-gray-500 text-xs mt-3">
                Pre-loaded: "The Fate of Ophelia" MV + AI style analysis
              </p>
            </div>
          ) : isAnalyzing ? (
            /* Analyzing state */
            <div className="text-center">
              <Loader2 className="w-12 h-12 text-purple-400 animate-spin mx-auto mb-4" />
              <p className="text-gray-300 text-lg font-medium">
                Analyzing your lyrics...
              </p>
              <p className="text-gray-500 text-sm mt-2">
                Detecting emotions, themes, and generating visual style
              </p>
            </div>
          ) : !analysis && hasMedia ? (
            /* Media loaded but not analyzed */
            <div className="text-center">
              <Sparkles className="w-12 h-12 text-purple-400 mx-auto mb-4" />
              <p className="text-gray-300 text-lg font-medium mb-4">
                {mode === "demo"
                  ? "Demo ready!"
                  : "Media loaded!"}
              </p>
              <button
                onClick={handleAnalyze}
                className="px-6 py-3 bg-purple-600 text-white rounded-xl text-base font-semibold hover:bg-purple-700 transition-all hover:scale-105 shadow-2xl shadow-purple-600/30"
              >
                ✨ Analyze Lyrics & Generate Style
              </button>
            </div>
          ) : (
            /* Full preview with subtitles */
            <VideoPreview
              videoUrl={videoFile?.url}
              audioUrl={audioFile!.url}
              lyrics={lyrics}
              styleParams={styleParams}
              filter={filter}
              speed={speed}
              pitch={pitch}
              aspectRatio={aspectRatio}
              currentTime={currentTime}
              onTimeUpdate={setCurrentTime}
              isPlaying={isPlaying}
              onPlayPause={() => setIsPlaying(!isPlaying)}
            />
          )}
        </div>

        {/* Control panel */}
        {hasMedia && (
          <div className="w-full lg:w-96 border-l border-gray-200 bg-white overflow-hidden flex-shrink-0">
            <ControlPanel
              analysis={analysis}
              styleParams={styleParams}
              stylePrompt={stylePrompt}
              filter={filter}
              speed={speed}
              pitch={pitch}
              lyrics={lyrics}
              onStylePromptChange={setStylePrompt}
              onStylePromptApply={handleStylePromptApply}
              onStyleParamsChange={setStyleParams}
              onFilterChange={setFilter}
              onSpeedChange={setSpeed}
              onPitchChange={setPitch}
              onAnalyze={handleAnalyze}
              isAnalyzing={isAnalyzing}
              alternativeStyles={ALTERNATIVE_STYLES}
              onApplyAlternativeStyle={applyAlternativeStyle}
            />
          </div>
        )}
      </div>

      {/* Export modal */}
      {exportUrl && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 max-w-md mx-4 text-center shadow-2xl">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
              <Download className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-xl font-bold mb-2">Video Ready!</h2>
            <p className="text-gray-600 text-sm mb-6">
              Your lyric subtitle video has been generated successfully.
            </p>
            <div className="flex gap-3 justify-center">
              <a
                href={exportUrl}
                download="lyricvibe-video.mp4"
                className="px-6 py-2.5 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 transition-colors"
              >
                Download MP4
              </a>
              <button
                onClick={() => setExportUrl(null)}
                className="px-6 py-2.5 bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
