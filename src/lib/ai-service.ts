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

function detectProvider(): AIProvider | null {
  if (process.env.ANTHROPIC_API_KEY) return "anthropic";
  if (process.env.DEEPSEEK_API_KEY) return "deepseek";
  if (process.env.OPENAI_API_KEY) return "openai";
  return null;
}

function getProviderConfig(provider: AIProvider) {
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
        supportsJsonMode: true, // DeepSeek supports response_format json_object
      };
    case "anthropic":
      return {
        apiUrl: "https://api.anthropic.com/v1/messages",
        apiKey: process.env.ANTHROPIC_API_KEY!,
        model: "claude-3-haiku-20240307",
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
  const provider = detectProvider();

  if (!provider) {
    logger.warn("ai-service", "No AI API key found (OPENAI_API_KEY, ANTHROPIC_API_KEY, or DEEPSEEK_API_KEY), using default analysis");
    return getDefaultAnalysis(lyrics);
  }

  const lyricsText = lyrics.map((l) => l.text).join("\n");

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), AI_ANALYSIS_TIMEOUT_MS);

    let result: AnalysisResult;

    if (provider === "anthropic") {
      result = await callAnthropic(lyricsText, controller.signal);
    } else {
      // Both OpenAI and DeepSeek use OpenAI-compatible API
      result = await callOpenAICompat(lyricsText, controller.signal, provider);
    }

    clearTimeout(timeout);
    return result;
  } catch (error) {
    logger.error("ai-service", "AI analysis failed:", error);
    return getDefaultAnalysis(lyrics);
  }
}

async function callOpenAICompat(
  lyricsText: string,
  signal: AbortSignal,
  provider: "openai" | "deepseek"
): Promise<AnalysisResult> {
  const config = getProviderConfig(provider);

  const body: Record<string, unknown> = {
    model: config.model,
    messages: [
      { role: "system", content: ANALYSIS_SYSTEM_PROMPT },
      { role: "user", content: ANALYSIS_USER_PROMPT(lyricsText) },
    ],
    temperature: 0.7,
    max_tokens: 800,
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

/** A safe JSON parse that returns a meaningful error instead of throwing */
function safeJsonParse(raw: string): Record<string, unknown> {
  // First attempt: clean markdown fences and parse
  const cleaned = raw.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    // Second attempt: extract JSON object from text
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) {
      throw new Error("Could not find JSON object in AI response");
    }
    try {
      return JSON.parse(match[0]);
    } catch (innerError) {
      throw new Error(`Failed to parse AI response as JSON: ${(innerError as Error).message}`);
    }
  }
}

function parseAnalysisResponse(raw: string | undefined): AnalysisResult {
  if (!raw) throw new Error("Empty response from AI");

  const json = safeJsonParse(raw);
  const emotionsRaw = Array.isArray(json.emotions) ? json.emotions : [];
  const themeRaw = Array.isArray(json.theme) ? json.theme : Array.isArray(json.themes) ? json.themes : ["personal"];
  const paletteRaw = Array.isArray(json.suggestedPalette) ? json.suggestedPalette
    : Array.isArray(json.color_palette) ? json.color_palette
    : ["#FFFFFF", "#E0E0E0", "#FF6B6B"];

  return {
    emotions: emotionsRaw.map((e: unknown) => {
      const item = e as Record<string, unknown>;
      return {
        label: String(item.label || item.emotion || "calmness"),
        intensity: typeof item.intensity === "number" ? item.intensity : 0.5,
      };
    }),
    theme: themeRaw.map(String),
    tempo: (String(json.tempo || json.tempo_feel || "medium")) as "slow" | "medium" | "fast",
    suggestedPalette: paletteRaw.map(String),
    suggestedFontStyle: String(json.suggestedFontStyle || json.font_style || "sans-serif"),
    stylePrompt: String(json.stylePrompt || json.style_prompt || "Clean modern typography."),
  };
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
    const controller = new AbortController();
    setTimeout(() => controller.abort(), AI_STYLE_PARSE_TIMEOUT_MS);

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
        signal: controller.signal,
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
    const controller = new AbortController();
    setTimeout(() => controller.abort(), AI_TEMPLATE_TIMEOUT_MS);

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
          model: "claude-3-haiku-20240307",
          max_tokens: 800,
          system: TEMPLATE_SYSTEM_PROMPT,
          messages: [{ role: "user", content: userPrompt }],
        }),
        signal: controller.signal,
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
        signal: controller.signal,
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
