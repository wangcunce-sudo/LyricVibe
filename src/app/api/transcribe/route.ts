/**
 * POST /api/transcribe
 *
 * 接收音频文件，调用 WhisperX + Demucs 提取歌词时间轴。
 *
 * 流程: 音频 → Demucs 音源分离 → Faster-Whisper large-v3 转录 → JSON 时间轴
 *
 * 请求:
 *   - FormData: { audio: File }
 *   - 或 JSON: { audioUrl: string, referenceLyrics?: string }
 *
 * 返回:
 *   {
 *     success: true,
 *     lyrics: LyricLine[],
 *     language: string,
 *     duration: number,
 *     source: "demucs+whisper"
 *   }
 */

import { NextRequest, NextResponse } from "next/server";
import { execSync } from "child_process";
import path from "path";
import fs from "fs";
import os from "os";
import { TranscribeRequestSchema } from "@/lib/validation";
import { logger } from "@/lib/logger";

export async function POST(request: NextRequest) {
  let audioPath: string | null = null;
  let referenceLyrics: string | undefined;
  let tmpDir: string | null = null;

  try {
    const contentType = request.headers.get("content-type") || "";

    if (contentType.includes("multipart/form-data")) {
      // FormData mode: direct file upload
      const formData = await request.formData();
      const audioFile = formData.get("audio") as File;
      const refText = formData.get("referenceLyrics") as string | null;

      if (!audioFile) {
        return NextResponse.json(
          { error: "Audio file is required" },
          { status: 400 }
        );
      }

      // Save to temp file
      tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "yindongzisheng-"));
      const ext = path.extname(audioFile.name) || ".mp3";
      audioPath = path.join(tmpDir, `audio${ext}`);

      const buffer = Buffer.from(await audioFile.arrayBuffer());
      fs.writeFileSync(audioPath, buffer);

      if (refText) {
        referenceLyrics = refText;
      }
    } else {
      // JSON mode: audioUrl reference
      const body = await request.json();

      const parsed = TranscribeRequestSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { error: "Invalid request", details: parsed.error.flatten() },
          { status: 400 }
        );
      }

      const { audioUrl, referenceLyrics: refText } = parsed.data;

      // Resolve audio path
      if (audioUrl.startsWith("/")) {
        audioPath = path.join(process.cwd(), "public", audioUrl);
      } else if (audioUrl.startsWith("http")) {
        // Download remote audio
        tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "yindongzisheng-"));
        audioPath = path.join(tmpDir, "audio.mp3");

        logger.info("transcribe", `Downloading audio from: ${audioUrl}`);
        const response = await fetch(audioUrl);
        const buffer = Buffer.from(await response.arrayBuffer());
        fs.writeFileSync(audioPath, buffer);
      } else {
        audioPath = audioUrl;
      }

      if (refText) {
        referenceLyrics = refText;
      }
    }

    if (!audioPath || !fs.existsSync(audioPath)) {
      return NextResponse.json(
        { error: "Audio file not found or could not be saved" },
        { status: 400 }
      );
    }

    logger.info("transcribe", `Audio: ${audioPath}, size: ${fs.statSync(audioPath).size} bytes`);

    // Build command — output JSON to temp file to avoid stdout/stderr mixing
    const scriptPath = path.join(process.cwd(), "scripts", "whisperx_transcribe.py");
    const outputJsonPath = path.join(tmpDir || os.tmpdir(), "whisperx_output.json");
    // Use the correct python3 with faster-whisper + demucs installed
    // Next.js server may have a different PATH than the shell
    const pythonPath = process.env.PYTHON3_PATH || "/opt/anaconda3/bin/python3";
    const cmd = [
      pythonPath,
      scriptPath,
      `"${audioPath}"`,
      "--model", "large-v3",
      "--device", "auto",
      "--output", `"${outputJsonPath}"`,
      "--pretty",
    ];

    // Add reference lyrics if provided
    if (referenceLyrics) {
      const refPath = path.join(tmpDir || os.tmpdir(), "reference_lyrics.txt");
      fs.writeFileSync(refPath, referenceLyrics, "utf-8");
      cmd.push("--reference", `"${refPath}"`);
    }

    logger.info("transcribe", `Running: ${cmd.join(" ")}`);

    // Execute WhisperX script — output goes to JSON file, not stdout
    const result = execSync(cmd.join(" "), {
      encoding: "utf-8",
      maxBuffer: 10 * 1024 * 1024, // 10MB
      timeout: 600_000, // 10 minutes
      env: {
        ...process.env,
        PYTHONUNBUFFERED: "1",
      },
    });

    // Log any stderr output from Python for debugging
    if (result.trim()) {
      logger.info("transcribe", `Python output: ${result.trim().slice(0, 500)}`);
    }

    // Read JSON from the output file (avoids stdout/stderr mixing issues)
    if (!fs.existsSync(outputJsonPath)) {
      throw new Error(`WhisperX output file not found: ${outputJsonPath}`);
    }

    const jsonStr = fs.readFileSync(outputJsonPath, "utf-8");
    const data = JSON.parse(jsonStr);

    return NextResponse.json({
      success: true,
      lyrics: data.lyrics || [],
      language: data.language || "en",
      duration: data.duration || 0,
      source: data.source || "whisper",
    });
  } catch (error: unknown) {
    logger.error("transcribe", "Error:", error);
    return NextResponse.json(
      {
        error: "Transcription failed",
        details: error instanceof Error ? error.message : "Unknown error",
        hint: "Ensure python3, demucs, and faster-whisper are installed",
      },
      { status: 500 }
    );
  } finally {
    // Cleanup temp files
    if (tmpDir) {
      try {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      } catch {}
    }
  }
}

export const maxDuration = 600; // 10 minutes for large model
