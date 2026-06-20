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
  Mic,
  Bird,
} from "lucide-react";
import { FileUpload } from "@/components/FileUpload";
import { VideoPreview } from "@/components/VideoPreview";
import { ControlPanel } from "@/components/ControlPanel";
import { LangSwitch } from "@/components/LangSwitch";
import { SpeechRecorder } from "@/components/SpeechRecorder";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { logger } from "@/lib/logger";
import type {
  FileInfo,
  LyricLine,
  AnalysisResult,
  StyleParams,
  FilterType,
  AspectRatio,
  SubtitleTemplate,
} from "@/lib/types";
import { STYLE_TEMPLATES } from "@/lib/types";
import {
  OPHELIA_LYRICS,
  OPHELIA_ANALYSIS,
  OPHELIA_STYLE,
  OPHELIA_TEMPLATE,
  ALTERNATIVE_STYLES,
} from "@/lib/demo-data";

export default function CreatePage() {
  const { t } = useI18n();
  const dict = t("create");

  const [videoFile, setVideoFile] = useState<FileInfo | null>(null);
  const [audioFile, setAudioFile] = useState<FileInfo | null>(null);
  const [lyrics, setLyrics] = useState<LyricLine[]>([]);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [stylePrompt, setStylePrompt] = useState("");
  const [styleParams, setStyleParams] = useState<StyleParams>(
    STYLE_TEMPLATES["kinetic-pop"]
  );
  const [filter, setFilter] = useState<FilterType>("original");
  const [speed, setSpeed] = useState(1);
  const [pitch, setPitch] = useState(0);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>("16:9");
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportUrl, setExportUrl] = useState<string | null>(null);
  const [exportVideoUrl, setExportVideoUrl] = useState<string | null>(null);
  const [mode, setMode] = useState<"upload" | "demo">("upload");
  const [showIntro, setShowIntro] = useState(true);
  const [subtitleTemplate, setSubtitleTemplate] = useState<SubtitleTemplate | undefined>(undefined);
  const [templateDescription, setTemplateDescription] = useState("");

  const [showSpeechRecorder, setShowSpeechRecorder] = useState(false);
  const [userLyricsReady, setUserLyricsReady] = useState(false);
  const [userLyricsText, setUserLyricsText] = useState("");

  // 视频为必需，音频为可选；不上传音频时默认使用视频中的音轨
  const hasMedia = videoFile !== null || mode === "demo";
  // 实际使用的音频 URL：优先独立音频文件，否则回退到视频文件
  const effectiveAudioUrl = audioFile?.url || videoFile?.url || "";

  const loadDemo = useCallback(() => {
    setMode("demo");
    setVideoFile({
      id: "demo-video",
      name: "opalite-tiktok热舞 (test_whisperx.mp4)",
      size: 11272054,
      type: "video/mp4",
      url: "/demo_mv.mp4",
    });
    setAudioFile({
      id: "demo-audio",
      name: "OPALITE 热舞背景音乐",
      size: 800251,
      type: "audio/mp3",
      url: "/demo_audio.mp3",
      duration: 32.74,
    });
    setLyrics(OPHELIA_LYRICS);
    setAnalysis(OPHELIA_ANALYSIS);
    setStylePrompt(OPHELIA_ANALYSIS.stylePrompt);
    setStyleParams(OPHELIA_STYLE);
    setSubtitleTemplate(OPHELIA_TEMPLATE);
    setShowIntro(false);
  }, []);

  const handleTranscribe = useCallback(async () => {
    if (!effectiveAudioUrl) return;

    setIsTranscribing(true);

    try {
      const response = await fetch("/api/transcribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          audioUrl: effectiveAudioUrl,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.lyrics && data.lyrics.length > 0) {
          setLyrics(data.lyrics);
          setUserLyricsReady(true);
          setUserLyricsText(data.lyrics.map((l: LyricLine) => l.text).join("\n"));
          logger.info("Transcribe", `Extracted ${data.lyrics.length} lines via WhisperX`);
        }
      } else {
        const err = await response.json().catch(() => ({}));
        logger.error("Transcribe", "Failed:", err);
        alert(`歌词转录失败: ${err.details || err.error || "未知错误"}`);
      }
    } catch (error) {
      logger.error("Transcribe", "Error:", error);
      alert("歌词转录失败，请确认 python3 + demucs + faster-whisper 已安装");
    } finally {
      setIsTranscribing(false);
    }
  }, [effectiveAudioUrl]);

  const handleTemplateGenerate = useCallback(async () => {
    if (!templateDescription.trim()) return;

    try {
      const response = await fetch("/api/template", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: templateDescription,
          currentStyle: styleParams,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.template) {
          setSubtitleTemplate(data.template);
          setStyleParams(prev => ({
            ...prev,
            fontFamily: data.template.render.fontFamily,
            fontSize: data.template.render.fontSize,
            primaryColor: data.template.render.primaryColor,
            secondaryColor: data.template.render.secondaryColor,
            accentColor: data.template.render.accentColor,
            animation: data.template.animation.entrance,
            fontWeight: data.template.render.fontWeight,
            textShadow: data.template.render.textShadow,
          }));
          logger.info("Template", "Generated:", data.template.name);
        }
      }
    } catch (error) {
      logger.error("Template", "Error:", error);
    }
  }, [templateDescription, styleParams]);

  const handleAnalyze = useCallback(async () => {
    if (!hasMedia) return;

    setIsAnalyzing(true);

    try {
      if (mode === "demo") {
        setLyrics(OPHELIA_LYRICS);
        setAnalysis(OPHELIA_ANALYSIS);
        setStylePrompt(OPHELIA_ANALYSIS.stylePrompt);
        setStyleParams(OPHELIA_STYLE);
      } else {
        const lyricsToAnalyze =
          lyrics.length > 0 ? lyrics : [];

        if (lyricsToAnalyze.length === 0) {
          setShowSpeechRecorder(true);
          setIsAnalyzing(false);
          return;
        }

        const response = await fetch("/api/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            lyrics: lyricsToAnalyze,
            audioUrl: effectiveAudioUrl || undefined,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          setLyrics(lyricsToAnalyze);
          setAnalysis(data.analysis);
          setStylePrompt(data.stylePrompt);
          setStyleParams(data.styleParams);
          // 自动将 AI 生成的风格提示词填入字幕模板输入框
          if (data.stylePrompt) {
            setTemplateDescription(data.stylePrompt);
          }
        } else {
          const fallback = await fetch("/api/analyze", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ lyrics: lyricsToAnalyze }),
          });
          if (fallback.ok) {
            const data = await fallback.json();
            setAnalysis(data.analysis);
            setStylePrompt(data.stylePrompt);
            setStyleParams(data.styleParams);
            if (data.stylePrompt) {
              setTemplateDescription(data.stylePrompt);
            }
          }
        }
      }
    } catch (error) {
      logger.error("Analyze", "Analysis error:", error);
    } finally {
      setIsAnalyzing(false);
    }
  }, [hasMedia, mode, lyrics, effectiveAudioUrl]);

  const handleSpeechLyrics = useCallback(
    (extractedLyrics: LyricLine[], fullText: string) => {
      setLyrics(extractedLyrics);
      setUserLyricsText(fullText);
      setUserLyricsReady(true);
      setShowSpeechRecorder(false);
      setShowIntro(false);

      // 先验证歌词，再用验证后的歌词进行分析
      fetch("/api/verify-lyrics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lyrics: extractedLyrics }),
      })
        .then((res) => res.json())
        .then((data) => {
          const finalLyrics = data.verified ? data.lyrics : extractedLyrics;
          if (data.corrections?.length > 0) {
            logger.info("CreatePage", `歌词验证: ${data.corrections.length} 处修正`);
            setLyrics(finalLyrics);
          }
          // 用验证后的歌词进行分析
          return finalLyrics;
        })
        .catch((err) => {
          logger.warn("CreatePage", "歌词验证失败，使用原始歌词:", err);
          return extractedLyrics;
        })
        .then((finalLyrics) => {
          setIsAnalyzing(true);
          return fetch("/api/analyze", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              lyrics: finalLyrics,
              audioUrl: effectiveAudioUrl || undefined,
            }),
          })
            .then((res) => res.json())
            .then((data) => {
              setAnalysis(data.analysis);
              setStylePrompt(data.stylePrompt);
              setStyleParams(data.styleParams);
              if (data.stylePrompt) {
                setTemplateDescription(data.stylePrompt);
              }
              setIsAnalyzing(false);
            })
            .catch((error) => {
              logger.error("CreatePage", "Speech lyrics analysis failed:", error);
              setIsAnalyzing(false);
            });
        });
    },
    [audioFile, effectiveAudioUrl]
  );

  const handleStylePromptApply = useCallback(async () => {
    if (!stylePrompt) return;

    // 将 AI 生成的风格提示词放入字幕模板输入框，并自动触发生成
    setTemplateDescription(stylePrompt);

    // 延迟触发以确保 state 更新
    setTimeout(() => {
      handleTemplateGenerateWithPrompt(stylePrompt);
    }, 100);
  }, [stylePrompt]);

  // 带参数版本的模板生成，避免闭包中 templateDescription 还未更新
  const handleTemplateGenerateWithPrompt = useCallback(async (prompt: string) => {
    if (!prompt.trim()) return;

    try {
      const response = await fetch("/api/template", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: prompt,
          currentStyle: styleParams,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.template) {
          setSubtitleTemplate(data.template);
          setStyleParams(prev => ({
            ...prev,
            fontFamily: data.template.render.fontFamily,
            fontSize: data.template.render.fontSize,
            primaryColor: data.template.render.primaryColor,
            secondaryColor: data.template.render.secondaryColor,
            accentColor: data.template.render.accentColor,
            animation: data.template.animation.entrance,
            fontWeight: data.template.render.fontWeight,
            textShadow: data.template.render.textShadow,
          }));
          logger.info("Template", "Generated from style prompt:", data.template.name);
        }
      }
    } catch (error) {
      logger.error("Template", "Error from style prompt:", error);
    }
  }, [styleParams]);

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

  const handleExport = useCallback(async () => {
    if (!hasMedia) return;
    setIsExporting(true);
    setExportProgress(0);
    setExportUrl(null);
    setExportVideoUrl(null);

    // Simulated progress while waiting for render
    const progressInterval = setInterval(() => {
      setExportProgress((prev) => {
        if (prev >= 90) return prev;
        const increment = prev < 30 ? 3 : prev < 60 ? 2 : 1;
        return Math.min(prev + increment, 90);
      });
    }, 800);

    try {
      let resolvedVideoUrl = videoFile?.url;
      // 音频来源：独立音频文件 > 视频文件音轨（不上传音频时默认使用视频中的音频）
      let resolvedAudioUrl = audioFile?.url || videoFile?.url;

      if (mode === "demo") {
        resolvedVideoUrl = "/demo_mv.mp4";
        resolvedAudioUrl = "/demo_audio.mp3";
      } else {
        // Re-upload video and audio blobs in parallel since they are independent
        const uploadPromises: Promise<void>[] = [];
        if (videoFile?.url?.startsWith("blob:")) {
          uploadPromises.push((async () => {
            logger.warn("export", "Video URL is blob, attempting re-upload...");
            const formData = new FormData();
            const blob = await fetch(videoFile.url).then(r => r.blob());
            formData.append("video", blob, videoFile.name);
            const uploadRes = await fetch("/api/upload", { method: "POST", body: formData });
            if (uploadRes.ok) {
              const data = await uploadRes.json();
              resolvedVideoUrl = data.video?.url || videoFile.url;
              // 如果没有独立音频，音轨也从视频中获取
              if (!audioFile) {
                resolvedAudioUrl = resolvedVideoUrl;
              }
            }
          })());
        }
        if (audioFile?.url?.startsWith("blob:")) {
          uploadPromises.push((async () => {
            logger.warn("export", "Audio URL is blob, attempting re-upload...");
            const formData = new FormData();
            const blob = await fetch(audioFile.url).then(r => r.blob());
            formData.append("audio", blob, audioFile.name);
            const uploadRes = await fetch("/api/upload", { method: "POST", body: formData });
            if (uploadRes.ok) {
              const data = await uploadRes.json();
              resolvedAudioUrl = data.audio?.url || audioFile.url;
            }
          })());
        }
        await Promise.all(uploadPromises);
      }

      // 当无独立音频时，告知渲染端从视频中提取音轨
      const extractAudioFromVideo = !audioFile && !(mode === "demo");

      logger.info("export", "开始渲染请求...");

      // Merge styleParams into subtitleTemplate for export consistency.
      // This ensures Remotion render receives the same parameter values as Canvas preview.
      const mergedTemplate = subtitleTemplate
        ? {
            ...subtitleTemplate,
            render: {
              ...subtitleTemplate.render,
              fontFamily: styleParams.fontFamily,
              fontSize: styleParams.fontSize,
              fontWeight: styleParams.fontWeight,
              primaryColor: styleParams.primaryColor,
              secondaryColor: styleParams.secondaryColor,
              accentColor: styleParams.accentColor,
              textShadow: styleParams.textShadow,
            },
            animation: {
              ...subtitleTemplate.animation,
              entrance: styleParams.animation,
            },
            // Carry decoration so Composition can use it directly
            decoration: styleParams.decoration,
          } as SubtitleTemplate & { decoration?: string[] }
        : undefined;

      const response = await fetch("/api/render", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          videoUrl: resolvedVideoUrl,
          audioUrl: resolvedAudioUrl,
          extractAudioFromVideo,
          lyrics,
          styleParams,
          filter,
          speed,
          pitch,
          subtitleTemplate: mergedTemplate || undefined,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        logger.info("export", "渲染完成:", data);

        const videoUrl = data.downloadUrl;
        setExportUrl(videoUrl);
        setExportVideoUrl(videoUrl);
        setExportProgress(100);
      } else {
        const errData = await response.json().catch(() => ({}));
        logger.error("export", "渲染失败:", errData);
        alert(`渲染失败: ${errData.details || errData.error || "未知错误"}`);
      }
    } catch (error) {
      logger.error("export", "渲染异常:", error);
      alert("渲染请求失败，请重试");
    } finally {
      clearInterval(progressInterval);
      setIsExporting(false);
    }
  }, [hasMedia, mode, videoFile, audioFile, lyrics, styleParams, filter, speed, pitch, subtitleTemplate]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50 via-white to-blue-50">
      {/* Top nav */}
      <header className="bg-white/80 backdrop-blur border-b border-sky-100 px-6 py-3 flex items-center justify-between z-20 relative">
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="flex items-center gap-1.5 text-gray-400 hover:text-sky-600 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm hidden sm:inline">{dict.back}</span>
          </Link>
          <h1 className="text-lg font-bold bg-gradient-to-r from-sky-500 to-blue-600 bg-clip-text text-transparent flex items-center gap-2">
            <Bird className="w-5 h-5 text-sky-400" />
            {dict.appName}
          </h1>
          {mode === "demo" && (
            <span className="px-2 py-0.5 bg-sky-100 text-sky-600 text-xs rounded-full font-medium">
              {dict.demoMode}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <LangSwitch />
          {mode !== "demo" && (
            <button
              onClick={loadDemo}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-sky-600 hover:bg-sky-50 rounded-lg transition-colors font-medium"
            >
              <Sparkles className="w-4 h-4" />
              {dict.tryDemo}
            </button>
          )}
          <button
            onClick={handleExport}
            disabled={!hasMedia || lyrics.length === 0 || isExporting}
            className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-sky-500 to-blue-600 text-white rounded-lg text-sm font-semibold hover:from-sky-400 hover:to-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-sky-500/20"
          >
            {isExporting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {dict.exporting}
                {exportProgress > 0 && ` ${exportProgress}%`}
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                {dict.export}
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
                <span className="text-gray-500 text-sm">{dict.or}</span>
                <div className="flex-1 h-px bg-gray-700" />
              </div>

              <button
                onClick={loadDemo}
                className="px-8 py-4 bg-gradient-to-r from-sky-500 to-blue-600 text-white rounded-xl text-lg font-bold hover:scale-105 transition-all shadow-2xl shadow-sky-500/20 flex items-center gap-3 mx-auto"
              >
                <Play className="w-5 h-5" />
                {dict.tryDemoTitle}
              </button>
              <p className="text-gray-500 text-xs mt-3">
                opalite-tiktok热舞 MV + AI 风格分析
              </p>
            </div>
          ) : isAnalyzing || isTranscribing ? (
            <div className="text-center">
              <Loader2 className="w-12 h-12 text-sky-400 animate-spin mx-auto mb-4" />
              <p className="text-gray-300 text-lg font-medium">
                {isTranscribing ? "WhisperX 正在识别歌词..." : dict.analyzing}
              </p>
              <p className="text-gray-500 text-sm mt-2">
                {isTranscribing ? "使用 Demucs + large-v3 从音频中提取歌词时间轴" : dict.analyzingSub}
              </p>
            </div>
          ) : !analysis && hasMedia ? (
            <div className="text-center max-w-md">
              {mode === "upload" && !userLyricsReady ? (
                <div className="space-y-4">
                  <Sparkles className="w-12 h-12 text-sky-400 mx-auto mb-2" />
                  <p className="text-gray-300 text-lg font-medium">
                    {dict.mediaLoaded}
                  </p>
                  <p className="text-gray-500 text-sm">
                    通过语音识别提取歌词，或直接开始分析
                  </p>

                  {!showSpeechRecorder ? (
                    <div className="flex flex-col gap-3 items-center">
                      <button
                        onClick={handleTranscribe}
                        disabled={isTranscribing}
                        className="px-6 py-3 bg-gradient-to-r from-sky-500 to-blue-600 text-white rounded-xl text-base font-semibold hover:scale-105 transition-all shadow-2xl shadow-sky-500/30 flex items-center gap-2 disabled:opacity-50"
                      >
                        {isTranscribing ? (
                          <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                          <Sparkles className="w-5 h-5" />
                        )}
                        WhisperX AI 识别歌词
                      </button>
                      <span className="text-gray-500 text-xs">高精度 Demucs 音源分离 + large-v3 转录</span>

                      <div className="flex items-center gap-4 w-full">
                        <div className="flex-1 h-px bg-gray-700" />
                        <span className="text-gray-500 text-xs">{dict.or}</span>
                        <div className="flex-1 h-px bg-gray-700" />
                      </div>

                      <button
                        onClick={() => setShowSpeechRecorder(true)}
                        className="px-6 py-2 bg-gray-700 text-gray-200 rounded-xl text-sm font-medium hover:bg-gray-600 transition-all flex items-center gap-2"
                      >
                        <Mic className="w-4 h-4" />
                        浏览器语音识别
                      </button>
                    </div>
                  ) : (
                    <div className="w-full">
                      <SpeechRecorder
                        audioUrl={effectiveAudioUrl}
                        onLyricsReady={handleSpeechLyrics}
                        isProcessing={isAnalyzing}
                      />
                      <button
                        onClick={() => setShowSpeechRecorder(false)}
                        className="mt-3 text-gray-400 text-xs hover:text-gray-200 transition-colors"
                      >
                        收起
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center">
                  <Sparkles className="w-12 h-12 text-sky-400 mx-auto mb-4" />
                  <p className="text-gray-300 text-lg font-medium mb-4">
                    {mode === "demo"
                      ? dict.demoReady
                      : dict.mediaLoaded}
                  </p>
                  <button
                    onClick={handleAnalyze}
                    className="px-6 py-3 bg-gradient-to-r from-sky-500 to-blue-600 text-white rounded-xl text-base font-semibold hover:from-sky-400 hover:to-blue-500 transition-all hover:scale-105 shadow-2xl shadow-sky-500/30"
                  >
                    {dict.analyzeBtn}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <VideoPreview
              videoUrl={videoFile?.url}
              audioUrl={effectiveAudioUrl}
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
              subtitleTemplate={subtitleTemplate}
            />
          )}
        </div>

        {/* Control panel */}
        {hasMedia && (
          <div className="w-full lg:w-96 border-l border-sky-100 bg-white overflow-hidden flex-shrink-0">
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
              subtitleTemplate={subtitleTemplate}
              templateDescription={templateDescription}
              onTemplateDescriptionChange={setTemplateDescription}
              onTemplateGenerate={handleTemplateGenerate}
              onSubtitleTemplateChange={setSubtitleTemplate}
            />
          </div>
        )}
      </div>

      {/* Render blocking overlay */}
      {isExporting && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 cursor-wait">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl text-center">
            <div className="w-16 h-16 rounded-full bg-gradient-to-r from-sky-500 to-blue-600 flex items-center justify-center mx-auto mb-4 animate-pulse">
              <Loader2 className="w-8 h-8 text-white animate-spin" />
            </div>
            <h2 className="text-xl font-bold mb-2 text-gray-800">
              正在渲染视频...
            </h2>
            <p className="text-gray-500 text-sm mb-6">
              正在合成视频画面、音频轨道和字幕效果，请勿关闭页面
            </p>

            {/* Progress bar */}
            <div className="w-full bg-gray-200 rounded-full h-3 mb-2 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-sky-400 to-blue-500 rounded-full transition-all duration-700 ease-out animate-pulse"
                style={{ width: `${Math.max(exportProgress || 5, 5)}%` }}
              />
            </div>
            <p className="text-sky-600 text-sm font-mono font-bold">
              {exportProgress > 0 ? `${exportProgress}%` : "准备中..."}
            </p>

            <div className="mt-6 flex flex-wrap gap-2 justify-center">
              {["分析歌词", "合成画面", "渲染字幕", "编码输出"].map((step, i) => (
                <span
                  key={step}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                    exportProgress >= (i + 1) * 25
                      ? "bg-sky-100 text-sky-600"
                      : "bg-gray-100 text-gray-400"
                  }`}
                >
                  {step}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Export result modal */}
      {exportUrl && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 md:p-8 max-w-2xl w-full mx-4 shadow-2xl">
            <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
              <Download className="w-8 h-8 text-emerald-600" />
            </div>
            <h2 className="text-xl font-bold mb-2 text-center text-gray-800">
              {dict.videoReady}
            </h2>
            <p className="text-gray-500 text-sm mb-4 text-center">
              {dict.videoReadyDesc}
            </p>

            {exportVideoUrl && (
              <div className="mb-6 rounded-xl overflow-hidden bg-black shadow-lg">
                <video
                  src={exportVideoUrl}
                  controls
                  autoPlay
                  className="w-full max-h-[400px]"
                  style={{ display: "block" }}
                >
                  您的浏览器不支持视频播放
                </video>
              </div>
            )}

            {isExporting && (
              <div className="mb-4">
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-gradient-to-r from-sky-500 to-blue-600 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${exportProgress}%` }}
                  />
                </div>
                <p className="text-center text-gray-500 text-sm mt-2">
                  {dict.exporting}... {exportProgress}%
                </p>
              </div>
            )}

            <div className="flex gap-3 justify-center mt-4">
              <a
                href={exportUrl}
                download="lyricvibe-video.mp4"
                className="px-6 py-2.5 bg-gradient-to-r from-sky-500 to-blue-600 text-white rounded-lg font-semibold hover:from-sky-400 hover:to-blue-500 transition-colors"
              >
                {dict.download}
              </a>
              <button
                onClick={() => {
                  setExportUrl(null);
                  setExportVideoUrl(null);
                  setExportProgress(0);
                }}
                className="px-6 py-2.5 bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200 transition-colors"
              >
                {dict.close}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
