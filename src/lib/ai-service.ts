/**
 * AI Service — handles lyrics analysis and style prompt generation.
 * Uses OpenAI-compatible API (OpenAI / Anthropic / DeepSeek) to analyze lyrics
 * and generate visual style prompts for subtitle rendering.
 *
 * Supported providers (auto-detected by env vars):
 *   - OPENAI_API_KEY → OpenAI (api.openai.com)
 *   - ANTHROPIC_API_KEY → Anthropic Claude (api.anthropic.com)
 *   - DEEPSEEK_API_KEY → DeepSeek (api.deepseek.com) — OpenAI-compatible
 *
 * DeepSeek uses the same request format as OpenAI, just with a different
 * base URL and model name.
 */

import type { AnalysisResult, LyricLine, EmotionTag, SubtitleTemplate } from "./types";
import { logger } from "./logger";

// ── Timeout constants ──
const AI_ANALYSIS_TIMEOUT_MS = 30000;
const AI_STYLE_PARSE_TIMEOUT_MS = 15000;
const AI_TEMPLATE_TIMEOUT_MS = 20000;

// ── Provider detection ────────────────────────────────────

type AIProvider = "openai" | "anthropic" | "deepseek";

export interface ProviderConfig {
  apiUrl: string;
  apiKey: string;
  model: string;
  supportsJsonMode: boolean;
}

/**
 * Detect AI provider with explicit env var support.
 *
 * Priority:
 *   1. AI_PROVIDER env var (explicit override)
 *   2. Auto-detect by API key presence (DeepSeek > OpenAI > Anthropic)
 *
 * DeepSeek is prioritized over Anthropic in auto-detect because:
 *   - Better Chinese language support (critical for Chinese lyrics)
 *   - More cost-effective for this use case
 *   - Supports json_object response format natively
 */
export function detectProvider(): AIProvider | null {
  const explicit = process.env.AI_PROVIDER?.toLowerCase();
  if (explicit === "openai" || explicit === "anthropic" || explicit === "deepseek") {
    return explicit;
  }
  // Auto-detect: DeepSeek first for Chinese lyrics support
  if (process.env.DEEPSEEK_API_KEY) return "deepseek";
  if (process.env.OPENAI_API_KEY) return "openai";
  if (process.env.ANTHROPIC_API_KEY) return "anthropic";
  return null;
}

export function getProviderConfig(provider: AIProvider): ProviderConfig {
  switch (provider) {
    case "openai":
      return {
        apiUrl: process.env.OPENAI_BASE_URL || "https://api.openai.com/v1/chat/completions",
        apiKey: process.env.OPENAI_API_KEY!,
        model: process.env.OPENAI_MODEL || "gpt-4o-mini",
        supportsJsonMode: true,
      };
    case "deepseek":
      return {
        apiUrl: process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com/v1/chat/completions",
        apiKey: process.env.DEEPSEEK_API_KEY!,
        model: process.env.DEEPSEEK_MODEL || "deepseek-chat",
        supportsJsonMode: true,
      };
    case "anthropic":
      return {
        apiUrl: "https://api.anthropic.com/v1/messages",
        apiKey: process.env.ANTHROPIC_API_KEY!,
        model: process.env.ANTHROPIC_MODEL || "claude-3-haiku-20240307",
        supportsJsonMode: false,
      };
  }
}

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
6. **Style Prompt**: A short, keyword-dense description of the ideal subtitle visual style. This will be fed into a subtitle template generator. Describe using keywords like: font type, colors, position, animation style, background type, glow/stroke effects, curvature. Keep it under 60 words. Use the SAME LANGUAGE as the lyrics — if lyrics are Chinese, write the style prompt in Chinese; if English, write in English.

Output ONLY valid JSON, no markdown or explanation.`;

const ANALYSIS_USER_PROMPT = (lyrics: string, isChinese: boolean, songTitle?: string) => `Analyze these lyrics:
${songTitle ? `\nThis song is identified as: "${songTitle}". Use the song's known mood, genre, and cultural context to inform your analysis.\n` : ""}
${isChinese ? "(Note: these are Chinese lyrics. Output emotion labels in English, but write the stylePrompt in Chinese as a keyword-dense subtitle template description.)" : ""}

