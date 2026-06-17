/**
 * POST /api/upload
 *
 * 用户上传视频/音频文件，保存到 public/uploads/ 目录
 * 返回可被服务端渲染访问的 URL 路径
 */

import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs";
import crypto from "crypto";

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");

function ensureUploadDir() {
  if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  }
}

export async function POST(request: NextRequest) {
  try {
    ensureUploadDir();

    const formData = await request.formData();
    const videoFile = formData.get("video") as File | null;
    const audioFile = formData.get("audio") as File | null;

    const result: { video?: { url: string; name: string; size: number }; audio?: { url: string; name: string; size: number } } = {};

    // 处理视频上传
    if (videoFile && videoFile.size > 0) {
      const buffer = Buffer.from(await videoFile.arrayBuffer());
      const ext = path.extname(videoFile.name) || ".mp4";
      const safeName = `${crypto.randomUUID()}${ext}`;
      const filePath = path.join(UPLOAD_DIR, safeName);
      fs.writeFileSync(filePath, buffer);
      
      result.video = {
        url: `/uploads/${safeName}`,
        name: videoFile.name,
        size: videoFile.size,
      };
      console.log(`[upload] 视频已保存: ${safeName} (${(videoFile.size / 1024 / 1024).toFixed(1)}MB)`);
    }

    // 处理音频上传
    if (audioFile && audioFile.size > 0) {
      const buffer = Buffer.from(await audioFile.arrayBuffer());
      const ext = path.extname(audioFile.name) || ".mp3";
      const safeName = `${crypto.randomUUID()}${ext}`;
      const filePath = path.join(UPLOAD_DIR, safeName);
      fs.writeFileSync(filePath, buffer);
      
      result.audio = {
        url: `/uploads/${safeName}`,
        name: audioFile.name,
        size: audioFile.size,
      };
      console.log(`[upload] 音频已保存: ${safeName} (${(audioFile.size / 1024 / 1024).toFixed(1)}MB)`);
    }

    if (!result.video && !result.audio) {
      return NextResponse.json(
        { error: "请至少上传一个视频或音频文件" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error: any) {
    console.error("[upload] 上传失败:", error);
    return NextResponse.json(
      { error: "上传失败", details: error?.message },
      { status: 500 }
    );
  }
}

export const maxDuration = 120;
