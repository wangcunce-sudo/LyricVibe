/**
 * POST /api/verify-lyrics
 *
 * 使用 LLM 对语音识别出的歌词进行二次验证和修正。
 * 策略分两阶段：
 *   1. 搜索原歌曲歌词（通过 AI 联网搜索获取准确歌词）
 *   2. 对比语音识别结果与原歌词，修正同音字错误
 *
 * 请求: { lyrics: LyricLine[], songQuery?: string }
 * 返回: { success: true, lyrics: LyricLine[], corrections: Correction[] }
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { logger } from "@/lib/logger";
import { detectProvider, getProviderConfig, safeJsonParse } from "@/lib/ai-service";

// ── Types ──

interface LyricLineInput {
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

// ── Zod validation ──

const WordTimestampSchema = z.object({
  word: z.string(),
  start: z.number(),
  end: z.number(),
  confidence: z.number().optional(),
}).passthrough();

const LyricLineInputSchema = z.object({
  index: z.number().int().min(0),
  text: z.string(),
  startTime: z.number(),
  endTime: z.number(),
  confidence: z.number().optional(),
  alignment: z.enum(["left", "center", "right"]).optional(),
  words: z.array(WordTimestampSchema).optional(),
});

const VerifyLyricsRequestSchema = z.object({
  lyrics: z.array(LyricLineInputSchema).min(1, "At least one lyric line is required"),
  /** Optional: song title + artist for better search accuracy */
  songQuery: z.string().optional(),
});

// ── Prompts ──

const SYSTEM_PROMPT = `You are a lyrics verification expert with deep knowledge of music across all genres, languages, and eras. Your knowledge includes the actual lyrics of millions of songs — use it.

Given transcribed lyrics (from automatic speech recognition) and optionally a hint about the song, your job is to:
1. Identify the song from the lyrics (even if the hint is useless)
2. Find the CORRECT original lyrics
3. Correct any speech recognition errors by comparing against the original

CRITICAL RULES:
- ALWAYS try to identify the song from the LYRICS THEMSELVES first. The lyrics are your primary signal.
- The "songQuery" hint may be a filename, a partial name, or complete garbage. Treat it ONLY as a weak hint — NEVER use it as the songTitle unless it actually matches a real song you know.
- If the songQuery looks like a filename (has underscores, numbers, extensions like .mp4) or is a single short word that doesn't match any known song, IGNORE IT COMPLETELY.
- If you CAN identify the song from the lyrics, set songIdentified=true and songTitle to the REAL song name with artist (e.g., "Taylor Swift - Opalite").
- If you CANNOT identify the song with confidence, set songIdentified=false and songTitle=null.
- NEVER return the songQuery value as songTitle unless you are 100% certain it's the correct song name.

Correction rules:
- Compare transcribed lyrics line-by-line with the original lyrics you know.
- Fix ONLY clear speech recognition errors (homophones, misheard words, wrong words that sound similar).
- Example English errors: "all for light" → "opalite", "their" → "there", "see" → "sea", "night" → "knight"
- Example Chinese errors: "在见" → "再见", "一前" → "以前", "象" → "像"
- Do NOT rewrite or "improve" the lyrics — only fix recognition mistakes.
- Preserve the original meaning, rhyme, and rhythm.

Output ONLY valid JSON:
{
  "songIdentified": true/false,
  "songTitle": "Real Song Name - Artist Name" or null,
  "verifiedLyrics": ["line 1 corrected", "line 2 corrected", ...],
  "corrections": [
    { "index": 0, "original": "wrong text", "corrected": "correct text", "reason": "homophone / misheard / wrong word" }
  ]
}`;

/**
 * Detect if a songQuery looks like a meaningful song name vs a filename/garbage.
 * Returns null if the query should be ignored.
 */