${lyrics}`;

// ============================================================
// Default analysis (fallback when API is unavailable)
// ============================================================

/** Detect if the lyrics text is primarily Chinese */
function isChineseLyrics(lyrics: LyricLine[]): boolean {
  const text = lyrics.map((l) => l.text).join("");
  const chineseChars = (text.match(/[\u4e00-\u9fff\u3400-\u4dbf]/g) || []).length;
  return chineseChars > text.length * 0.3;
}

function getDefaultAnalysis(lyrics: LyricLine[]): AnalysisResult {
  const text = lyrics.map((l) => l.text).join(" ");
  const wordCount = text.split(/\s+/).length;
  const tempo = wordCount / (lyrics.length || 1) > 6 ? "fast" : wordCount / (lyrics.length || 1) > 3 ? "medium" : "slow";

  const isChinese = isChineseLyrics(lyrics);

  return {
    emotions: [{ label: "calmness", intensity: 0.7 }],
    theme: isChinese ? ["沉思", "个人"] : ["reflective", "personal"],
    tempo: tempo as "slow" | "medium" | "fast",
    suggestedPalette: ["#FFFFFF", "#E0E0E0", "#FF6B6B"],
    suggestedFontStyle: "clean sans-serif",
    stylePrompt: isChinese
      ? "现代简约无衬线字体，白色主字配淡蓝辅色，居中淡入动画，柔和文字阴影，半透明深色背景。简洁、优雅、叙述感。"
      : "Clean modern typography with white text on a subtle dark overlay. Gentle fade-in animations for each line. Minimal and elegant — let the words speak for themselves. Slight text shadow for depth.",
  };
}

// ============================================================
// Main analysis function
// ============================================================

export async function analyzeLyrics(
  lyrics: LyricLine[],
  songTitle?: string
): Promise<AnalysisResult> {
  const provider = detectProvider();

  if (!provider) {
    logger.warn("ai-service", "No AI API key found (OPENAI_API_KEY, ANTHROPIC_API_KEY, or DEEPSEEK_API_KEY), using default analysis");
    return getDefaultAnalysis(lyrics);
  }

  const lyricsText = lyrics.map((l) => l.text).join("\n");
  const isChinese = isChineseLyrics(lyrics);

  if (songTitle) {
    logger.info("ai-service", `Analyzing lyrics with song context: "${songTitle}"`);
  }

  try {
    const signal = AbortSignal.timeout(AI_ANALYSIS_TIMEOUT_MS);

    let result: AnalysisResult;

    if (provider === "anthropic") {
      result = await callAnthropic(lyricsText, signal, isChinese, songTitle);
    } else {
      // Both OpenAI and DeepSeek use OpenAI-compatible API
      result = await callOpenAICompat(lyricsText, signal, provider, isChinese, songTitle);
    }

    return result;
  } catch (error) {
    logger.error("ai-service", "AI analysis failed:", error);
    return getDefaultAnalysis(lyrics);
  }
}

async function callOpenAICompat(
  lyricsText: string,
  signal: AbortSignal,
  provider: "openai" | "deepseek",
  isChinese: boolean = false,
  songTitle?: string
): Promise<AnalysisResult> {
  const config = getProviderConfig(provider);

  const body: Record<string, unknown> = {
    model: config.model,
    messages: [
      { role: "system", content: ANALYSIS_SYSTEM_PROMPT },
      { role: "user", content: ANALYSIS_USER_PROMPT(lyricsText, isChinese, songTitle) },
    ],
    temperature: 0.3, // Low temp for structured JSON output consistency
    max_tokens: 1200,  // Increased for longer lyrics with detailed analysis
  };

  // DeepSeek and OpenAI both support json_object response format
  if (config.supportsJsonMode) {
    body.response_format = { type: "json_object" };
  }

  const response = await fetch(config.apiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify(body),
    signal,
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => "");
    throw new Error(
      `${provider.toUpperCase()} API error: ${response.status} — ${errText.slice(0, 200)}`
    );
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  return parseAnalysisResponse(content);
}

async function callAnthropic(
  lyricsText: string,
  signal: AbortSignal,
  isChinese: boolean = false,
  songTitle?: string
): Promise<AnalysisResult> {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY!,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: process.env.ANTHROPIC_MODEL || "claude-3-haiku-20240307",
      max_tokens: 1200,
      system: ANALYSIS_SYSTEM_PROMPT,
      messages: [
        { role: "user", content: ANALYSIS_USER_PROMPT(lyricsText, isChinese, songTitle) },
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

/**
 * Safe JSON parse with multi-layer fallback.
 *
 * Handles common AI response quirks:
 *   1. Markdown code fences
 *   2. Extra text around JSON object
 *   3. Multiple JSON objects (extracts the largest one)
 *
 * Uses bracket-counting extraction (not greedy regex) to correctly
 * handle nested objects and avoid matching across multiple JSON blocks.
 */
export function safeJsonParse(raw: string): Record<string, unknown> {
  // First attempt: clean markdown fences and parse
  const cleaned = raw.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    // Second attempt: bracket-counting extraction (handles nesting correctly)
    const extracted = extractJsonObject(raw);
    if (!extracted) {
      throw new Error("Could not find JSON object in AI response");
    }
    try {
      return JSON.parse(extracted);
    } catch (innerError) {
      // Third attempt: try to fix common JSON issues (trailing commas, etc.)
      try {
        const fixed = extracted
          .replace(/,\s*}/g, "}")
          .replace(/,\s*\]/g, "]");
        return JSON.parse(fixed);
      } catch {
        throw new Error(`Failed to parse AI response as JSON: ${(innerError as Error).message}`);
      }
    }
  }
}

/**
 * Extract the first valid JSON object from text using bracket counting.
 * Handles nested objects/arrays correctly, unlike greedy regex.
 * Returns the largest JSON block if multiple are found.
 */
function extractJsonObject(text: string): string | null {
  const blocks: string[] = [];
  let depth = 0;
  let start = -1;

  for (let i = 0; i < text.length; i++) {
    if (text[i] === "{") {
      if (depth === 0) start = i;
      depth++;
    } else if (text[i] === "}") {
      depth--;
      if (depth === 0 && start >= 0) {
        blocks.push(text.slice(start, i + 1));
        start = -1;
      } else if (depth < 0) {
        depth = 0; // Reset on malformed input
      }
    }
  }

  if (blocks.length === 0) return null;
  // Return the largest block (most likely the actual JSON payload)
  return blocks.reduce((a, b) => (b.length > a.length ? b : a));
}

function parseAnalysisResponse(raw: string | undefined): AnalysisResult {
  if (!raw) throw new Error("Empty response from AI");

  logger.info("ai-service", "Raw AI response (first 300 chars):", raw.slice(0, 300));

  const json = safeJsonParse(raw);

  // Emotions — support multiple field formats
  const emotionsRaw = Array.isArray(json.emotions) ? json.emotions
    : Array.isArray(json.emotion) ? json.emotion
    : [];

  // Themes — support both "theme" and "themes"
  const themeRaw = Array.isArray(json.theme) ? json.theme
    : Array.isArray(json.themes) ? json.themes
    : [];

  // Palette
  const paletteRaw = Array.isArray(json.suggestedPalette) ? json.suggestedPalette
    : Array.isArray(json.color_palette) ? json.color_palette
    : Array.isArray(json.colors) ? json.colors
    : ["#FFFFFF", "#E0E0E0", "#FF6B6B"];

  // Normalize emotions — AI may return plain strings instead of objects
  const emotions: { label: string; intensity: number }[] = emotionsRaw.map((e: unknown) => {
    if (typeof e === "string") {
      return { label: normalizeLabel(e), intensity: 0.7 };
    }
    const item = e as Record<string, unknown>;
    return {
      label: normalizeLabel(String(item.label || item.emotion || item.name || "calmness")),
      intensity: typeof item.intensity === "number" ? item.intensity
        : typeof item.score === "number" ? item.score
        : 0.5,
    };
  });

  // Normalize themes
  const themes = themeRaw.map((t: unknown) => {
    if (typeof t === "string") return normalizeLabel(t);
    const item = t as Record<string, unknown>;
    return normalizeLabel(String(item.label || item.name || item.tag || t));
  });

  // Detect if the AI response is predominantly Chinese (for language normalization)
  // Check only the stylePrompt field — more reliable than checking entire JSON
  const stylePromptText = String(
    json.stylePrompt || json.style_prompt || json.styleDescription
    || json.style_description || json.description || ""
  );
  const chineseInPrompt = (stylePromptText.match(/[\u4e00-\u9fff\u3400-\u4dbf]/g) || []).length;
  const isResponseChinese = chineseInPrompt > stylePromptText.length * 0.2;

  // Normalize theme labels to match the response language
  const normalizedThemes = normalizeLabelsToLanguage(themes, isResponseChinese ? "zh" : "en");

  // Also normalize emotion labels
  const normalizedEmotions = emotions.map(e => ({
    ...e,
    label: normalizeLabelToLanguage(e.label, isResponseChinese ? "zh" : "en"),
  }));

  // Style prompt — reuse the already-extracted text
  const stylePrompt = stylePromptText;

  logger.info("ai-service", "Parsed analysis:", {
    emotionCount: normalizedEmotions.length,
    themeCount: normalizedThemes.length,
    hasStylePrompt: !!stylePrompt,
    isResponseChinese,
    emotions: normalizedEmotions.map(e => e.label),
    themes: normalizedThemes,
  });

  return {
    emotions: normalizedEmotions.length > 0 ? normalizedEmotions : [
      { label: isResponseChinese ? "平静" : "calmness", intensity: 0.5 },
    ],
    theme: normalizedThemes.length > 0 ? normalizedThemes : [isResponseChinese ? "个人" : "personal"],
    tempo: (String(json.tempo || json.tempo_feel || "medium")) as "slow" | "medium" | "fast",
    suggestedPalette: paletteRaw.map(String),
    suggestedFontStyle: String(json.suggestedFontStyle || json.font_style || "sans-serif"),
    stylePrompt: stylePrompt || (isResponseChinese
      ? "现代简约无衬线字体，白色主字配淡蓝辅色，居中淡入动画，柔和文字阴影。"
      : "Clean modern typography with smooth animations."),
  };
}

/** Normalize AI output labels to lowercase English for dictionary lookup.
 *  If the AI returns a Chinese label (e.g. "爱"), keep it as-is so it can be displayed directly
 *  or matched against the Chinese dictionary keys. */
function normalizeLabel(label: string): string {
  const trimmed = label.trim();
  // If it's already lowercase ASCII, return as-is
  if (/^[a-z0-9\s&_-]+$/.test(trimmed)) return trimmed;
  // If mixed/other (Chinese, uppercase, etc.), return as-is
  return trimmed;
}

/** English→Chinese lookup table for common emotion/theme labels.
 *  Used to normalize mixed-language AI outputs into a consistent language. */
const EN_TO_ZH: Record<string, string> = {
  // Emotions
  passion: "热情", nostalgia: "怀旧", sweetness: "甜蜜", sadness: "悲伤",
  anger: "愤怒", joy: "喜悦", melancholy: "忧郁", romance: "浪漫",
  loneliness: "孤独", calmness: "平静", energy: "活力", triumph: "胜利",
  excitement: "兴奋", hope: "希望", longing: "渴望", love: "爱",
  happiness: "幸福", pride: "骄傲", regret: "遗憾", warmth: "温暖",
  playfulness: "俏皮", rebellion: "叛逆",
  // Themes
  "dance & movement": "舞蹈与律动", "electric energy": "电流能量",
  "storm to sunshine": "风雨见晴", empowerment: "自我赋权",
  "summer romance": "夏日恋情", heartbreak: "心碎", "road trip": "公路旅行",
  "self-discovery": "自我发现", friendship: "友情", "coming of age": "成长",
  reflective: "沉思", personal: "个人", dream: "梦想", youth: "青春",
  freedom: "自由", adventure: "冒险", party: "派对", nature: "自然",
  city: "城市", summer: "夏日", winter: "冬季", healing: "治愈", growth: "成长",
};

/** Reverse lookup: Chinese→English */
const ZH_TO_EN: Record<string, string> = Object.fromEntries(
  Object.entries(EN_TO_ZH).map(([en, zh]) => [zh, en])
);

function normalizeLabelToLanguage(label: string, targetLang: "zh" | "en"): string {
  if (targetLang === "zh") {
    // If already Chinese, return as-is
    if (/[\u4e00-\u9fff]/.test(label)) return label;
    // Translate English→Chinese
    return EN_TO_ZH[label.toLowerCase()] || label;
  } else {
    // If already ASCII, return as-is
    if (!/[\u4e00-\u9fff]/.test(label)) return label;
    // Translate Chinese→English
    return ZH_TO_EN[label] || label;
  }
}

function normalizeLabelsToLanguage(labels: string[], targetLang: "zh" | "en"): string[] {
  return labels.map(l => normalizeLabelToLanguage(l, targetLang));
}

// ============================================================
// Parse style prompt into StyleParams
// ============================================================

export async function parseStylePrompt(
  stylePrompt: string,
  analysis: AnalysisResult
): Promise<import("./types").StyleParams> {
  const provider = detectProvider();

  if (!provider) {
    return defaultStyleParams(analysis);
  }

  try {
    const signal = AbortSignal.timeout(AI_STYLE_PARSE_TIMEOUT_MS);

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

    if (provider === "anthropic") {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": process.env.ANTHROPIC_API_KEY!,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: process.env.ANTHROPIC_MODEL || "claude-3-haiku-20240307",
          max_tokens: 400,
          system: systemPrompt,
          messages: [{ role: "user", content: userPrompt }],
        }),
        signal,
      });
      const data = await response.json();
      raw = data.content[0]?.text || "";
    } else {
      const config = getProviderConfig(provider);
      const body: Record<string, unknown> = {
        model: config.model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.5,
        max_tokens: 400,
      };
      if (config.supportsJsonMode) {
        body.response_format = { type: "json_object" };
      }

      const response = await fetch(config.apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify(body),
        signal,
      });
      const data = await response.json();
      raw = data.choices?.[0]?.message?.content || "";
    }

    const json = safeJsonParse(raw);

    return {
      fontFamily: String(json.fontFamily || "Inter, sans-serif"),
      fontSize: Number(json.fontSize) || 48,
      primaryColor: String(json.primaryColor || analysis.suggestedPalette[0] || "#FFFFFF"),
      secondaryColor: String(json.secondaryColor || analysis.suggestedPalette[1] || "#E0E0E0"),
      accentColor: String(json.accentColor || analysis.suggestedPalette[2] || "#FF6B6B"),
      animation: String(json.animation || "fade-in") as import("./types").AnimationType,
      decoration: (Array.isArray(json.decoration)
        ? json.decoration.map(String).filter((d): d is import("./types").DecorationType =>
            ["underline", "highlight", "border", "emoji", "none"].includes(d))
        : ["none"]) as import("./types").DecorationType[],
      fontWeight: Number(json.fontWeight) || 500,
      textShadow: Boolean(json.textShadow),
    };
  } catch (error) {
    logger.error("ai-service", "Style parsing failed:", error);
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

// ============================================================
// 字幕模板生成 — 用户通过语言描述生成字幕模板
// 支持: 弧度(curvature), 位置(position), 动画, 颜色, 背景等
// ============================================================

const TEMPLATE_SYSTEM_PROMPT = `You are a subtitle template designer for a lyric video generator. Convert a user's natural language description into precise subtitle template parameters.

