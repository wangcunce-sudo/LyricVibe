/**
 * POST /api/template
 *
 * 用户通过自然语言描述生成字幕模板（弧度、位置、动画等参数）
 *
 * 请求: { description: string, currentStyle?: StyleParams }
 * 返回: { success: true, template: SubtitleTemplate }
 */

import { NextRequest, NextResponse } from "next/server";
import { generateSubtitleTemplate } from "@/lib/ai-service";
import { TemplateRequestSchema } from "@/lib/validation";
import { logger } from "@/lib/logger";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const parsed = TemplateRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { description, currentStyle } = parsed.data;

    logger.info("template", `Generating template for: "${description.slice(0, 100)}"`);

    const template = await generateSubtitleTemplate(description.trim(), currentStyle);

    return NextResponse.json({
      success: true,
      template,
    });
  } catch (error: unknown) {
    logger.error("template", "Error:", error);
    return NextResponse.json(
      {
        error: "Template generation failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
