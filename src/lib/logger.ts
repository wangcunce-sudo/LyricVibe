/**
 * Simple conditional logger for LyricVibe.
 *
 * In production (NODE_ENV=production), all debug/info logs are suppressed.
 * Errors and warnings always pass through.
 *
 * Usage:
 *   import { logger } from "@/lib/logger";
 *   logger.info("[render]", "Starting render...");
 *   logger.warn("[render]", "Video URL is blob, attempting re-upload...");
 *   logger.error("[render]", "Render failed:", error);
 */

type LogLevel = "debug" | "info" | "warn" | "error";

const isProduction = process.env.NODE_ENV === "production";

function shouldLog(level: LogLevel): boolean {
  if (level === "error" || level === "warn") return true;
  return !isProduction;
}

function formatMessage(prefix: string, args: unknown[]): string {
  return `[${prefix}] ${args.map((a) => (typeof a === "string" ? a : JSON.stringify(a))).join(" ")}`;
}

export const logger = {
  debug(prefix: string, ...args: unknown[]) {
    if (shouldLog("debug")) console.debug(formatMessage(prefix, args));
  },
  info(prefix: string, ...args: unknown[]) {
    if (shouldLog("info")) console.log(formatMessage(prefix, args));
  },
  warn(prefix: string, ...args: unknown[]) {
    if (shouldLog("warn")) console.warn(formatMessage(prefix, args));
  },
  error(prefix: string, ...args: unknown[]) {
    if (shouldLog("error")) console.error(formatMessage(prefix, args));
  },
};