The video canvas is 1920×1080 (16:9). All positions are normalized (0-1).

Output ONLY valid JSON with this exact structure:
{
  "name": "short template name",
  "description": "one-line summary",
  "layout": {
    "positionX": 0.5,       // 0=left, 1=right
    "positionY": 0.65,      // 0=top, 1=bottom
    "alternateMode": "none", // "none" | "alternate" | "random" | "wave" | "length-adaptive"
    "alternateAmplitude": 0, // 0-1, how much the position alternates
    "curvature": 0,          // -0.3 to 0.3, positive=arc up, negative=arc down
    "maxWidthRatio": 0.8,    // 0.3-0.95
    "lineSpacing": 1.4       // 1.0-2.5
  },
  "animation": {
    "entrance": "fade-in",   // "fade-in"|"karaoke"|"typewriter"|"bounce"|"scale-up"|"slide-up"
    "entranceDuration": 0.3, // seconds
    "exit": "fade-in",
    "exitDuration": 0.2,
    "bounciness": 0.5,       // 0-1 (only for bounce)
    "easing": "ease-out"     // "linear"|"ease"|"ease-in"|"ease-out"|"ease-in-out"|"bounce"
  },
  "render": {
    "fontFamily": "'Inter', sans-serif",
    "fontSize": 48,          // 24-96
    "fontWeight": 600,       // 300-900
    "primaryColor": "#FFFFFF",
    "secondaryColor": "#4FC3F7",
    "accentColor": "#00E5FF",
    "textShadow": true,
    "glowColor": "#4FC3F7",
    "glowIntensity": 0.5,    // 0-1
    "strokeWidth": 0,        // 0-8 px
    "strokeColor": "#000000",
    "backgroundType": "none", // "none"|"solid"|"gradient"|"glass"
    "backgroundColor": "rgba(0,0,0,0.5)",
    "paddingX": 20,
    "paddingY": 10,
    "borderRadius": 8
  }
}

