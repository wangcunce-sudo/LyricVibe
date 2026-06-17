/**
 * POST /api/analyze
 * Accepts lyrics text (or structured LyricLine[]) and returns
 * AI-powered emotional analysis + style prompt + parsed style params.
 *
 * Also accepts { audioUrl, lyrics } for cases where lyrics have been
 * extracted from audio (via Web Speech API or Whisper).
 */

import { NextRequest, NextResponse } from "next/server";
import { analyzeLyrics, parseStylePrompt } from "@/lib/ai-service";
import { AnalyzeRequestSchema } from "@/lib/validation";
import { logger } from "@/lib/logger";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const parsed = AnalyzeRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { lyrics, audioUrl } = parsed.data;

    // Step 1: Analyze lyrics for emotions, theme, style prompt
    const analysis = await analyzeLyrics(lyrics);

    // Step 2: Parse the style prompt into concrete StyleParams
    const styleParams = await parseStylePrompt(
      analysis.stylePrompt,
      analysis
    );

    return NextResponse.json({
      analysis,
      styleParams,
      stylePrompt: analysis.stylePrompt,
      source: audioUrl ? "audio" : "lyrics",
    });
  } catch (error) {
    logger.error("analyze", "Analysis endpoint error:", error);
    return NextResponse.json(
      { error: "Analysis failed. Please try again." },
      { status: 500 }
    );
  }
}
