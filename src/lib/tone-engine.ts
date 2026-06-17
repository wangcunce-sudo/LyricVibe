/**
 * Tone.js Audio Engine — handles audio playback with real-time
 * speed adjustment (time-stretch) and pitch shifting.
 *
 * Uses Tone.js for high-quality audio processing:
 * - Tone.Player for audio file playback
 * - Tone.PitchShift for real-time pitch shifting (±12 semitones)
 * - playbackRate for speed control (time-stretch, preserves pitch when pitch=0)
 *
 * Falls back to HTML5 <audio> element if Tone.js fails to initialize
 * (e.g., AudioContext not available).
 */

import * as Tone from "tone";

export type AudioEngineState = "idle" | "loading" | "ready" | "playing" | "paused" | "error";

export interface AudioEngineCallbacks {
  onTimeUpdate?: (time: number) => void;
  onEnded?: () => void;
  onStateChange?: (state: AudioEngineState) => void;
  onError?: (error: string) => void;
}

/**
 * Main audio engine using Tone.js.
 * Provides pitch shifting + time stretching with automatic fallback.
 */
export class ToneAudioEngine {
  private player: Tone.Player | null = null;
  private pitchShift: Tone.PitchShift | null = null;
  private _state: AudioEngineState = "idle";
  private _currentTime = 0;
  private _duration = 0;
  private _speed = 1;
  private _pitch = 0;
  private callbacks: AudioEngineCallbacks = {};
  private rafId: number | null = null;
  private fallbackAudio: HTMLAudioElement | null = null;
  private useFallback = false;

  get state() { return this._state; }
  get currentTime() { return this._currentTime; }
  get duration() { return this._duration; }
  get speed() { return this._speed; }
  get pitch() { return this._pitch; }

  setCallbacks(cbs: AudioEngineCallbacks) {
    this.callbacks = cbs;
  }

  /** Load an audio URL and prepare for playback */
  async load(url: string): Promise<void> {
    this._state = "loading";
    this.callbacks.onStateChange?.("loading");
    this.cleanup();

    try {
      // Start AudioContext (must be triggered by user gesture)
      await Tone.start();

      this.player = new Tone.Player({
        url,
        onload: () => {
          this._duration = this.player!.buffer.duration;
          this._state = "ready";
          this.callbacks.onStateChange?.("ready");
        },
        onerror: (err) => {
          console.warn("Tone.Player error, falling back to HTML5 audio:", err);
          this.useFallbackAudio(url);
        },
      }).toDestination();

      // PitchShift setup (initially 0 semitones = no change)
      this.pitchShift = new Tone.PitchShift({
        pitch: 0,
        windowSize: 0.1,
        delayTime: 0,
        feedback: 0,
      }).toDestination();

      // Connect: Player → PitchShift → Destination
      this.player.disconnect();
      this.player.connect(this.pitchShift);

      // Wait a bit for loading
      await new Promise<void>((resolve) => {
        const check = () => {
          if (this._state === "ready" || this._state === "error") {
            resolve();
          } else {
            setTimeout(check, 100);
          }
        };
        setTimeout(check, 100);
      });
    } catch (err) {
      console.warn("Tone.js init failed, falling back to HTML5 audio:", err);
      this.useFallbackAudio(url);
    }
  }

  /** Play audio from current position */
  play() {
    if (this.useFallback && this.fallbackAudio) {
      this.fallbackAudio.play().catch(() => {});
      this._state = "playing";
      this.callbacks.onStateChange?.("playing");
      return;
    }

    if (!this.player || this._state !== "ready" && this._state !== "paused") return;

    // Resume AudioContext if suspended
    if (Tone.getContext().state !== "running") {
      Tone.getContext().resume();
    }

    this.player.start(undefined, this._currentTime);
    this._state = "playing";
    this.callbacks.onStateChange?.("playing");

    // Start time update loop
    this.startTimeLoop();
  }

  /** Pause playback */
  pause() {
    if (this.useFallback && this.fallbackAudio) {
      this.fallbackAudio.pause();
      this._state = "paused";
      this.callbacks.onStateChange?.("paused");
      return;
    }

    if (!this.player) return;

    // Capture current position before stopping
    this._currentTime = (this.player.state === "started")
      ? this.player.immediate() as unknown as number || this._currentTime
      : this._currentTime;

    this.player.stop();
    this._state = "paused";
    this.callbacks.onStateChange?.("paused");
    this.stopTimeLoop();
  }