Interpretation guidelines:
- "弧形/弯曲/拱形": set curvature to ±0.1-0.25 (positive = arc upward)
- "左上/左下/右上/右下": map to positionX, positionY accordingly
- "左右交替/左右跳": set alternateMode="alternate", alternateAmplitude=0.2-0.4
- "波浪/波浪形": set alternateMode="wave", alternateAmplitude=0.3-0.5
- "长短自适应/长句中短句两侧/根据歌词长度": set alternateMode="length-adaptive", alternateAmplitude=0.2-0.35
- "跳动/弹跳/活力": use bounce entrance, bounciness 0.6-0.9
- "玻璃/毛玻璃/半透明背景": set backgroundType="glass"
- "描边/边框字/厚描边": set strokeWidth 3-6, strokeColor="#000000"
- "发光/荧光/霓虹": set glowIntensity 0.5-0.9
- "优雅/古典/衬线": use serif fontFamily
- "现代/简约/无衬线": use sans-serif fontFamily
- "手写/手写体": use cursive fontFamily
- "粗体/Impact/抖音/tiktok": use Impact fontFamily, fontWeight 800-900
- "大字/醒目": fontSize 60-80
- "小字/低调": fontSize 28-38
- "深色阴影/厚重阴影": set textShadow=true, glowIntensity 0.3-0.5, add dark drop shadow
- "闪烁/闪烁放大/跳动高亮": set highlightWords to extract emotional keywords from the description, accentColor bright
- "鼓点/节拍/卡点": set bounciness high (0.8-1.0), use shorter entranceDuration (0.15-0.25)
- Color keywords: map to appropriate HEX (red→#FF4444, blue→#4FC3F7, gold→#FFD700, pink→#FF69B4, green→#4CAF50, purple→#9C27B0, white→#FFFFFF, black→#000000, orange→#FF9800, teal→#009688, cyan/青蓝→#00E5FF)`;

/**
 * 通过用户语言描述生成字幕模板
 */
export async function generateSubtitleTemplate(
  userDescription: string,
  currentStyle?: import("./types").StyleParams
): Promise<SubtitleTemplate> {
  const provider = detectProvider();

  if (!provider) {
    logger.warn("ai-service", "[Template] No AI API key, using default template");
    return getDefaultTemplate(userDescription, currentStyle);
  }

  try {
    const signal = AbortSignal.timeout(AI_TEMPLATE_TIMEOUT_MS);

    const userPrompt = `User wants subtitles that: "${userDescription}"
${currentStyle ? `\nCurrent style context: font=${currentStyle.fontFamily}, color=${currentStyle.primaryColor}, animation=${currentStyle.animation}` : ""}

Generate the subtitle template JSON that best matches this description.`;

    let raw: string;

    if (provider === "anthropic") {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": process.env.ANTHROPIC_API_KEY!,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: process.env.ANTHROPIC_MODEL || "claude-3-haiku-20240307",
          max_tokens: 800,
          system: TEMPLATE_SYSTEM_PROMPT,
          messages: [{ role: "user", content: userPrompt }],
        }),
        signal,
      });
      const data = await response.json();
      raw = data.content[0]?.text || "";
    } else {
      const config = getProviderConfig(provider);
      const body: Record<string, unknown> = {
        model: config.model,
        messages: [
          { role: "system", content: TEMPLATE_SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.6,
        max_tokens: 800,
      };
      if (config.supportsJsonMode) {
        body.response_format = { type: "json_object" };
      }

      const response = await fetch(config.apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify(body),
        signal,
      });
      const data = await response.json();
      raw = data.choices?.[0]?.message?.content || "";
    }

    const json = safeJsonParse(raw);
    const layout = (json.layout || {}) as Record<string, unknown>;
    const anim = (json.animation || {}) as Record<string, unknown>;
    const rend = (json.render || {}) as Record<string, unknown>;

    return {
      name: String(json.name || "Custom Template"),
      description: String(json.description || userDescription.slice(0, 100)),
      layout: {
        positionX: Number(layout.positionX ?? 0.5),
        positionY: Number(layout.positionY ?? 0.65),
        alternateMode: String(layout.alternateMode || "alternate") as SubtitleTemplate["layout"]["alternateMode"],
        alternateAmplitude: Number(layout.alternateAmplitude ?? 0.3),
        curvature: Number(layout.curvature ?? 0),
        maxWidthRatio: Number(layout.maxWidthRatio ?? 0.8),
        lineSpacing: Number(layout.lineSpacing ?? 1.4),
      },
      animation: {
        entrance: String(anim.entrance || "fade-in") as SubtitleTemplate["animation"]["entrance"],
        entranceDuration: Number(anim.entranceDuration ?? 0.3),
        exit: String(anim.exit || "fade-in") as SubtitleTemplate["animation"]["exit"],
        exitDuration: Number(anim.exitDuration ?? 0.2),
        bounciness: Number(anim.bounciness ?? 0.5),
        easing: String(anim.easing || "ease-out") as SubtitleTemplate["animation"]["easing"],
      },
      render: {
        fontFamily: String(rend.fontFamily || "Inter, sans-serif"),
        fontSize: Number(rend.fontSize || 48),
        fontWeight: Number(rend.fontWeight || 600),
        primaryColor: String(rend.primaryColor || "#FFFFFF"),
        secondaryColor: String(rend.secondaryColor || "#4FC3F7"),
        accentColor: String(rend.accentColor || "#00E5FF"),
        textShadow: Boolean(rend.textShadow ?? true),
        glowColor: String(rend.glowColor || "#4FC3F7"),
        glowIntensity: Number(rend.glowIntensity ?? 0.5),
        strokeWidth: Number(rend.strokeWidth ?? 0),
        strokeColor: String(rend.strokeColor || "#000000"),
        backgroundType: String(rend.backgroundType || "none") as SubtitleTemplate["render"]["backgroundType"],
        backgroundColor: String(rend.backgroundColor || "rgba(0,0,0,0.5)"),
        paddingX: Number(rend.paddingX ?? 20),
        paddingY: Number(rend.paddingY ?? 10),
        borderRadius: Number(rend.borderRadius ?? 8),
      },
    };
  } catch (error) {
    logger.error("ai-service", "[Template] Generation failed:", error);
    return getDefaultTemplate(userDescription, currentStyle);
  }
}

