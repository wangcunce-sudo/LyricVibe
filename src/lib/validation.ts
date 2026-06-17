/**
 * Zod validation schemas for LyricVibe API endpoints.
 *
 * Per ECC coding standards: validate all inputs at system boundaries.
 */
import { z } from "zod";

// ── Shared types ──

export const LyricLineSchema = z.object({
  index: z.number().int().min(0),
  text: z.string().min(1, "Lyric text cannot be empty"),
  startTime: z.number().min(0),
  endTime: z.number().min(0),
  confidence: z.number().min(0).max(1).optional(),
  alignment: z.enum(["left", "center", "right"]).optional(),
});

export const StyleParamsSchema = z.object({
  fontFamily: z.string().min(1),
  fontSize: z.number().int().min(12).max(200),
  primaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Invalid HEX color"),
  secondaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Invalid HEX color"),
  accentColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Invalid HEX color"),
  animation: z.enum([
    "none",
    "fade-in",
    "karaoke",
    "typewriter",
    "bounce",
    "scale-up",
    "slide-up",
    "kinetic-pop",
  ]),
  decoration: z.array(z.enum(["underline", "highlight", "border", "emoji", "none"])),
  fontWeight: z.number().int().min(100).max(900),
  textShadow: z.boolean(),
});

// ── API-specific schemas ──

/** POST /api/analyze */
export const AnalyzeRequestSchema = z.object({
  lyrics: z.array(LyricLineSchema).min(1, "At least one lyric line is required"),
  audioUrl: z.string().optional(),
  stylePrompt: z.string().optional(),
});

/** POST /api/template */
export const TemplateRequestSchema = z.object({
  description: z.string().min(1, "Description is required").max(500),
  currentStyle: StyleParamsSchema.optional(),
});

/** POST /api/transcribe (JSON mode) */
export const TranscribeRequestSchema = z.object({
  audioUrl: z.string().min(1, "audioUrl is required"),
  referenceLyrics: z.string().optional(),
});

/** POST /api/render */
export const RenderRequestSchema = z.object({
  videoUrl: z.string().optional(),
  audioUrl: z.string().optional(),
  /** When true, extract audio track from the video file instead of using a separate audio file */
  extractAudioFromVideo: z.boolean().optional(),
  lyrics: z.array(LyricLineSchema).min(1, "At least one lyric line is required"),
  styleParams: StyleParamsSchema.optional(),
  filter: z
    .enum(["original", "vintage", "film", "fresh", "bw", "warm", "cool", "faded"])
    .optional(),
  speed: z.number().min(0.5).max(2).optional(),
  pitch: z.number().int().min(-12).max(12).optional(),
  subtitleTemplate: z.unknown().optional(),
});

// ── Type exports ──

export type AnalyzeRequest = z.infer<typeof AnalyzeRequestSchema>;
export type TemplateRequest = z.infer<typeof TemplateRequestSchema>;
export type TranscribeRequest = z.infer<typeof TranscribeRequestSchema>;
export type RenderRequest = z.infer<typeof RenderRequestSchema>;
