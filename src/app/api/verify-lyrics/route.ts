/**
 * POST /api/verify-lyrics
 *
 * 使用 LLM 对语音识别出的歌词进行二次验证和修正。
 * 根据上下文修正同音字、漏字、多字等常见语音识别错误。
 *
 * 请求: { lyrics: LyricLine[], originalAudio?: string }
 * 返回: { success: true, lyrics: LyricLine[], corrections: Correction[] }
 */

import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";

interface LyricLine {
  index: number;
  text: string;
  startTime: number;
  endTime: number;
}

interface Correction {
  index: number;
  original: string;
  corrected: string;
  reason: string;
}

function detectProvider(): { apiUrl: string; apiKey: string; model: string } | null {
  if (process.env.DEEPSEEK_API_KEY) {
    return {
      apiUrl: process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com/v1/chat/completions",
      apiKey: process.env.DEEPSEEK_API_KEY,
      model: process.env.DEEPSEEK_MODEL || "deepseek-chat",
    };
  }
  if (process.env.OPENAI_API_KEY) {
    return {
      apiUrl: process.env.OPENAI_BASE_URL || "https://api.openai.com/v1/chat/completions",
      apiKey: process.env.OPENAI_API_KEY,
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
    };
  }
  return null;
}

const SYSTEM_PROMPT = `You are a lyrics proofreader. Given a list of transcribed song lyrics (from speech recognition), correct any errors.

Common speech recognition errors in lyrics:
- Homophone errors (e.g., "sea" → "see", "their" → "there")
- Chinese homophone errors (e.g., "在见" → "再见", "一前" → "以前", "象" → "像")
- Missing or extra particles
- Misheard words due to background music
- Punctuation cleanup

Rules:
1. Only fix CLEAR errors. If uncertain, keep the original.
2. Preserve the original meaning and style.
3. For Chinese lyrics, fix common homophone errors typical in speech recognition.
4. Do NOT rewrite or "improve" the lyrics — only fix recognition mistakes.
5. Output ONLY valid JSON, no markdown, no explanation.

Output format:
{
  "verifiedLyrics": ["line 1 corrected", "line 2 corrected", ...],
  "corrections": [
    { "index": 0, "original": "wrong text", "corrected": "correct text", "reason": "homophone" }
  ]
}`;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { lyrics } = body as { lyrics: LyricLine[] };

    if (!lyrics || !Array.isArray(lyrics) || lyrics.length === 0) {
      return NextResponse.json(
        { error: "Lyrics array is required" },
        { status: 400 }
      );
    }

    const provider = detectProvider();
    if (!provider) {
      // No AI key — return original lyrics unchanged
      return NextResponse.json({
        success: true,
        lyrics,
        corrections: [],
        verified: false,
        message: "No AI key configured, skipping verification",
      });
    }

    const lyricTexts = lyrics.map((l: LyricLine) => l.text);
    const userPrompt = `Verify and correct these transcribed lyrics:\n${lyricTexts.map((t: string, i: number) => `${i}: ${t}`).join("\n")}`;

    logger.info("verify-lyrics", `Verifying ${lyrics.length} lines...`);

    const response = await fetch(provider.apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${provider.apiKey}`,
      },
      body: JSON.stringify({
        model: provider.model,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.3,
        max_tokens: 2000,
        response_format: { type: "json_object" },
      }),
      signal: AbortSignal.timeout(30000),
    });

    if (!response.ok) {
      logger.warn("verify-lyrics", `AI API error: ${response.status}`);
      return NextResponse.json({
        success: true,
        lyrics,
        corrections: [],
        verified: false,
        message: "AI verification failed, using original lyrics",
      });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      return NextResponse.json({
        success: true,
        lyrics,
        corrections: [],
        verified: false,
        message: "Empty AI response",
      });
    }

    // Parse AI response
    let verified: { verifiedLyrics?: string[]; corrections?: Correction[] };
    try {
      const cleaned = content.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
      verified = JSON.parse(cleaned);
    } catch {
      const match = content.match(/\{[\s\S]*\}/);
      if (!match) throw new Error("Could not parse AI response");
      verified = JSON.parse(match[0]);
    }

    const verifiedTexts = verified.verifiedLyrics || lyricTexts;
    const corrections = verified.corrections || [];

    // Merge corrections into original LyricLine array
    const correctedLyrics = lyrics.map((l: LyricLine, i: number) => ({
      ...l,
      text: verifiedTexts[i] || l.text,
    }));

    logger.info("verify-lyrics", `${corrections.length} corrections made`);
    if (corrections.length > 0) {
      corrections.forEach((c: Correction) => {
        logger.info("verify-lyrics", `  Line ${c.index}: "${c.original}" → "${c.corrected}" (${c.reason})`);
      });
    }

    return NextResponse.json({
      success: true,
      lyrics: correctedLyrics,
      corrections,
      verified: true,
    });
  } catch (error: unknown) {
    logger.error("verify-lyrics", "Verification error:", error);
    return NextResponse.json(
      { error: "Verification failed", details: (error as Error).message },
      { status: 500 }
    );
  }
}