/**
 * 基于关键词的 fallback 模板生成
 */
function getDefaultTemplate(
  description: string,
  currentStyle?: import("./types").StyleParams
): SubtitleTemplate {
  const lower = description.toLowerCase();

  // Detect curvature
  let curvature = 0;
  if (lower.includes("弧") || lower.includes("弯曲") || lower.includes("拱")) {
    curvature = lower.includes("下弧") || lower.includes("向下") ? -0.15 : 0.15;
  }

  // Detect position
  let positionX = 0.5;
  let positionY = 0.65;
  if (lower.includes("左上")) { positionX = 0.15; positionY = 0.2; }
  else if (lower.includes("右上")) { positionX = 0.85; positionY = 0.2; }
  else if (lower.includes("左下")) { positionX = 0.15; positionY = 0.85; }
  else if (lower.includes("右下")) { positionX = 0.85; positionY = 0.85; }
  else if (lower.includes("顶部") || lower.includes("上方")) { positionY = 0.15; }
  else if (lower.includes("底部") || lower.includes("下方")) { positionY = 0.85; }
  else if (lower.includes("居中") || lower.includes("中间")) { positionY = 0.5; }

  // Detect alternate mode
  let alternateMode: "none" | "alternate" | "random" | "wave" | "length-adaptive" = "alternate";
  let alternateAmplitude = 0.3;
  if (lower.includes("波浪") || lower.includes("wave")) {
    alternateMode = "wave";
    alternateAmplitude = 0.4;
  } else if (lower.includes("长短自适应") || lower.includes("根据长度") || lower.includes("长句中") || lower.includes("短句两侧") || lower.includes("length-adaptive")) {
    alternateMode = "length-adaptive";
    alternateAmplitude = 0.28;
  } else if (lower.includes("固定") || lower.includes("不变")) {
    alternateMode = "none";
    alternateAmplitude = 0;
  } else if (lower.includes("随机")) {
    alternateMode = "random";
  }

  // Detect animation
  let entrance: import("./types").AnimationType = "fade-in";
  let bounciness = 0.5;
  if (lower.includes("跳") || lower.includes("弹") || lower.includes("bounce")) {
    entrance = "bounce";
    bounciness = 0.7;
  } else if (lower.includes("卡拉") || lower.includes("karaoke")) {
    entrance = "karaoke";
  } else if (lower.includes("打字") || lower.includes("typewriter")) {
    entrance = "typewriter";
  } else if (lower.includes("放大") || lower.includes("scale")) {
    entrance = "scale-up";
  } else if (lower.includes("滑入") || lower.includes("slide")) {
    entrance = "slide-up";
  } else if (lower.includes("pop") || lower.includes("动态排版") || lower.includes("kinetic") || lower.includes("卡点") || lower.includes("抖音") || lower.includes("tiktok")) {
    entrance = "kinetic-pop";
    bounciness = 0.8;
  }

  // Detect background
  let backgroundType: "none" | "solid" | "gradient" | "glass" = "none";
  if (lower.includes("玻璃") || lower.includes("毛玻璃") || lower.includes("glass")) {
    backgroundType = "glass";
  } else if (lower.includes("背景") || lower.includes("底色") || lower.includes("solid")) {
    backgroundType = "solid";
  } else if (lower.includes("渐变") || lower.includes("gradient")) {
    backgroundType = "gradient";
  }

  // Detect glow
  let glowIntensity = 0.3;
  if (lower.includes("发光") || lower.includes("荧光") || lower.includes("霓虹") || lower.includes("glow")) {
    glowIntensity = 0.7;
  }

  // Detect stroke
  let strokeWidth = 0;
  if (lower.includes("描边") || lower.includes("边框字") || lower.includes("stroke")) {
    strokeWidth = 3;
  }

  // Detect colors
  let primaryColor = currentStyle?.primaryColor || "#FFFFFF";
  let secondaryColor = currentStyle?.secondaryColor || "#38BDF8";
  let accentColor = currentStyle?.accentColor || "#00E5FF";
  if (lower.includes("粉色") || lower.includes("pink")) {
    primaryColor = "#FF69B4";
    secondaryColor = "#FF1493";
  } else if (lower.includes("红色") || lower.includes("red")) {
    primaryColor = "#FF4444";
    secondaryColor = "#CC0000";
  } else if (lower.includes("绿色") || lower.includes("green")) {
    primaryColor = "#4CAF50";
    secondaryColor = "#2E7D32";
  } else if (lower.includes("紫色") || lower.includes("purple")) {
    primaryColor = "#9C27B0";
    secondaryColor = "#6A1B9A";
  }

  // Detect font
  let fontFamily = currentStyle?.fontFamily || "'Inter', sans-serif";
  if (lower.includes("衬线") || lower.includes("serif") || lower.includes("优雅") || lower.includes("古典")) {
    fontFamily = "'Georgia', 'Noto Serif SC', serif";
  } else if (lower.includes("手写") || lower.includes("cursive")) {
    fontFamily = "'Caveat', 'Kalam', cursive";
  } else if (lower.includes("impact") || lower.includes("粗体") || lower.includes("抖音") || lower.includes("tiktok") || lower.includes("kinetic")) {
    fontFamily = "'Impact', 'Montserrat', 'Arial Black', 'Noto Sans SC', sans-serif";
  }

  // Detect font size
  let fontSize = currentStyle?.fontSize || 48;
  if (lower.includes("大字") || lower.includes("醒目") || lower.includes("大号")) {
    fontSize = 64;
  } else if (lower.includes("小字") || lower.includes("低调")) {
    fontSize = 34;
  }

  const isKinetic = entrance === "kinetic-pop";
  const allCaps = isKinetic || lower.includes("大写") || lower.includes("all caps");
  const defaultHighlightWords = isKinetic
    ? ["baby", "love", "never", "dance", "shine", "fire", "night", "light", "sky", "lord", "heart"]
    : undefined;

  return {
    name: isKinetic ? "Kinetic Pop" : "Custom",
    description: description.slice(0, 100),
    layout: {
      positionX,
      positionY: isKinetic ? 0.55 : positionY,
      alternateMode,
      alternateAmplitude: isKinetic ? 0.22 : alternateAmplitude,
      curvature,
      maxWidthRatio: isKinetic ? 0.88 : 0.8,
      lineSpacing: isKinetic ? 1.2 : 1.4,
    },
    animation: {
      entrance,
      entranceDuration: isKinetic ? 0.30 : 0.3,
      exit: "fade-in",
      exitDuration: isKinetic ? 0.12 : 0.2,
      bounciness,
      easing: entrance === "bounce" || isKinetic ? "ease-out" : "ease",
    },
    render: {
      fontFamily,
      fontSize: isKinetic ? 64 : fontSize,
      fontWeight: isKinetic ? 900 : (currentStyle?.fontWeight || 600),
      primaryColor,
      secondaryColor,
      accentColor,
      textShadow: currentStyle?.textShadow ?? true,
      glowColor: secondaryColor,
      glowIntensity,
      strokeWidth: isKinetic ? 5 : strokeWidth,
      strokeColor: "#000000",
      backgroundType,
      backgroundColor: "rgba(0,0,0,0.5)",
      paddingX: 20,
      paddingY: 10,
      borderRadius: backgroundType !== "none" ? 12 : 0,
      allCaps,
      highlightWords: defaultHighlightWords,
    },
  };
}

