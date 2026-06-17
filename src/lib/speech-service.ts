/**
 * Browser-side Web Speech API — Speech Recognition for lyrics transcription.
 * Uses SpeechRecognition / webkitSpeechRecognition to capture audio
 * and transcribe it into time-aligned LyricLine[] segments.
 *
 * IMPORTANT:
 * - Works only in Chromium-based browsers (Chrome, Edge, Arc, Brave).
 * - Requires user gesture (click) to start (browser policy).
 * - Some browsers require HTTPS or localhost.
 * - Best for English lyrics; accuracy varies by browser and audio quality.
 * - Continuous mode streams interim results for real-time display.
 */

import type { LyricLine } from "./types";

// ── Browser API type declarations ─────────────────────────

interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionResultList {
  length: number;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  length: number;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognition;
    webkitSpeechRecognition?: new () => SpeechRecognition;
  }
}

// ── Recognition state ─────────────────────────────────────

export type RecognitionStatus =
  | "idle"
  | "listening"
  | "processing"
  | "error"
  | "stopped";

export interface RecognitionCallbacks {
  /** Called with each interim (partial) transcript */
  onInterimResult?: (text: string) => void;
  /** Called when a final transcript segment is recognized */
  onFinalResult?: (text: string, confidence: number, index: number) => void;
  /** Called when recognition completes with all accumulated segments */
  onComplete?: (lyrics: LyricLine[], fullText: string) => void;
  /** Called on error */
  onError?: (error: string) => void;
  /** Called when status changes */
  onStatusChange?: (status: RecognitionStatus) => void;
}

// ── Service class ─────────────────────────────────────────

class SpeechService {
  private recognition: SpeechRecognition | null = null;
  private _status: RecognitionStatus = "idle";
  private segments: LyricLine[] = [];
  private fullTranscript = "";
  private callbacks: RecognitionCallbacks = {};
  private startTime = 0;
  private lastResultTime = 0;
  private segmentIndex = 0;

  get status(): RecognitionStatus {
    return this._status;
  }

  /** Check if browser supports SpeechRecognition */
  static isSupported(): boolean {
    return !!(
      typeof window !== "undefined" &&
      (window.SpeechRecognition || window.webkitSpeechRecognition)
    );
  }

  /** Set callbacks */
  setCallbacks(cbs: RecognitionCallbacks): void {
    this.callbacks = cbs;
  }

  /** Start recognition. Must be called from a user gesture handler. */
  start(lang = "en-US"): void {
    if (!SpeechService.isSupported()) {
      this.callbacks.onError?.(
        "Speech recognition is not supported in this browser. Please use Chrome, Edge, or Arc."
      );
      return;
    }

    // Reset state
    this.segments = [];
    this.fullTranscript = "";
    this.segmentIndex = 0;
    this.startTime = Date.now();
    this.lastResultTime = Date.now();

    // Create recognition instance
    const SpeechRecognitionCtor =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognitionCtor) return;

    this.recognition = new SpeechRecognitionCtor();
    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.lang = lang;
    this.recognition.maxAlternatives = 3;

    this.recognition.onstart = () => {
      this._status = "listening";
      this.startTime = Date.now();
      this.callbacks.onStatusChange?.("listening");
    };

    this.recognition.onresult = (event: SpeechRecognitionEvent) => {
      this._status = "processing";
      let interim = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const transcript = result[0]?.transcript || "";
        const confidence = result[0]?.confidence || 0;

        if (result.isFinal) {
          // Final result — create a time segment
          const now = Date.now();
          const endTime = (now - this.startTime) / 1000;
          const startTime =
            this.segments.length > 0
              ? this.segments[this.segments.length - 1].endTime
              : 0;

          this.fullTranscript += (this.fullTranscript ? " " : "") + transcript;

          // Split into lines by natural pauses (periods, commas, or just word grouping)
          const lines = this.splitIntoLines(transcript);

          for (const line of lines) {
            if (line.trim()) {
              const lineStart =
                startTime +
                (this.segments.length > 0
                  ? this.segments[this.segments.length - 1].endTime - startTime
                  : 0);
              this.segments.push({
                index: this.segmentIndex++,
                text: line.trim(),
                startTime: lineStart,
                endTime: lineStart + 3, // default 3s per line, will be recalculated
                confidence,
              });
            }
          }

          this.lastResultTime = now;
          this.callbacks.onFinalResult?.(
            transcript,
            confidence,
            this.segmentIndex - 1
          );
        } else {
          interim += transcript;
        }
      }

      if (interim) {
        this.callbacks.onInterimResult?.(interim);
      }
    };

    this.recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error("Speech recognition error:", event.error, event.message);
      this._status = "error";
      this.callbacks.onStatusChange?.("error");

      // "no-speech" and "aborted" are non-fatal — user can retry
      if (event.error === "no-speech") {
        this.callbacks.onError?.("No speech detected. Please try again.");
      } else if (event.error === "aborted") {
        // Normal stop
      } else if (event.error === "not-allowed") {
        this.callbacks.onError?.(
          "Microphone access denied. Please allow microphone access in your browser settings."
        );
      } else if (event.error === "network") {
        this.callbacks.onError?.(
          "Network error during speech recognition. Check your connection."
        );
      } else {
        this.callbacks.onError?.(`Speech recognition error: ${event.error}`);
      }
    };

    this.recognition.onend = () => {
      // Recalculate time distribution for all segments
      this.recalculateTimings();

      if (this._status === "listening" || this._status === "processing") {
        this._status = "stopped";
        this.callbacks.onStatusChange?.("stopped");
        this.callbacks.onComplete?.(this.segments, this.fullTranscript);
      }
    };

    this.recognition.start();
  }

  /** Stop recognition and finalize segments */
  stop(): void {
    if (this.recognition) {
      this.recognition.stop();
    }
  }

  /** Abort recognition immediately */
  abort(): void {
    if (this.recognition) {
      this.recognition.abort();
      this._status = "idle";
      this.callbacks.onStatusChange?.("idle");
    }
  }

  /** Split transcript into lyric lines at natural breakpoints */
  private splitIntoLines(text: string): string[] {
    // Split on sentence-ending punctuation or natural pauses
    const sentences = text
      .split(/(?<=[.!?,;])\s+/)
      .filter(Boolean)
      .flatMap((s) => {
        // If sentence is too long, split further
        const words = s.trim().split(/\s+/);
        if (words.length > 10) {
          const chunks: string[] = [];
          for (let i = 0; i < words.length; i += 8) {
            chunks.push(words.slice(i, i + 8).join(" "));
          }
          return chunks;
        }
        return [s.trim()];
      });

    return sentences;
  }

  /** Distribute segment timings evenly across the audio duration */
  private recalculateTimings(): void {
    if (this.segments.length === 0) return;

    const totalDuration = (this.lastResultTime - this.startTime) / 1000;
    const avgDuration = totalDuration / this.segments.length;

    let currentTime = 0;
    for (const seg of this.segments) {
      seg.startTime = currentTime;
      seg.endTime = currentTime + avgDuration;
      currentTime = seg.endTime;
    }
  }

  /** Get accumulated lyrics */
  getLyrics(): LyricLine[] {
    return this.segments;
  }

  /** Get full transcript text */
  getFullText(): string {
    return this.fullTranscript;
  }
}

// Singleton instance
export const speechService = new SpeechService();
