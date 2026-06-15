/**
 * AI Service — handles lyrics analysis and style prompt generation.
 * Uses OpenAI-compatible API (Claude/OpenAI) to analyze lyrics
 * and generate visual style prompts for subtitle rendering.
 */

import type { AnalysisResult, LyricLine, EmotionTag } from "./types";

// ============================================================
// Analysis Prompt Template
// ============================================================

const ANALYSIS_SYSTEM_PROMPT = `You are an expert in music and visual design. Your job is to analyze song lyrics deeply and output structured JSON that will drive a lyric subtitle video generator.

Analyze the lyrics for:
1. **Emotions**: Identify up to 5 emotions from this list: joy, sadness, anger, sweetness, nostalgia, loneliness, passion, calmness. Rate each 0.0-1.0 intensity.
2. **Theme**: 2-4 thematic tags (e.g., "summer romance", "heartbreak", "road trip", "self-discovery", "friendship", "coming of age").
3. **Tempo feel**: "slow", "medium", or "fast" based on lyrical rhythm and density.
4. **Color palette**: 3 HEX colors (primary, secondary, accent) that match the emotional tone.
5. **Font style**: A font direction suggestion (e.g., "bold sans-serif", "elegant serif", "handwritten cursive", "retro typewriter").
6. **Style Prompt**: A single paragraph describing the ideal subtitle visual style — include font feel, color mood, animation personality, decoration ideas, and overall atmosphere. Write it as a creative brief for a motion designer. Keep it under 80 words.

Output ONLY valid JSON, no markdown or explanation.`;

const ANALYSIS_USER_PROMPT = (lyrics: string) => `Analyze these lyrics:

${lyrics}`;

// ============================================================
// Default analysis (fallback when API is unavailable)
// ============================================================

function getDefaultAnalysis(lyrics: LyricLine[]): AnalysisResult {
  const text = lyrics.map((l) => l.text).join(" ");
  const wordCount = text.split(/\s+/).length;
  const tempo = wordCount / (lyrics.length || 1) > 6 ? "fast" : wordCount / (lyrics.length || 1) > 3 ? "medium" : "slow";

  return {
    emotions: [{ label: "calmness", intensity: 0.7 }],
    theme: ["reflective", "personal"],
    tempo: tempo as "slow" | "medium" | "fast",
    suggestedPalette: ["#FFFFFF", "#E0E0E0", "#FF6B6B"],
    suggestedFontStyle: "clean sans-serif",
    stylePrompt:
      "Clean modern typography with white text on a subtle dark overlay. Gentle fade-in animations for each line. Minimal and elegant — let the words speak for themselves. Slight text shadow for depth.",
  };
}

// ============================================================
// Main analysis function
// ============================================================

export async function analyzeLyrics(
  lyrics: LyricLine[]
): Promise<AnalysisResult> {
  const apiKey = process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    console.warn("No AI API key found, using default analysis");
    return getDefaultAnalysis(lyrics);
  }

  const lyricsText = lyrics.map((l) => l.text).join("\n");

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);

    const isAnthropic = !!process.env.ANTHROPIC_API_KEY;

    let result: AnalysisResult;

    if (isAnthropic) {
      result = await callAnthropic(lyricsText, controller.signal);
    } else {
      result = await callOpenAI(lyricsText, controller.signal);
    }

    clearTimeout(timeout);
    return result;
  } catch (error) {
    console.error("AI analysis failed:", error);
    return getDefaultAnalysis(lyrics);
  }
}