// ============================================================
// 动画底片场景生成 — 用户自然语言 → SceneAnimSpec
// ============================================================

import type { SceneAnimSpec } from "./animation-types";
import { SCENE_PRESETS, matchSceneByKeywords } from "./animation-types";

const SCENE_SYSTEM_PROMPT = `You are a visual effects designer for music videos. Convert the user's natural language description of a desired animated background into a precise JSON specification for a particle-based animation loop.

The animation runs on a 1920×1080 canvas as a seamless looping background (like a music visualizer backdrop).

Output ONLY valid JSON with this exact structure:
{
  "name": "short scene name",
  "description": "one-line summary",
  "background": {
    "type": "linear|radial|conic",
    "angle": 180,
    "centerX": 0.5,
    "centerY": 0.5,
    "stops": [
      { "color": "#HEX", "position": 0 },
      { "color": "#HEX", "position": 1 }
    ],
    "animationSpeed": 0.2
  },
  "particles": {
    "count": 60,
    "shape": "circle|star|heart|diamond|cross|ring|sparkle",
    "minSize": 2,
    "maxSize": 20,
    "colors": ["#HEX"],
    "minOpacity": 0.1,
    "maxOpacity": 0.8,
    "motion": "float-up|float-random|fall-down|pulse|orbit|spiral|zigzag",
    "speed": 0.3,
    "twinkle": 0.3,
    "lifespan": 180,
    "glow": false,
    "glowColor": "#HEX",
    "glowIntensity": 0.3
  },
  "pattern": {
    "type": "none|stars|grid|dots|waves|hexagon|noise|stripes",
    "color": "rgba(r,g,b,a)",
    "opacity": 0.3,
    "scale": 1,
    "animationSpeed": 0
  },
  "loopFrames": 180,
  "colorOverlay": "optional CSS filter string"
}

Interpretation guidelines:
- 海底/海洋/水: deep blue gradient (angle=180), circle particles floating up, blue/teal/white colors, bubbles
- 星空/宇宙/银河: dark purple/black radial gradient, sparkle/star particles orbiting, gold/white colors, high twinkle
- 樱花/花瓣/春天: pink/peach gradient, heart-shaped particles zigzag falling, pink/white colors
- 霓虹/赛博/科技: dark gradient, diamond particles pulsing, neon colors (cyan/magenta/yellow), glow=true, grid pattern
- 日落/夕阳/黄昏: warm orange-to-purple gradient, ring particles floating up, gold/orange colors
- 雨/下雨: dark blue-gray gradient, cross/line particles falling down fast, light blue/white colors
- 派对/迪斯科/disco: conic gradient with fast animation, star particles spiral, bright multicolor, high twinkle
- 极光/aurora: dark teal gradient, sparkle particles random float, green/white colors, wave pattern, high glow
- 梦幻/童话/fairy: soft pastel gradient, heart+sparkle mix, slow float, pink/purple/gold colors
- 火焰/燃烧/fire: warm red-orange gradient, diamond particles float-up, red/orange/yellow colors, glow=true
- 冰雪/冬天/winter: cool blue-white gradient, circle/cross particles fall-down, white/light-blue colors
- 森林/自然/forest: green gradient, circle/leaf shapes float-random, green/brown colors`;

