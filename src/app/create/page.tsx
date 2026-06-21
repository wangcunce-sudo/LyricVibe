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
  X,
  Music,
  Wand2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { FileUpload } from "@/components/FileUpload";
import { VideoPreview } from "@/components/VideoPreview";
import { ControlPanel } from "@/components/ControlPanel";
import { LangSwitch } from "@/components/LangSwitch";
import { SpeechRecorder } from "@/components/SpeechRecorder";
import { ModeSelector } from "@/components/ModeSelector";
import type { CreateMode } from "@/components/ModeSelector";
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
import type { SceneAnimSpec } from "@/lib/animation-types";
import {
  OPHELIA_LYRICS,
  OPHELIA_ANALYSIS,
  OPHELIA_STYLE,
  OPHELIA_TEMPLATE,
  ALTERNATIVE_STYLES,
} from "@/lib/demo-data";
import { mergeTemplateWithStyle } from "@/lib/types";

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
  const [createMode, setCreateMode] = useState<CreateMode | null>(null);
  const [showIntro, setShowIntro] = useState(true);
  const [subtitleTemplate, setSubtitleTemplate] = useState<SubtitleTemplate | undefined>(undefined);
  const [templateDescription, setTemplateDescription] = useState("");

  const [showSpeechRecorder, setShowSpeechRecorder] = useState(false);
  const [userLyricsReady, setUserLyricsReady] = useState(false);
  const [userLyricsText, setUserLyricsText] = useState("");
  const [songTitle, setSongTitle] = useState<string | null>(null);

  // 动画底片场景状态
  const [backgroundScene, setBackgroundScene] = useState<SceneAnimSpec | null>(null);
  const [backgroundSceneDesc, setBackgroundSceneDesc] = useState("");
  const [isGeneratingScene, setIsGeneratingScene] = useState(false);

  // 音频+场景模式：单独上传音频的状态
  const [sceneModeAudioFile, setSceneModeAudioFile] = useState<FileInfo | null>(null);
  const [sceneModeStep, setSceneModeStep] = useState<"upload-audio" | "describe-scene" | "analyzing">("upload-audio");

  // 图片背景模式：上传静态图片用于 Ken Burns + 飘动动效
  const [backgroundImageFile, setBackgroundImageFile] = useState<FileInfo | null>(null);
  const [useImageBackground, setUseImageBackground] = useState(false);

  // 视频为必需，音频为可选；不上传音频时默认使用视频中的音轨
  const hasMedia = videoFile !== null || mode === "demo" || (createMode === "audio-scene" && sceneModeAudioFile !== null);
  // 实际使用的音频 URL：优先独立音频文件，否则回退到视频文件
  const effectiveAudioUrl = audioFile?.url || videoFile?.url || sceneModeAudioFile?.url || "";

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
    setSongTitle("Taylor Swift - Opalite");
    setShowIntro(false);
  }, []);

  // 音频+场景模式：点击"开始创作"
  const handleSceneModeStart = useCallback(async () => {
    if (!sceneModeAudioFile) return;
    // 如果用了图片背景，不需要 scene 描述；否则必须有描述
    if (!useImageBackground && !backgroundSceneDesc.trim()) return;

    setSceneModeStep("analyzing");
    setShowIntro(false);

    // 并发执行：场景生成 + 音频转录（两者无依赖关系）
    const scenePromise = (async () => {
      if (useImageBackground) return; // 有图片背景则跳过 scene 生成
      setIsGeneratingScene(true);
      try {
        const sceneRes = await fetch("/api/scene", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ description: backgroundSceneDesc }),
        });
        if (sceneRes.ok) {
          const sceneData = await sceneRes.json();
          if (sceneData.scene) {
            setBackgroundScene(sceneData.scene);
          }
        }
      } catch (err) {
        logger.error("Scene", "Scene generation failed:", err);
      } finally {
        setIsGeneratingScene(false);
      }
    })();

    // 转录音频获取歌词（与场景生成并发）
    setIsTranscribing(true);
    let finalLyrics: LyricLine[] = [];
    let identifiedSong: string | null = null;

    try {
      const transRes = await fetch("/api/transcribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ audioUrl: sceneModeAudioFile.url }),
      });
      if (transRes.ok) {
        const tData = await transRes.json();
        if (tData.lyrics && tData.lyrics.length > 0) {
          finalLyrics = tData.lyrics;
          setLyrics(tData.lyrics);
          setUserLyricsReady(true);
          setUserLyricsText(tData.lyrics.map((l: LyricLine) => l.text).join("\n"));

          // 验证歌词（可与 scene 并发，但依赖 transcribe 结果）
          try {
            const vRes = await fetch("/api/verify-lyrics", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ lyrics: tData.lyrics }),
            });
            if (vRes.ok) {
              const vData = await vRes.json();
              if (vData.verified && vData.lyrics) {
                finalLyrics = vData.lyrics;
                setLyrics(vData.lyrics);
              }
              if (vData.songIdentified && vData.songTitle) {
                identifiedSong = vData.songTitle;
                setSongTitle(vData.songTitle);
              }
            }
          } catch {
            // verification is non-critical
          }
        }
      }
    } catch (err) {
      logger.error("SceneMode", "Transcription failed:", err);
    } finally {
      setIsTranscribing(false);
    }

    // 等待 scene 生成完成（如果还没完成）
    await scenePromise;

    if (finalLyrics.length === 0) {
      logger.warn("SceneMode", "No lyrics extracted, skipping analysis");
      return;
    }

    // 分析歌词
    setIsAnalyzing(true);
    try {
      const analyzeRes = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lyrics: finalLyrics,
          audioUrl: sceneModeAudioFile.url,
          songTitle: identifiedSong || undefined,
        }),
      });
      if (analyzeRes.ok) {
        const aData = await analyzeRes.json();
        setAnalysis(aData.analysis);
        setStylePrompt(aData.stylePrompt);
        setStyleParams(aData.styleParams);
        if (aData.stylePrompt) {
          setTemplateDescription(aData.stylePrompt);
        }
      }
    } catch (err) {
      logger.error("SceneMode", "Analysis failed:", err);
    } finally {
      setIsAnalyzing(false);
    }
  }, [sceneModeAudioFile, backgroundSceneDesc, useImageBackground]);

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

          // After transcribe, also verify lyrics with AI
          const rawQuery = audioFile?.name || videoFile?.name || "";
          const songQuery = rawQuery
            ? rawQuery
                .replace(/\.[^.]+$/, "")
                .replace(/[_-]/g, " ")
                .replace(/\b\d{2,}\b/g, "")
                .replace(/\s{2,}/g, " ")
                .trim()
            : undefined;
          fetch("/api/verify-lyrics", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ lyrics: data.lyrics, songQuery }),
          })
            .then((res) => res.json())
            .then((vData) => {
              // 使用 AI 校验后的歌词
              if (vData.verified && vData.lyrics) {
                setLyrics(vData.lyrics);
                setUserLyricsText(vData.lyrics.map((l: LyricLine) => l.text).join("\n"));
              }
              if (vData.corrections?.length > 0) {
                logger.info("Transcribe", `歌词验证: ${vData.corrections.length} 处修正`);
              }
              // 使用 DeepSeek 返回的真实歌曲名
              if (vData.songIdentified && vData.songTitle) {
                setSongTitle(vData.songTitle);
                logger.info("Transcribe", `识别到歌曲: ${vData.songTitle}`);
              }
            })
            .catch(() => {}); // Non-critical, silently ignore
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
  }, [effectiveAudioUrl, audioFile, videoFile]);

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
        setTemplateDescription(OPHELIA_ANALYSIS.stylePrompt);
        setSongTitle("Opalite 热舞 (Demo)");
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
            songTitle: songTitle || undefined,
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
            body: JSON.stringify({ lyrics: lyricsToAnalyze, songTitle: songTitle || undefined }),
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
      // Extract a possible song hint from the filename (AI will ignore if meaningless)
      const rawQuery = audioFile?.name || videoFile?.name || "";
      const songQuery = rawQuery
        ? rawQuery
            .replace(/\.[^.]+$/, "")           // remove extension
            .replace(/[_-]/g, " ")             // underscores/hyphens → spaces
            .replace(/\b\d{2,}\b/g, "")        // remove numbers
            .replace(/\s{2,}/g, " ")           // collapse spaces
            .trim()
        : undefined;
      fetch("/api/verify-lyrics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lyrics: extractedLyrics,
          songQuery,
        }),
      })
        .then((res) => res.json())
        .then((data) => {
          const finalLyrics = data.verified ? data.lyrics : extractedLyrics;
          if (data.corrections?.length > 0) {
            logger.info("CreatePage", `歌词验证: ${data.corrections.length} 处修正`);
            setLyrics(finalLyrics);
          }
          // 使用 DeepSeek 返回的真实歌曲名（而非文件名）
          const identifiedSong = (data.songIdentified && data.songTitle)
            ? data.songTitle
            : null;
          if (identifiedSong) {
            setSongTitle(identifiedSong);
            logger.info("CreatePage", `识别到歌曲: ${identifiedSong}`);
          }
          // 用验证后的歌词 + AI识别的歌曲名进行分析
          return { finalLyrics, identifiedSong };
        })
        .catch((err) => {
          logger.warn("CreatePage", "歌词验证失败，使用原始歌词:", err);
          return { finalLyrics: extractedLyrics, identifiedSong: null as string | null };
        })
        .then(({ finalLyrics, identifiedSong }) => {
          setIsAnalyzing(true);
          return fetch("/api/analyze", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              lyrics: finalLyrics,
              audioUrl: effectiveAudioUrl || undefined,
              songTitle: identifiedSong || undefined,
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

  const handleGenerateScene = useCallback(async () => {
    if (!backgroundSceneDesc.trim()) return;

    setIsGeneratingScene(true);
    try {
      const response = await fetch("/api/scene", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: backgroundSceneDesc }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.scene) {
          setBackgroundScene(data.scene);
          logger.info("Scene", "Generated:", data.scene.name);
        }
      } else {
        logger.error("Scene", "Generation failed");
      }
    } catch (error) {
      logger.error("Scene", "Error:", error);
    } finally {
      setIsGeneratingScene(false);
    }
  }, [backgroundSceneDesc]);

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
      let resolvedAudioUrl = audioFile?.url || videoFile?.url || sceneModeAudioFile?.url;

      if (mode === "demo") {
        resolvedVideoUrl = "/demo_mv.mp4";
        resolvedAudioUrl = "/demo_audio.mp3";
      } else if (createMode === "audio-scene") {
        // 音频+场景模式：不需要视频，但需要确保音频可访问
        resolvedVideoUrl = undefined;
        if (sceneModeAudioFile?.url?.startsWith("blob:")) {
          const formData = new FormData();
          const blob = await fetch(sceneModeAudioFile.url).then(r => r.blob());
          formData.append("audio", blob, sceneModeAudioFile.name);
          const uploadRes = await fetch("/api/upload", { method: "POST", body: formData });
          if (uploadRes.ok) {
            const data = await uploadRes.json();
            resolvedAudioUrl = data.audio?.url || sceneModeAudioFile.url;
          }
        }
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
      const extractAudioFromVideo = !audioFile && !(mode === "demo") && createMode !== "audio-scene";

      logger.info("export", "开始渲染请求...");

      // Merge styleParams into subtitleTemplate (single source of truth)
      const mergedTemplate = subtitleTemplate
        ? ({
            ...mergeTemplateWithStyle(subtitleTemplate, styleParams),
            decoration: styleParams.decoration,
          } as SubtitleTemplate & { decoration?: string[] })
        : undefined;

      const response = await fetch("/api/render", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          videoUrl: backgroundScene ? undefined : resolvedVideoUrl,
          audioUrl: resolvedAudioUrl,
          extractAudioFromVideo,
          lyrics,
          styleParams,
          filter,
          speed,
          pitch,
          subtitleTemplate: mergedTemplate || undefined,
          backgroundScene: backgroundScene || undefined,
          backgroundImage: backgroundImageFile?.url || undefined,
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
  }, [hasMedia, mode, createMode, videoFile, audioFile, sceneModeAudioFile, lyrics, styleParams, filter, speed, pitch, subtitleTemplate, backgroundScene]);

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
            createMode === null ? (
              /* Step 0: 选择创作模式 */
              <ModeSelector
                selectedMode={null}
                onSelect={setCreateMode}
              />
            ) : createMode === "video" ? (
              /* 视频模式：上传视频/音频 */
              <div className="text-center max-w-lg">
                <div className="mb-6">
                  {/* 返回按钮 */}
                  <button
                    onClick={() => setCreateMode(null)}
                    className="text-gray-500 hover:text-gray-300 text-sm flex items-center gap-1 mb-4 mx-auto transition-colors"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    重新选择模式
                  </button>
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
            ) : (
              /* 音频+场景模式：上传音频 + 描述场景 */
              <div className="text-center max-w-xl w-full">
                {/* 返回按钮 */}
                <button
                  onClick={() => {
                    setCreateMode(null);
                    setSceneModeAudioFile(null);
                    setSceneModeStep("upload-audio");
                    setBackgroundSceneDesc("");
                    setBackgroundScene(null);
                  }}
                  className="text-gray-500 hover:text-gray-300 text-sm flex items-center gap-1 mb-6 mx-auto transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  重新选择模式
                </button>

                {sceneModeStep === "upload-audio" && (
                  <div className="space-y-6">
                    {/* 模式标签 */}
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-purple-500/10 border border-purple-500/30 rounded-full">
                      <Wand2 className="w-4 h-4 text-purple-400" />
                      <span className="text-purple-300 text-sm font-medium">音频 + AI 背景模式</span>
                    </div>

                    <h3 className="text-xl font-bold text-white">上传你的音频</h3>
                    <p className="text-gray-400 text-sm">
                      上传音乐文件，AI 将自动提取歌词并为你生成匹配的字幕
                    </p>

                    {/* 简化版音频上传 */}
                    {!sceneModeAudioFile ? (
                      <div className="space-y-4">
                        <label
                          className={cn(
                            "relative border-2 border-dashed rounded-xl p-10 text-center transition-all cursor-pointer block",
                            "border-purple-500/40 hover:border-purple-400 hover:bg-purple-500/5",
                          )}
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={async (e) => {
                            e.preventDefault();
                            const file = e.dataTransfer.files?.[0];
                            if (file && file.type.startsWith("audio/")) {
                              const formData = new FormData();
                              formData.append("audio", file);
                              const res = await fetch("/api/upload", { method: "POST", body: formData });
                              let url = URL.createObjectURL(file);
                              if (res.ok) {
                                const d = await res.json();
                                url = d.audio?.url || url;
                              }
                              const audio = new Audio(URL.createObjectURL(file));
                              audio.addEventListener("loadedmetadata", () => {
                                setSceneModeAudioFile({
                                  id: `scene-audio-${Date.now()}`,
                                  name: file.name,
                                  size: file.size,
                                  type: file.type,
                                  url,
                                  duration: audio.duration,
                                });
                              });
                              audio.addEventListener("error", () => {
                                setSceneModeAudioFile({
                                  id: `scene-audio-${Date.now()}`,
                                  name: file.name,
                                  size: file.size,
                                  type: file.type,
                                  url,
                                });
                              });
                            }
                          }}
                        >
                          <Music className="w-12 h-12 mx-auto text-purple-400 mb-3" />
                          <p className="text-white font-medium mb-1">拖入音频文件</p>
                          <p className="text-gray-500 text-xs">或点击选择文件</p>
                          <p className="text-gray-600 text-xs mt-2">MP3, WAV, AAC, FLAC</p>
                          <input
                            type="file"
                            accept="audio/*"
                            className="hidden"
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              const formData = new FormData();
                              formData.append("audio", file);
                              const res = await fetch("/api/upload", { method: "POST", body: formData });
                              let url = URL.createObjectURL(file);
                              if (res.ok) {
                                const d = await res.json();
                                url = d.audio?.url || url;
                              }
                              const audio = new Audio(URL.createObjectURL(file));
                              audio.addEventListener("loadedmetadata", () => {
                                setSceneModeAudioFile({
                                  id: `scene-audio-${Date.now()}`,
                                  name: file.name,
                                  size: file.size,
                                  type: file.type,
                                  url,
                                  duration: audio.duration,
                                });
                              });
                              audio.addEventListener("error", () => {
                                setSceneModeAudioFile({
                                  id: `scene-audio-${Date.now()}`,
                                  name: file.name,
                                  size: file.size,
                                  type: file.type,
                                  url,
                                });
                              });
                            }}
                          />
                        </label>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        {/* 已上传的音频 */}
                        <div className="flex items-center gap-3 bg-purple-500/10 border border-purple-500/30 rounded-xl px-5 py-3">
                          <Music className="w-5 h-5 text-purple-400 flex-shrink-0" />
                          <div className="text-left flex-1 min-w-0">
                            <p className="text-white text-sm font-medium truncate">
                              {sceneModeAudioFile.name}
                            </p>
                            <p className="text-gray-400 text-xs">
                              {(sceneModeAudioFile.size / (1024 * 1024)).toFixed(1)} MB
                              {sceneModeAudioFile.duration && ` • ${Math.floor(sceneModeAudioFile.duration)}s`}
                            </p>
                          </div>
                          <button
                            onClick={() => setSceneModeAudioFile(null)}
                            className="text-gray-500 hover:text-red-400 transition-colors"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>

                        {/* 分割线：背景选项 */}
                        <div className="flex items-center gap-3">
                          <div className="flex-1 h-px bg-gray-700" />
                          <span className="text-gray-600 text-xs">背景选项</span>
                          <div className="flex-1 h-px bg-gray-700" />
                        </div>

                        {/* 图片背景上传（可选）—— 显眼的卡片 */}
                        <div
                          className={cn(
                            "relative rounded-xl border-2 transition-all",
                            useImageBackground
                              ? "border-amber-500/50 bg-amber-500/5"
                              : "border-dashed border-gray-600/50 hover:border-amber-500/40 bg-gray-800/30"
                          )}
                        >
                          {!useImageBackground ? (
                            <button
                              onClick={() => setUseImageBackground(true)}
                              className="w-full p-5 text-center group"
                            >
                              <svg className="w-10 h-10 mx-auto text-amber-500/60 group-hover:text-amber-400 mb-2 transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                                <circle cx="8.5" cy="8.5" r="1.5"/>
                                <polyline points="21,15 16,10 5,21"/>
                              </svg>
                              <p className="text-amber-400 font-semibold text-sm mb-1">启用图片背景</p>
                              <p className="text-gray-400 text-xs">上传一张图片作为动画底片，AI 将添加 Ken Burns 缩放 + 飘动动效</p>
                            </button>
                          ) : (
                            <div className="p-4 space-y-3">
                              <div className="flex items-center justify-between">
                                <h3 className="text-sm font-semibold text-amber-300 flex items-center gap-2">
                                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                                    <circle cx="8.5" cy="8.5" r="1.5"/>
                                    <polyline points="21,15 16,10 5,21"/>
                                  </svg>
                                  图片背景
                                </h3>
                                <button
                                  onClick={() => {
                                    setUseImageBackground(false);
                                    setBackgroundImageFile(null);
                                  }}
                                  className="text-xs text-gray-500 hover:text-red-400 transition-colors"
                                >
                                  移除
                                </button>
                              </div>

                              {!backgroundImageFile ? (
                                <label
                                  className="relative border-2 border-dashed rounded-xl p-6 text-center transition-all cursor-pointer block border-amber-500/40 hover:border-amber-400 hover:bg-amber-500/5"
                                  onDragOver={(e) => e.preventDefault()}
                                  onDrop={async (e) => {
                                    e.preventDefault();
                                    const file = e.dataTransfer.files?.[0];
                                    if (file && file.type.startsWith("image/")) {
                                      const formData = new FormData();
                                      formData.append("image", file);
                                      try {
                                        const res = await fetch("/api/upload", { method: "POST", body: formData });
                                        let url = URL.createObjectURL(file);
                                        if (res.ok) {
                                          const d = await res.json();
                                          url = d.image?.url || d.url || url;
                                        }
                                        setBackgroundImageFile({
                                          id: `bg-img-${Date.now()}`,
                                          name: file.name,
                                          size: file.size,
                                          type: file.type,
                                          url,
                                        });
                                      } catch {
                                        setBackgroundImageFile({
                                          id: `bg-img-${Date.now()}`,
                                          name: file.name,
                                          size: file.size,
                                          type: file.type,
                                          url: URL.createObjectURL(file),
                                        });
                                      }
                                    }
                                  }}
                                >
                                  <svg className="w-8 h-8 mx-auto text-amber-400 mb-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                                    <circle cx="8.5" cy="8.5" r="1.5"/>
                                    <polyline points="21,15 16,10 5,21"/>
                                  </svg>
                                  <p className="text-gray-300 text-sm font-medium mb-1">拖入图片或点击上传</p>
                                  <p className="text-gray-500 text-xs">PNG, JPG, WebP</p>
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
                                        setBackgroundImageFile({
                                          id: `bg-img-${Date.now()}`,
                                          name: file.name,
                                          size: file.size,
                                          type: file.type,
                                          url,
                                        });
                                      } catch {
                                        setBackgroundImageFile({
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
                                <div className="flex items-center gap-3 bg-amber-500/10 border border-amber-500/30 rounded-xl px-5 py-3">
                                  <svg className="w-5 h-5 text-amber-400 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                                    <circle cx="8.5" cy="8.5" r="1.5"/>
                                    <polyline points="21,15 16,10 5,21"/>
                                  </svg>
                                  <div className="text-left flex-1 min-w-0">
                                    <p className="text-white text-sm font-medium truncate">
                                      {backgroundImageFile.name}
                                    </p>
                                    <p className="text-gray-400 text-xs">
                                      Ken Burns 缩放 + 飘动动效
                                    </p>
                                  </div>
                                  <button
                                    onClick={() => setBackgroundImageFile(null)}
                                    className="text-gray-500 hover:text-red-400 transition-colors"
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                </div>
                              )}

                              {/* 动效强度滑块 */}
                              {backgroundImageFile && (
                                <div className="space-y-1">
                                  <div className="flex justify-between text-xs">
                                    <span className="text-gray-400">动效强度</span>
                                    <span className="text-amber-400">中等</span>
                                  </div>
                                  <input
                                    type="range"
                                    min="0.2"
                                    max="1"
                                    step="0.1"
                                    defaultValue="0.6"
                                    className="w-full accent-amber-400"
                                  />
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        {/* 分割线 */}
                        <div className="flex items-center gap-3">
                          <div className="flex-1 h-px bg-gray-700" />
                          <span className="text-gray-600 text-xs">场景描述</span>
                          <div className="flex-1 h-px bg-gray-700" />
                        </div>

                        {/* 场景描述输入 */}
                        <div className="space-y-3">
                          <h3 className="text-lg font-bold text-white">描述你想要的背景</h3>
                          <p className="text-gray-400 text-sm">
                            用自然语言告诉 AI 你想要的循环动画背景效果
                          </p>

                          <div className="relative">
                            <textarea
                              value={backgroundSceneDesc}
                              onChange={(e) => setBackgroundSceneDesc(e.target.value)}
                              placeholder="例如：粉色泡泡在海底飘的梦幻背景..."
                              rows={3}
                              className="w-full bg-gray-800 border border-gray-600 rounded-xl px-4 py-3 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-purple-400 resize-none transition-colors"
                            />
                          </div>

                          {/* 预设快捷选择 */}
                          <div className="flex flex-wrap gap-2">
                            {[
                              { label: "🌊 海底泡泡", desc: "粉色泡泡在海底飘的梦幻背景" },
                              { label: "✨ 星空银河", desc: "璀璨星空银河旋转" },
                              { label: "🌸 樱花飘落", desc: "樱花飘落的春天" },
                              { label: "🌆 霓虹赛博", desc: "霓虹灯闪烁的赛博朋克城市" },
                              { label: "🌅 日落黄昏", desc: "日落黄昏温暖的光晕" },
                              { label: "💧 雨滴下落", desc: "下雨天雨滴下落" },
                            ].map((preset) => (
                              <button
                                key={preset.label}
                                onClick={() => setBackgroundSceneDesc(preset.desc)}
                                className={cn(
                                  "px-3 py-1.5 text-xs rounded-full border transition-all",
                                  backgroundSceneDesc === preset.desc
                                    ? "border-purple-400 bg-purple-500/20 text-purple-300"
                                    : "border-gray-600 text-gray-400 hover:border-gray-500 hover:text-gray-300"
                                )}
                              >
                                {preset.label}
                              </button>
                            ))}
                          </div>

                          {/* 开始创作按钮 */}
                          <button
                            onClick={handleSceneModeStart}
                            disabled={(!backgroundSceneDesc.trim() && !useImageBackground) || (useImageBackground && !backgroundImageFile)}
                            className="w-full px-6 py-3.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl text-base font-bold hover:from-purple-400 hover:to-pink-400 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-lg shadow-purple-500/20 flex items-center justify-center gap-2"
                          >
                            <Wand2 className="w-5 h-5" />
                            {useImageBackground && backgroundImageFile ? "使用图片背景开始创作" : "开始创作"}
                          </button>
                          <p className="text-gray-600 text-xs">
                            AI 将自动转录歌词、分析情感、生成字幕样式和循环动画背景
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
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
              backgroundScene={backgroundScene}
              backgroundImage={backgroundImageFile?.url}
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
              songTitle={songTitle}
              backgroundScene={backgroundScene}
              backgroundSceneDescription={backgroundSceneDesc}
              onBackgroundSceneDescriptionChange={setBackgroundSceneDesc}
              onBackgroundSceneGenerate={handleGenerateScene}
              onBackgroundSceneChange={setBackgroundScene}
              isGeneratingScene={isGeneratingScene}
              backgroundImageFile={backgroundImageFile}
              onBackgroundImageFileChange={setBackgroundImageFile}
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
                download="yindongzisheng-video.mp4"
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
