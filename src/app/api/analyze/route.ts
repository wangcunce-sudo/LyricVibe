/**
 * POST /api/analyze
 * Accepts lyrics text (or structured LyricLine[]) and returns
 * AI-powered emotional analysis + style prompt + parsed style params.
 */

import { NextRequest, NextResponse } from "next/server";
import { analyzeLyrics, parseStylePrompt } from "@/lib/ai-service";
import type { LyricLine } from "@/lib/types";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { lyrics } = body as { lyrics: LyricLine[] };

    if (!lyrics || !Array.isArray(lyrics) || lyrics.length === 0) {
      return NextResponse.json(
        { error: "Lyrics array is required and must be non-empty" },
        { status: 400 }
      );
    }

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
    });
  } catch (error) {
    console.error("Analysis endpoint error:", error);
    return NextResponse.json(
      { error: "Analysis failed. Please try again." },
      { status: 500 }
    );
  }
}