function sanitizeSongQuery(query?: string): string | null {
  if (!query || query.trim().length === 0) return null;

  const q = query.trim();

  // Too short to be meaningful (single char, or 2-char without Chinese)
  if (q.length <= 2 && !/[\u4e00-\u9fff]/.test(q)) return null;

  // Looks like a filename/technical name: underscores, or hyphen-number patterns
  if (/\.[a-zA-Z0-9]{2,5}$/.test(q)) return null;
  if (/_/.test(q)) return null;  // underscores almost always indicate filenames/IDs
  if (/^[a-zA-Z0-9]+-[a-zA-Z0-9]+$/.test(q) && q.length < 15) return null;  // short hyphenated like "test-123"

  // Common placeholder/technical names
  const blacklist = /^(demo|test|output|untitled|recording|audio|video|clip|export|final|draft|temp|tmp|new|raw|sample)$/i;
  if (blacklist.test(q)) return null;

  // Looks like a hash or UUID
  if (/^[a-f0-9]{8,}$/i.test(q)) return null;

  return q;
}

function buildUserPrompt(lyrics: LyricLineInput[], songQuery?: string): string {
  const lyricTexts = lyrics.map((l, i) => `${i}: ${l.text}`).join("\n");

  const sanitized = sanitizeSongQuery(songQuery);

  if (sanitized) {
    return `The user THINKS this might be: "${sanitized}". Use this as a weak hint only.\n\nTranscribed lyrics to verify (from speech recognition, may contain errors):\n${lyricTexts}\n\nIdentify the song from the lyrics, find the correct original lyrics, and fix any recognition errors.`;
  }

  return `Transcribed lyrics to verify (from speech recognition, may contain errors):\n${lyricTexts}\n\nIdentify the song from the lyrics. Find the correct original lyrics and fix any recognition errors. If you cannot confidently identify the song, at least fix obvious homophone/misheard-word errors.`;
}

// ── Handler ──

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const parsed = VerifyLyricsRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { lyrics, songQuery } = parsed.data;

    const provider = detectProvider();
    if (!provider) {
      return NextResponse.json({
        success: true,
        lyrics,
        corrections: [],
        verified: false,
        message: "No AI key configured, skipping verification",
      });
    }

    const config = getProviderConfig(provider);
    const userPrompt = buildUserPrompt(lyrics, songQuery);

    logger.info("verify-lyrics", `Verifying ${lyrics.length} lines${songQuery ? ` for "${songQuery}"` : ""}...`);

    // Use OpenAI-compatible API (works for DeepSeek and OpenAI)
    const response = await fetch(config.apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.model,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.2, // Low temp for verification accuracy
        max_tokens: 3000,  // More tokens for detailed corrections
        response_format: { type: "json_object" },
      }),
      signal: AbortSignal.timeout(60000), // 60s — searching lyrics may take longer
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

    logger.info("verify-lyrics", `Raw AI response (first 500 chars): ${content?.slice(0, 500) || "(empty)"}`);

    if (!content) {
      return NextResponse.json({
        success: true,
        lyrics,
        corrections: [],
        verified: false,
        message: "Empty AI response",
      });
    }

    // Parse AI response using shared safeJsonParse
    const verified = safeJsonParse(content) as {
      songIdentified?: boolean;
      songTitle?: string;
      verifiedLyrics?: string[];
      corrections?: Correction[];
    };

    const verifiedTexts = verified.verifiedLyrics || lyrics.map(l => l.text);
    const corrections = verified.corrections || [];

    // Merge corrections into original LyricLine array
    const correctedLyrics = lyrics.map((l, i) => ({
      ...l,
      text: verifiedTexts[i] || l.text,
    }));

    logger.info("verify-lyrics",
      `Song identified: ${verified.songIdentified ? verified.songTitle || "yes" : "no"}, ` +
      `${corrections.length} corrections made`
    );
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
      songIdentified: verified.songIdentified || false,
      songTitle: verified.songTitle || null,
    });
  } catch (error: unknown) {
    logger.error("verify-lyrics", "Verification error:", error);
    return NextResponse.json(
      { error: "Verification failed", details: (error as Error).message },
      { status: 500 }
    );
  }
}