  /** Seek to a specific time in seconds */
  seek(time: number) {
    this._currentTime = Math.max(0, Math.min(time, this._duration));

    if (this.useFallback && this.fallbackAudio) {
      this.fallbackAudio.currentTime = this._currentTime;
      return;
    }

    // If playing, restart from new position
    if (this._state === "playing" && this.player) {
      this.player.stop();
      this.player.start(undefined, this._currentTime);
    }
  }

  /** Set playback speed (0.5 - 2.0) — time-stretch */
  setSpeed(speed: number) {
    this._speed = Math.max(0.5, Math.min(2, speed));

    if (this.useFallback && this.fallbackAudio) {
      this.fallbackAudio.playbackRate = this._speed;
      return;
    }

    if (this.player) {
      this.player.playbackRate = this._speed;
    }
  }

  /** Set pitch shift in semitones (-12 to +12) */
  setPitch(semitones: number) {
    this._pitch = Math.max(-12, Math.min(12, semitones));

    if (this.pitchShift) {
      this.pitchShift.pitch = this._pitch;
    }
    // Note: fallback audio doesn't support pitch shifting
  }

  /** Set volume (0-1) */
  setVolume(volume: number) {
    if (this.useFallback && this.fallbackAudio) {
      this.fallbackAudio.volume = volume;
      return;
    }

    if (this.player) {
      this.player.volume.value = Tone.gainToDb(volume);
    }
  }

  /** Clean up resources */
  dispose() {
    this.stopTimeLoop();
    if (this.player) {
      this.player.stop();
      this.player.dispose();
      this.player = null;
    }
    if (this.pitchShift) {
      this.pitchShift.dispose();
      this.pitchShift = null;
    }
    if (this.fallbackAudio) {
      this.fallbackAudio.pause();
      this.fallbackAudio.src = "";
      this.fallbackAudio = null;
    }
    this._state = "idle";
    this._currentTime = 0;
    this._duration = 0;
  }

  // ── Private methods ───────────────────────────

  private startTimeLoop() {
    this.stopTimeLoop();
    const loop = () => {
      if (this.useFallback && this.fallbackAudio) {
        this._currentTime = this.fallbackAudio.currentTime;
        this.callbacks.onTimeUpdate?.(this._currentTime);
        if (this.fallbackAudio.ended || this.fallbackAudio.paused) {
          if (this.fallbackAudio.ended) {
            this._state = "ready";
            this._currentTime = 0;
            this.callbacks.onEnded?.();
          }
          return;
        }
      } else if (this.player && this.player.state === "started") {
        // Tone.Player doesn't have a direct currentTime property during playback,
        // so we estimate based on elapsed time
        this._currentTime += 1 / 60; // ~60fps update
        this.callbacks.onTimeUpdate?.(this._currentTime);

        if (this._currentTime >= this._duration) {
          this._currentTime = 0;
          this._state = "ready";
          this.callbacks.onStateChange?.("ready");
          this.callbacks.onEnded?.();
          this.stopTimeLoop();
          return;
        }
      }

      this.rafId = requestAnimationFrame(loop);
    };
    this.rafId = requestAnimationFrame(loop);
  }

  private stopTimeLoop() {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  private cleanup() {
    this.stopTimeLoop();
    if (this.player) {
      this.player.stop();
      this.player.dispose();
      this.player = null;
    }
    if (this.pitchShift) {
      this.pitchShift.dispose();
      this.pitchShift = null;
    }
    if (this.fallbackAudio) {
      this.fallbackAudio.pause();
      this.fallbackAudio = null;
    }
    this.useFallback = false;
  }

  private useFallbackAudio(url: string) {
    this.useFallback = true;
    this._state = "ready";
    this.callbacks.onStateChange?.("ready");

    this.fallbackAudio = new Audio(url);
    this.fallbackAudio.preload = "auto";

    this.fallbackAudio.addEventListener("loadedmetadata", () => {
      this._duration = this.fallbackAudio!.duration;
    });

    this.fallbackAudio.addEventListener("timeupdate", () => {
      this._currentTime = this.fallbackAudio!.currentTime;
      this.callbacks.onTimeUpdate?.(this._currentTime);
    });

    this.fallbackAudio.addEventListener("ended", () => {
      this._state = "ready";
      this._currentTime = 0;
      this.callbacks.onStateChange?.("ready");
      this.callbacks.onEnded?.();
    });

    this.fallbackAudio.addEventListener("error", () => {
      this._state = "error";
      this.callbacks.onStateChange?.("error");
      this.callbacks.onError?.("Audio playback error");
    });
  }
}

// Singleton
export const toneEngine = new ToneAudioEngine();
