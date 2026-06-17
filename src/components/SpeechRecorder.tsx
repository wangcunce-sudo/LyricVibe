"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { Mic, MicOff, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { speechService, type RecognitionStatus } from "@/lib/speech-service";
import type { LyricLine } from "@/lib/types";

interface SpeechRecorderProps {
  audioUrl: string;
  onLyricsReady: (lyrics: LyricLine[], fullText: string) => void;
  isProcessing?: boolean;
}

const STATUS_LABELS: Record<string, string> = {
  idle: "点击麦克风开始歌词识别",
  listening: "正在聆听...对着麦克风播放你的音频",
  processing: "处理中...",
  stopped: "识别完成",
  error: "出错了",
};

/** Check if browser supports SpeechRecognition */
function isSpeechSupported(): boolean {
  if (typeof window === "undefined") return false;
  return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
}

export function SpeechRecorder({
  audioUrl,
  onLyricsReady,
  isProcessing,
}: SpeechRecorderProps) {
  const [status, setStatus] = useState<RecognitionStatus>("idle");
  const [interimText, setInterimText] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [lineCount, setLineCount] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const hasStartedRef = useRef(false);

  const [browserSupported, setBrowserSupported] = useState(true);

  useEffect(() => {
    setBrowserSupported(isSpeechSupported());
  }, []);

  // Set up callbacks
  useEffect(() => {
    speechService.setCallbacks({
      onInterimResult: (text) => {
        setInterimText(text);
      },
      onFinalResult: (text, confidence, index) => {
        setLineCount((prev) => prev + 1);
      },
      onComplete: (lyrics, fullText) => {
        setInterimText("");
        setLineCount(lyrics.length);
        if (lyrics.length > 0) {
          onLyricsReady(lyrics, fullText);
        }
      },
      onError: (error) => {
        setErrorMsg(error);
        setStatus("error");
      },
      onStatusChange: (newStatus) => {
        setStatus(newStatus);
        if (newStatus === "stopped" || newStatus === "error") {
          // Pause audio playback
          if (audioRef.current) {
            audioRef.current.pause();
          }
        }
      },
    });

    return () => {
      speechService.abort();
    };
  }, [onLyricsReady]);

  // Start recording + playback
  const handleStart = useCallback(() => {
    if (status === "listening" || status === "processing") return;

    setErrorMsg(null);
    setInterimText("");
    setLineCount(0);
    hasStartedRef.current = true;

    // Start speech recognition
    speechService.start("en-US");

    // Play audio for the recognition to hear
    // Note: SpeechRecognition uses the system microphone, so we play audio through speakers
    if (audioUrl) {
      const audio = new Audio(audioUrl);
      audioRef.current = audio;
      audio.play().catch((e) => {
        console.warn("Audio playback failed:", e);
        // Recognition can still work with external audio
      });
    }
  }, [status, audioUrl]);

  // Stop recording
  const handleStop = useCallback(() => {
    speechService.stop();
    if (audioRef.current) {
      audioRef.current.pause();
    }
  }, []);

  // Reset
  const handleReset = useCallback(() => {
    speechService.abort();
    setStatus("idle");
    setInterimText("");
    setErrorMsg(null);
    setLineCount(0);
    hasStartedRef.current = false;
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
  }, []);

  if (!browserSupported) {
    return (
      <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-center">
        <AlertCircle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
        <p className="text-sm text-amber-700 font-medium">
          浏览器不支持语音识别
        </p>
        <p className="text-xs text-amber-600 mt-1">
          请使用 Chrome、Edge 或 Arc 浏览器，并确保已授权麦克风权限。
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Status display */}
      <div className="flex items-center gap-3">
        {status === "idle" && !errorMsg && (
          <button
            onClick={handleStart}
            disabled={isProcessing}
            className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-sky-500 to-blue-600 text-white rounded-xl text-sm font-semibold hover:from-sky-400 hover:to-blue-500 disabled:opacity-50 transition-all shadow-lg shadow-sky-500/20"
          >
            <Mic className="w-5 h-5" />
            开始语音识别
          </button>
        )}

        {(status === "listening" || status === "processing") && (
          <button
            onClick={handleStop}
            className="flex items-center gap-2 px-5 py-3 bg-red-500 text-white rounded-xl text-sm font-semibold hover:bg-red-600 transition-all animate-pulse"
          >
            <MicOff className="w-5 h-5" />
            停止识别
          </button>
        )}

        {status === "stopped" && lineCount > 0 && (
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-green-500" />
            <span className="text-sm text-green-700 font-medium">
              已识别 {lineCount} 行歌词
            </span>
          </div>
        )}

        {status === "error" && (
          <button
            onClick={handleReset}
            className="flex items-center gap-2 px-5 py-3 bg-amber-500 text-white rounded-xl text-sm font-semibold hover:bg-amber-600 transition-all"
          >
            重试
          </button>
        )}

        {(status === "listening" || status === "processing") && (
          <div className="flex items-center gap-2 text-sky-600">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm font-medium">
              {STATUS_LABELS[status]}
            </span>
          </div>
        )}
      </div>

      {/* Error message */}
      {errorMsg && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-red-700">{errorMsg}</p>
        </div>
      )}

      {/* Interim transcript (live preview) */}
      {interimText && (
        <div className="p-3 bg-sky-50 border border-sky-200 rounded-lg">
          <p className="text-xs text-sky-500 mb-1">实时识别:</p>
          <p className="text-sm text-sky-900 italic">{interimText}</p>
        </div>
      )}

      {/* Tips */}
      {status === "idle" && !errorMsg && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-xs text-blue-700">
            💡 <strong>使用说明：</strong>
          </p>
          <ul className="text-xs text-blue-600 mt-1 space-y-0.5 list-disc list-inside">
            <li>点击麦克风按钮后，会自动播放你的音频文件</li>
            <li>请确保电脑扬声器音量适中，麦克风可以接收到声音</li>
            <li>识别过程中请保持环境安静</li>
            <li>支持英文歌词识别（中文识别准确度较低）</li>
            <li>可以随时点击停止按钮结束识别</li>
          </ul>
        </div>
      )}
    </div>
  );
}