async function callOpenAI(
  lyricsText: string,
  signal: AbortSignal
): Promise<AnalysisResult> {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: ANALYSIS_SYSTEM_PROMPT },
        { role: "user", content: ANALYSIS_USER_PROMPT(lyricsText) },
      ],
      temperature: 0.7,
      max_tokens: 800,
      response_format: { type: "json_object" },
    }),
    signal,
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.status}`);
  }

  const data = await response.json();
  const content = data.choices[0]?.message?.content;
  return parseAnalysisResponse(content);
}

async function callAnthropic(
  lyricsText: string,
  signal: AbortSignal
): Promise<AnalysisResult> {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY!,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-3-haiku-20240307",
      max_tokens: 800,
      system: ANALYSIS_SYSTEM_PROMPT,
      messages: [
        { role: "user", content: ANALYSIS_USER_PROMPT(lyricsText) },
      ],
    }),
    signal,
  });

  if (!response.ok) {
    throw new Error(`Anthropic API error: ${response.status}`);
  }

  const data = await response.json();
  const content = data.content[0]?.text;
  return parseAnalysisResponse(content);
}

function parseAnalysisResponse(raw: string | undefined): AnalysisResult {
  if (!raw) throw new Error("Empty response from AI");

  // Try to extract JSON from the response
  let json: any;
  try {
    // Handle markdown code blocks
    const cleaned = raw
      .replace(/```json\s*/g, "")
      .replace(/```\s*/g, "")
      .trim();
    json = JSON.parse(cleaned);
  } catch {
    // Try to find JSON object in text
    const match = raw.match(/\{[\s\S]*\}/);
    if (match) {
      json = JSON.parse(match[0]);
    } else {
      throw new Error("Could not parse AI response as JSON");
    }
  }

  return {
    emotions: (json.emotions || []).map((e: any) => ({
      label: e.label || e.emotion || "calmness",
      intensity: typeof e.intensity === "number" ? e.intensity : 0.5,
    })),
    theme: json.theme || json.themes || ["personal"],
    tempo: json.tempo || json.tempo_feel || "medium",
    suggestedPalette: json.suggestedPalette || json.color_palette || [
      "#FFFFFF",
      "#E0E0E0",
      "#FF6B6B",
    ],
    suggestedFontStyle: json.suggestedFontStyle || json.font_style || "sans-serif",
    stylePrompt:
      json.stylePrompt || json.style_prompt || "Clean modern typography.",
  };
}

// ============================================================
// Parse style prompt into StyleParams
// ============================================================

export async function parseStylePrompt(
  stylePrompt: string,
  analysis: AnalysisResult
): Promise<import("./types").StyleParams> {
  const apiKey = process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    return defaultStyleParams(analysis);
  }

  try {
    const controller = new AbortController();
    setTimeout(() => controller.abort(), 10000);

    const isAnthropic = !!process.env.ANTHROPIC_API_KEY;

    const systemPrompt = `You are a style parser. Convert a visual style description into structured parameters for a subtitle renderer.
    
Output ONLY valid JSON with these fields:
- fontFamily: CSS font-family string (e.g., "Inter, sans-serif", "Georgia, serif", "'Caveat', cursive")
- fontSize: number (24-72, default 48)
- primaryColor: HEX color for main text
- secondaryColor: HEX color for secondary text
- accentColor: HEX color for highlights/accents
- animation: one of "fade-in", "karaoke", "typewriter", "bounce", "scale-up", "slide-up"
- decoration: array from ["none", "underline", "highlight", "border", "emoji"]
- fontWeight: number (300-800)
- textShadow: boolean`;

    const userPrompt = `Style description: "${stylePrompt}"
    
Emotional context: ${analysis.emotions.map((e) => e.label).join(", ")}
Theme: ${analysis.theme.join(", ")}
Tempo: ${analysis.tempo}`;

    let raw: string;

    if (isAnthropic) {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": process.env.ANTHROPIC_API_KEY!,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-3-haiku-20240307",
          max_tokens: 400,
          system: systemPrompt,
          messages: [{ role: "user", content: userPrompt }],
        }),
        signal: controller.signal,
      });
      const data = await response.json();
      raw = data.content[0]?.text || "";
    } else {
      const response = await fetch(
        "https://api.openai.com/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userPrompt },
            ],
            temperature: 0.5,
            max_tokens: 400,
            response_format: { type: "json_object" },
          }),
          signal: controller.signal,
        }
      );
      const data = await response.json();
      raw = data.choices[0]?.message?.content || "";
    }

    const cleaned = raw.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
    const json = JSON.parse(cleaned);

    return {
      fontFamily: json.fontFamily || "Inter, sans-serif",
      fontSize: json.fontSize || 48,
      primaryColor: json.primaryColor || analysis.suggestedPalette[0] || "#FFFFFF",
      secondaryColor: json.secondaryColor || analysis.suggestedPalette[1] || "#E0E0E0",
      accentColor: json.accentColor || analysis.suggestedPalette[2] || "#FF6B6B",
      animation: json.animation || "fade-in",
      decoration: json.decoration || ["none"],
      fontWeight: json.fontWeight || 500,
      textShadow: json.textShadow ?? false,
    };
  } catch (error) {
    console.error("Style parsing failed:", error);
    return defaultStyleParams(analysis);
  }
}

function defaultStyleParams(
  analysis: AnalysisResult
): import("./types").StyleParams {
  const [primary, secondary, accent] = analysis.suggestedPalette;

  return {
    fontFamily: "Inter, sans-serif",
    fontSize: 48,
    primaryColor: primary || "#FFFFFF",
    secondaryColor: secondary || "#E0E0E0",
    accentColor: accent || "#FF6B6B",
    animation: "fade-in",
    decoration: ["none"],
    fontWeight: 500,
    textShadow: false,
  };
}
