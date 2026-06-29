import type { Seconds } from './types';

/**
 * The scheduler's only dependency on the outside world: a monotonic time source
 * (`now`) plus a way to run a repeating callback. Abstracting it keeps the
 * scheduler testable with a deterministic fake clock, and lets the tick driver
 * be swapped (setInterval today, an AudioWorklet message pump later) without
 * touching scheduling logic.
 */
export interface Clock {
  /** Current time in seconds, on the audio time base. */
  readonly now: Seconds;
  /**
   * Run `callback` roughly every `intervalMs`. Returns a function that stops it.
   * Precision doesn't matter — the scheduler corrects for jitter by scheduling
   * audio events ahead of `now`.
   */
  every(intervalMs: number, callback: () => void): () => void;
}

/**
 * Real clock backed by a Web Audio context. Takes just the slice of the context
 * it needs (`currentTime`) so it isn't tied to a concrete AudioContext type.
 */
export class AudioContextClock implements Clock {
  constructor(private readonly context: { readonly currentTime: number }) {}

  get now(): Seconds {
    return this.context.currentTime;
  }

  every(intervalMs: number, callback: () => void): () => void {
    const id = setInterval(callback, intervalMs);
    return () => clearInterval(id);
  }
}

/**
 * Deterministic clock for tests: time only advances when you call `advance`,
 * which fires any due interval callbacks along the way. No timers, no audio.
 */
export class ManualClock implements Clock {
  private time: Seconds = 0;
  private nextId = 1;
  private readonly timers = new Map<
    number,
    { intervalMs: number; nextAt: Seconds; callback: () => void }
  >();

  get now(): Seconds {
    return this.time;
  }

  every(intervalMs: number, callback: () => void): () => void {
    const id = this.nextId++;
    this.timers.set(id, {
      intervalMs,
      nextAt: this.time + intervalMs / 1000,
      callback,
    });
    return () => this.timers.delete(id);
  }

  /**
   * Advance time by `seconds`, firing each interval callback once per interval
   * boundary crossed (in chronological order), with `now` set to the boundary
   * time as each fires — mirroring how real timers observe the clock.
   */
  advance(seconds: Seconds): void {
    const target = this.time + seconds;
    // Process boundaries in time order across all timers.
    for (;;) {
      let soonest: { id: number; at: Seconds } | undefined;
      for (const [id, timer] of this.timers) {
        if (timer.nextAt <= target && (!soonest || timer.nextAt < soonest.at)) {
          soonest = { id, at: timer.nextAt };
        }
      }
      if (!soonest) break;
      const timer = this.timers.get(soonest.id);
      if (!timer) continue;
      this.time = soonest.at;
      timer.nextAt += timer.intervalMs / 1000;
      timer.callback();
    }
    this.time = target;
  }
}
