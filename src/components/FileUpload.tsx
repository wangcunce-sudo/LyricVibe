"use client";

import { useState, useCallback, useRef } from "react";
import { Upload, Film, Music, X, Loader2, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n/I18nProvider";
import type { FileInfo } from "@/lib/types";

interface FileUploadProps {
  onVideoUploaded: (file: FileInfo) => void;
  onAudioUploaded: (file: FileInfo) => void;
  videoFile?: FileInfo | null;
  audioFile?: FileInfo | null;
}

export function FileUpload({
  onVideoUploaded,
  onAudioUploaded,
  videoFile,
  audioFile,
}: FileUploadProps) {
  const { t } = useI18n();
  const dict = t("fileUpload");

  const [dragOver, setDragOver] = useState<"video" | "audio" | null>(null);
  const [uploading, setUploading] = useState(false);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    async (file: File, type: "video" | "audio") => {
      setUploading(true);

      try {
        // 创建本地 blob URL 用于即时预览
        const blobUrl = URL.createObjectURL(file);

        // 同时上传到服务器，获取服务端可访问的 URL
        const formData = new FormData();
        if (type === "video") {
          formData.append("video", file);
        } else {
          formData.append("audio", file);
        }

        const uploadRes = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        let serverUrl = blobUrl; // fallback to blob URL
        if (uploadRes.ok) {
          const data = await uploadRes.json();
          serverUrl = type === "video" ? data.video?.url : data.audio?.url;
        }

        const fileInfo: FileInfo = {
          id: `${type}-${Date.now()}`,
          name: file.name,
          size: file.size,
          type: file.type,
          url: serverUrl,
        };

        if (type === "video") {
          onVideoUploaded(fileInfo);
        } else {
          // Get audio duration
          const audio = new Audio(blobUrl);
          audio.addEventListener("loadedmetadata", () => {
            fileInfo.duration = audio.duration;
            onAudioUploaded(fileInfo);
          });
          audio.addEventListener("error", () => {
            onAudioUploaded(fileInfo);
          });
        }
      } catch (err) {
        console.error("[FileUpload] Error:", err);
        // Fallback: still use blob URL
        const blobUrl = URL.createObjectURL(file);
        const fileInfo: FileInfo = {
          id: `${type}-${Date.now()}`,
          name: file.name,
          size: file.size,
          type: file.type,
          url: blobUrl,
        };
        if (type === "video") {
          onVideoUploaded(fileInfo);
        } else {
          onAudioUploaded(fileInfo);
        }
      } finally {
        setUploading(false);
      }
    },
    [onVideoUploaded, onAudioUploaded]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent, type: "video" | "audio") => {
      e.preventDefault();
      setDragOver(null);
      const files = Array.from(e.dataTransfer.files);
      const validFile = files.find((f) =>
        type === "video"
          ? f.type.startsWith("video/")
          : f.type.startsWith("audio/")
      );
      if (validFile) handleFile(validFile, type);
    },
    [handleFile]
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>, type: "video" | "audio") => {
      const file = e.target.files?.[0];
      if (file) handleFile(file, type);
    },
    [handleFile]
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-2xl mx-auto">
      {/* Video Upload — 必需 */}
      <div
        className={cn(
          "relative border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer",
          "hover:border-sky-400 hover:bg-sky-50/50",
          dragOver === "video"
            ? "border-sky-500 bg-sky-50 scale-[1.02]"
            : videoFile
              ? "border-green-400 bg-green-50"
              : "border-sky-300 bg-sky-50/30"
        )}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver("video");
        }}
        onDragLeave={() => setDragOver(null)}
        onDrop={(e) => handleDrop(e, "video")}
        onClick={() => videoInputRef.current?.click()}
      >
        {uploading ? (
          <div className="space-y-3">
            <Loader2 className="w-10 h-10 mx-auto text-sky-500 animate-spin" />
            <p className="text-sm text-gray-500">{dict.uploading}</p>
          </div>
        ) : videoFile ? (
          <div className="space-y-2">
            <Film className="w-10 h-10 mx-auto text-green-500" />
            <p className="text-sm font-medium text-green-700">
              {videoFile.name}
            </p>
            <p className="text-xs text-green-500">
              {(videoFile.size / (1024 * 1024)).toFixed(1)} MB
            </p>
            <button
              className="text-xs text-red-500 hover:underline"
              onClick={(e) => {
                e.stopPropagation();
                onVideoUploaded(null as any);
              }}
            >
              {dict.remove}
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <Film className="w-10 h-10 mx-auto text-sky-500" />
            <div>
              <p className="text-sm font-medium text-gray-700">
                {dict.dropVideo}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                {dict.videoFormats}
              </p>
            </div>
            <div className="flex items-center justify-center gap-2">
              <span className="inline-block px-2 py-0.5 text-[10px] font-semibold bg-sky-100 text-sky-600 rounded-full">
                必需
              </span>
              <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-sky-500 text-white text-xs font-semibold rounded-lg hover:bg-sky-600 transition-colors shadow-sm">
                <Upload className="w-3 h-3" />
                选择视频
              </span>
            </div>
          </div>
        )}
        <input
          ref={videoInputRef}
          type="file"
          accept="video/*"
          className="hidden"
          onChange={(e) => handleInputChange(e, "video")}
        />
      </div>

      {/* Audio Upload — 可选 */}
      <div
        className={cn(
          "relative border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer",
          "hover:border-blue-400 hover:bg-blue-50/50",
          dragOver === "audio"
            ? "border-blue-500 bg-blue-50 scale-[1.02]"
            : audioFile
              ? "border-green-400 bg-green-50"
              : "border-dashed border-gray-300"
        )}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver("audio");
        }}
        onDragLeave={() => setDragOver(null)}
        onDrop={(e) => handleDrop(e, "audio")}
        onClick={() => audioInputRef.current?.click()}
      >
        {uploading ? (
          <div className="space-y-3">
            <Loader2 className="w-10 h-10 mx-auto text-blue-500 animate-spin" />
            <p className="text-sm text-gray-500">{dict.uploading}</p>
          </div>
        ) : audioFile ? (
          <div className="space-y-2">
            <Music className="w-10 h-10 mx-auto text-green-500" />
            <p className="text-sm font-medium text-green-700">
              {audioFile.name}
            </p>
            <p className="text-xs text-green-500">
              {(audioFile.size / (1024 * 1024)).toFixed(1)} MB
              {audioFile.duration && ` • ${Math.floor(audioFile.duration)}s`}
            </p>
            <button
              className="text-xs text-red-500 hover:underline"
              onClick={(e) => {
                e.stopPropagation();
                onAudioUploaded(null as any);
              }}
            >
              {dict.remove}
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <Music className="w-10 h-10 mx-auto text-gray-400" />
            <div>
              <p className="text-sm font-medium text-gray-600">
                {dict.dropAudio}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                {dict.audioFormats}
              </p>
            </div>
            <div className="flex items-center justify-center gap-2">
              <span className="inline-block px-2 py-0.5 text-[10px] font-semibold bg-gray-100 text-gray-500 rounded-full">
                可选
              </span>
              <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-gray-400 text-white text-xs font-semibold rounded-lg hover:bg-gray-500 transition-colors shadow-sm">
                <Upload className="w-3 h-3" />
                选择音频
              </span>
            </div>
          </div>
        )}
        <input
          ref={audioInputRef}
          type="file"
          accept="audio/*"
          className="hidden"
          onChange={(e) => handleInputChange(e, "audio")}
        />
      </div>

      {/* 音频可选提示 */}
      {videoFile && !audioFile && (
        <div className="md:col-span-2 flex items-center gap-2 text-xs text-gray-400 bg-blue-50/50 rounded-lg px-4 py-2">
          <Info className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
          <span>{dict.audioOptionalHint}</span>
        </div>
      )}
    </div>
  );
}
