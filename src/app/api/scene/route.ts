/**
 * POST /api/scene
 *
 * 将用户的自然语言描述转换为动画底片场景 (SceneAnimSpec)。
 * 如果 AI 可用，调用 LLM 生成；否则使用关键词匹配 fallback。
 */

import { NextRequest, NextResponse } from "next/server";
import { generateAnimationScene } from "@/lib/ai-service";
import { logger } from "@/lib/logger";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { description } = body;

    if (!description || typeof description !== "string" || !description.trim()) {
      return NextResponse.json(
        { error: "description is required" },
        { status: 400 }
      );
    }

    logger.info("scene", `生成动画场景: "${description}"`);

    const scene = await generateAnimationScene(description.trim());

    logger.info("scene", `生成完成: ${scene.name}`);

    return NextResponse.json({ scene });
  } catch (error) {
    logger.error("scene", "场景生成失败:", error);
    return NextResponse.json(
      {
        error: "场景生成失败",
        details: error instanceof Error ? error.message : "未知错误",
      },
      { status: 500 }
    );
  }
}
