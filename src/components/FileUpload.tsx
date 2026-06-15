"use client";

import { useState, useCallback, useRef } from "react";
import { Upload, Film, Music, X } from "lucide-react";
import { cn } from "@/lib/utils";
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
  const [dragOver, setDragOver] = useState<"video" | "audio" | null>(null);
  const [uploading, setUploading] = useState(false);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    async (file: File, type: "video" | "audio") => {
      // Create a local object URL for immediate preview
      const url = URL.createObjectURL(file);
      const fileInfo: FileInfo = {
        id: `${type}-${Date.now()}`,
        name: file.name,
        size: file.size,
        type: file.type,
        url,
      };

      if (type === "video") {
        onVideoUploaded(fileInfo);
      } else {
        // Get audio duration
        const audio = new Audio(url);
        audio.addEventListener("loadedmetadata", () => {
          fileInfo.duration = audio.duration;
          onAudioUploaded(fileInfo);
        });
        audio.addEventListener("error", () => {
          onAudioUploaded(fileInfo);
        });
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
      {/* Video Upload */}
      <div
        className={cn(
          "relative border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer",
          "hover:border-purple-400 hover:bg-purple-50/50",
          dragOver === "video"
            ? "border-purple-500 bg-purple-50 scale-[1.02]"
            : "border-gray-300",
          videoFile && "border-green-400 bg-green-50"
        )}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver("video");
        }}
        onDragLeave={() => setDragOver(null)}
        onDrop={(e) => handleDrop(e, "video")}
        onClick={() => videoInputRef.current?.click()}
      >
        {videoFile ? (
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
              Remove
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <Film className="w-10 h-10 mx-auto text-gray-400" />
            <div>
              <p className="text-sm font-medium text-gray-600">
                Drop your video here
              </p>
              <p className="text-xs text-gray-400 mt-1">
                MP4, MOV, WebM (optional)
              </p>
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

      {/* Audio Upload */}
      <div
        className={cn(
          "relative border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer",
          "hover:border-blue-400 hover:bg-blue-50/50",
          dragOver === "audio"
            ? "border-blue-500 bg-blue-50 scale-[1.02]"
            : "border-gray-300",
          audioFile && "border-green-400 bg-green-50"
        )}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver("audio");
        }}
        onDragLeave={() => setDragOver(null)}
        onDrop={(e) => handleDrop(e, "audio")}
        onClick={() => audioInputRef.current?.click()}
      >
        {audioFile ? (
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
              Remove
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <Music className="w-10 h-10 mx-auto text-gray-400" />
            <div>
              <p className="text-sm font-medium text-gray-600">
                Drop your audio here
              </p>
              <p className="text-xs text-gray-400 mt-1">
                MP3, WAV, AAC (required)
              </p>
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
    </div>
  );
}
