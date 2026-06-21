/**
 * Structured logger for LyricVibe.
 *
 * Supports:
 *   - LOG_LEVEL env var (debug/info/warn/error) — default: info in dev, warn in prod
 *   - LOG_FORMAT env var ("json" | "text") — default: json in prod, text in dev
 *   - Request ID tracking via AsyncLocalStorage for distributed tracing
 *   - ISO 8601 timestamps
 *
 * Usage:
 *   import { logger } from "@/lib/logger";
 *   logger.info("render", "Starting render...");
 *   logger.warn("render", "Video URL is blob, attempting re-upload...");
 *   logger.error("render", "Render failed:", error);
 *
 *   // With request ID:
 *   import { withRequestId } from "@/lib/logger";
 *   const result = await withRequestId("req_123", () => doWork());
 */

type LogLevel = "debug" | "info" | "warn" | "error";

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const isProduction = process.env.NODE_ENV === "production";

function getMinLevel(): LogLevel {
  const env = process.env.LOG_LEVEL?.toLowerCase();
  if (env === "debug" || env === "info" || env === "warn" || env === "error") {
    return env;
  }
  return isProduction ? "warn" : "info";
}

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= LOG_LEVELS[getMinLevel()];
}

function useJsonFormat(): boolean {
  const env = process.env.LOG_FORMAT?.toLowerCase();
  if (env === "json") return true;
  if (env === "text") return false;
  return isProduction;
}

// ── AsyncLocalStorage for request ID tracking ──
// NOTE: Using eval("require") to bypass webpack static analysis during Remotion bundling,
// since webpack cannot handle "node:" scheme URIs and would fail with UnhandledSchemeError.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let AsyncLocalStorageClass: any = null;
if (typeof window === "undefined") {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const ah = eval("require")("node:async_hooks");
    AsyncLocalStorageClass = ah.AsyncLocalStorage;
  } catch {
    // Node.js environment but async_hooks unavailable (edge runtime, etc.)
  }
}

const requestIdStore: any = AsyncLocalStorageClass ? new AsyncLocalStorageClass() : null;

/**
 * Run a function with a request ID attached to all log calls within it.
 */
export async function withRequestId<T>(requestId: string, fn: () => Promise<T>): Promise<T> {
  if (requestIdStore) {
    return requestIdStore.run(requestId, fn);
  }
  return fn();
}

function getCurrentRequestId(): string | undefined {
  if (requestIdStore) {
    return requestIdStore.getStore() ?? undefined;
  }
  return undefined;
}

// ── Formatters ──

function formatText(level: LogLevel, prefix: string, message: string): string {
  const ts = new Date().toISOString();
  const rid = getCurrentRequestId();
  const ridPart = rid ? `[${rid}]` : "";
  return `${ts} ${level.toUpperCase()} ${ridPart}[${prefix}] ${message}`;
}

function formatJson(level: LogLevel, prefix: string, message: string): string {
  const entry: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
    level,
    prefix,
    message,
  };
  const rid = getCurrentRequestId();
  if (rid) entry.requestId = rid;
  return JSON.stringify(entry);
}

function logMessage(level: LogLevel, prefix: string, args: unknown[]): void {
  const message = args.map((a) => (typeof a === "string" ? a : JSON.stringify(a))).join(" ");

  if (useJsonFormat()) {
    const output = formatJson(level, prefix, message);
    switch (level) {
      case "debug": console.debug(output); break;
      case "info": console.log(output); break;
      case "warn": console.warn(output); break;
      case "error": console.error(output); break;
    }
  } else {
    const output = formatText(level, prefix, message);
    switch (level) {
      case "debug": console.debug(output); break;
      case "info": console.log(output); break;
      case "warn": console.warn(output); break;
      case "error": console.error(output); break;
    }
  }
}

export const logger = {
  debug(prefix: string, ...args: unknown[]) {
    if (shouldLog("debug")) logMessage("debug", prefix, args);
  },
  info(prefix: string, ...args: unknown[]) {
    if (shouldLog("info")) logMessage("info", prefix, args);
  },
  warn(prefix: string, ...args: unknown[]) {
    if (shouldLog("warn")) logMessage("warn", prefix, args);
  },
  error(prefix: string, ...args: unknown[]) {
    if (shouldLog("error")) logMessage("error", prefix, args);
  },
};