/**
 * 通过自然语言生成动画底片场景
 */
export async function generateAnimationScene(
  description: string
): Promise<SceneAnimSpec> {
  const provider = detectProvider();

  if (!provider) {
    logger.info("ai-service", "[Scene] No AI API key, using keyword-based fallback");
    return getSceneByKeywords(description);
  }

  try {
    const signal = AbortSignal.timeout(AI_TEMPLATE_TIMEOUT_MS);

    const userPrompt = `User wants an animated background that: "${description}"

Generate the scene animation JSON that best matches this description. Choose appropriate colors, particles, and motion patterns.`;

    let raw: string;

    if (provider === "anthropic") {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": process.env.ANTHROPIC_API_KEY!,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: process.env.ANTHROPIC_MODEL || "claude-3-haiku-20240307",
          max_tokens: 800,
          system: SCENE_SYSTEM_PROMPT,
          messages: [{ role: "user", content: userPrompt }],
        }),
        signal,
      });
      const data = await response.json();
      raw = data.content[0]?.text || "";
    } else {
      const config = getProviderConfig(provider);
      const body: Record<string, unknown> = {
        model: config.model,
        messages: [
          { role: "system", content: SCENE_SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 800,
      };
      if (config.supportsJsonMode) {
        body.response_format = { type: "json_object" };
      }

      const response = await fetch(config.apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify(body),
        signal,
      });
      const data = await response.json();
      raw = data.choices?.[0]?.message?.content || "";
    }

    const json = safeJsonParse(raw);
    return parseSceneSpec(json, description);
  } catch (error) {
    logger.error("ai-service", "[Scene] Generation failed, using fallback:", error);
    return getSceneByKeywords(description);
  }
}

