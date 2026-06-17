/**
 * GET /api/render/[id]/download
 * 下载渲染完成的视频文件
 */

import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs";

const OUTPUT_DIR = path.join(process.cwd(), "out", "renders");

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const outputPath = path.join(OUTPUT_DIR, `${id}.mp4`);

  if (!fs.existsSync(outputPath)) {
    return NextResponse.json(
      { error: "文件不存在或渲染未完成" },
      { status: 404 }
    );
  }

  const stat = fs.statSync(outputPath);
  const fileBuffer = fs.readFileSync(outputPath);

  return new NextResponse(fileBuffer, {
    headers: {
      "Content-Type": "video/mp4",
      "Content-Disposition": `inline; filename="lyricvibe-${id}.mp4"`,
      "Content-Length": String(stat.size),
      "Accept-Ranges": "bytes",
      "Cache-Control": "no-cache, no-store, must-revalidate",
    },
  });
}