/**
 * 基于关键词匹配预设场景（AI 不可用时的 fallback）
 */
function getSceneByKeywords(description: string): SceneAnimSpec {
  const sceneKey = matchSceneByKeywords(description);
  return SCENE_PRESETS[sceneKey] || SCENE_PRESETS["ocean-bubbles"];
}

/**
 * 解析 AI 返回的 JSON → SceneAnimSpec
 */
function parseSceneSpec(json: Record<string, unknown>, description: string): SceneAnimSpec {
  const bg = (json.background || {}) as Record<string, unknown>;
  const pts = (json.particles || {}) as Record<string, unknown>;
  const pat = (json.pattern || {}) as Record<string, unknown>;

  const stopsRaw = Array.isArray(bg.stops) ? bg.stops : [{ color: "#0a1628", position: 0 }, { color: "#0f3460", position: 1 }];

  return {
    name: String(json.name || "AI Generated"),
    description: String(json.description || description.slice(0, 100)),
    background: {
      type: (String(bg.type || "linear")) as "linear" | "radial" | "conic",
      angle: typeof bg.angle === "number" ? bg.angle : undefined,
      centerX: typeof bg.centerX === "number" ? bg.centerX : undefined,
      centerY: typeof bg.centerY === "number" ? bg.centerY : undefined,
      stops: stopsRaw.map((s: unknown) => {
        const stop = s as Record<string, unknown>;
        return {
          color: String(stop.color || "#000000"),
          position: Number(stop.position ?? 0),
        };
      }),
      animationSpeed: typeof bg.animationSpeed === "number" ? bg.animationSpeed : 0,
    },
    particles: pts && Object.keys(pts).length > 0 ? {
      count: Math.min(300, Number(pts.count ?? 60)),
      shape: String(pts.shape || "circle") as NonNullable<SceneAnimSpec["particles"]>["shape"],
      minSize: Number(pts.minSize ?? 4),
      maxSize: Number(pts.maxSize ?? 20),
      colors: Array.isArray(pts.colors) ? pts.colors.map(String) : ["#FFFFFF", "#87CEEB"],
      minOpacity: Number(pts.minOpacity ?? 0.1),
      maxOpacity: Number(pts.maxOpacity ?? 0.6),
      motion: String(pts.motion || "float-up") as NonNullable<SceneAnimSpec["particles"]>["motion"],
      speed: Number(pts.speed ?? 0.3),
      twinkle: Number(pts.twinkle ?? 0.3),
      lifespan: Number(pts.lifespan ?? 180),
      glow: Boolean(pts.glow ?? false),
      glowColor: pts.glowColor ? String(pts.glowColor) : undefined,
      glowIntensity: typeof pts.glowIntensity === "number" ? pts.glowIntensity : undefined,
    } : undefined,
    pattern: pat && String(pat.type || "none") !== "none" ? {
      type: String(pat.type || "none") as NonNullable<SceneAnimSpec["pattern"]>["type"],
      color: String(pat.color || "rgba(255,255,255,0.05)"),
      opacity: Number(pat.opacity ?? 0.3),
      scale: Number(pat.scale ?? 1),
      animationSpeed: typeof pat.animationSpeed === "number" ? pat.animationSpeed : 0,
    } : undefined,
    loopFrames: Number(json.loopFrames || 180),
    colorOverlay: json.colorOverlay ? String(json.colorOverlay) : undefined,
  };
}
