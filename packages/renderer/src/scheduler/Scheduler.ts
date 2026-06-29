import type { Clock } from './Clock';
import type { Transport } from './Transport';
import type { Beats, ClipSource, ScheduleHandler, Seconds } from './types';

export interface SchedulerOptions {
  /**
   * How far ahead (seconds) to queue events each tick. Bigger = more robust to
   * timer jitter / GC pauses, at the cost of edits taking up to this long to
   * take effect. NOT start latency — the first events on `start()` are queued
   * for "now". Default 0.1s.
   */
  lookahead?: Seconds;
  /** Timer period (ms) between scheduling passes. Default 25ms. */
  intervalMs?: number;
}

/**
 * A lookahead scheduler (the "two clocks" pattern): a coarse timer decides
 * *what* to play in the near future, and each event is handed to the host with
 * a precise audio time, so timer jitter never affects playback timing.
 *
 * It owns no audio. The host registers `ClipSource`s and an `onSchedule`
 * handler, and maps fired events onto its own players. Because clips are read
 * live each tick, editing them during playback is free — there is nothing to
 * reschedule.
 *
 * Looping is handled at two levels and composes: the {@link Transport} loop
 * region (segments) and each clip's own `loop`/`lengthBeats`.
 */
export class Scheduler<T = unknown> {
  // Beat tolerance for boundary comparisons. Far below audible (1e-9 beat ≈ a
  // few nanoseconds at any sane tempo) but well above float64 rounding error
  // accumulated in the beat math, so loop-boundary events are never dropped.
  private static readonly EPSILON: Beats = 1e-9;

  private readonly lookahead: Seconds;
  private readonly intervalMs: number;
  private readonly sources = new Set<ClipSource<T>>();

  private handler?: ScheduleHandler<T>;
  private cancelTimer?: () => void;
  // Raw beat up to which we've already scheduled (monotonic, exclusive).
  private scheduledUntil: Beats = 0;

  constructor(
    private readonly clock: Clock,
    private readonly transport: Transport,
    options: SchedulerOptions = {},
  ) {
    this.lookahead = options.lookahead ?? 0.1;
    this.intervalMs = options.intervalMs ?? 25;
  }

  /** Register a clip to be scheduled. Safe to call during playback. */
  add(source: ClipSource<T>): void {
    this.sources.add(source);
  }

  remove(source: ClipSource<T>): void {
    this.sources.delete(source);
  }

  /** Set the callback fired for every scheduled event. */
  onSchedule(handler: ScheduleHandler<T>): void {
    this.handler = handler;
  }

  get running(): boolean {
    return this.cancelTimer !== undefined;
  }

  /**
   * Start playback at musical beat `atBeat`. The first scheduling pass runs
   * synchronously, so events at `atBeat` are queued for "now" and sound
   * immediately (only the audio device's output latency applies).
   */
  start(atBeat: Beats = 0, atTime?: Seconds): void {
    if (this.cancelTimer) this.cancelTimer();
    this.transport.start(atBeat, atTime);
    this.scheduledUntil = atBeat;
    this.tick();
    this.cancelTimer = this.clock.every(this.intervalMs, () => this.tick());
  }

  /** Stop playback and the timer. No work happens while stopped. */
  stop(): void {
    if (this.cancelTimer) {
      this.cancelTimer();
      this.cancelTimer = undefined;
    }
    this.transport.stop();
  }

  private tick(): void {
    const horizonRaw = this.transport.rawBeatAt(
      this.clock.now + this.lookahead,
    );
    const from = this.scheduledUntil;
    if (horizonRaw <= from) return;

    for (const segment of this.transport.segments(from, horizonRaw)) {
      for (const source of this.sources) {
        this.scheduleSegment(
          source,
          segment.musicalFrom,
          segment.musicalTo,
          segment.rawFrom,
        );
      }
    }
    this.scheduledUntil = horizonRaw;
  }

  /**
   * Schedule one clip across a single linear musical segment, wrapping the
   * clip's own loop as needed. `rawFrom` maps musical beats back to audio time:
   * a musical beat `m` in this segment is raw beat `rawFrom + (m - musicalFrom)`.
   */
  private scheduleSegment(
    source: ClipSource<T>,
    musicalFrom: Beats,
    musicalTo: Beats,
    rawFrom: Beats,
  ): void {
    const emit = (musicalBeat: Beats, event: ScheduledEventOf<T>) => {
      const rawBeat = rawFrom + (musicalBeat - musicalFrom);
      this.handler?.(event, this.transport.timeAt(rawBeat), source);
    };

    const EPS = Scheduler.EPSILON;
    if (source.loop && source.lengthBeats > 0) {
      const length = source.lengthBeats;
      let musical = musicalFrom;
      while (musical < musicalTo - EPS) {
        let local = musical % length;
        // Float math accumulates ~1e-12 error over long runs, so `local` can
        // come back as a tiny positive instead of a clean 0 at the loop start —
        // which would drop the event sitting exactly on beat 0. Snap it.
        if (local < EPS) {
          local = 0;
        } else if (local > length - EPS) {
          // Effectively at the boundary from the other side: skip the sliver to
          // the next loop start rather than emit a zero-width chunk.
          musical += length - local;
          continue;
        }
        const chunk = Math.min(musicalTo - musical, length - local);
        for (const event of source.query(local, local + chunk)) {
          emit(musical + (event.beat - local), event);
        }
        musical += chunk;
      }
    } else {
      for (const event of source.query(musicalFrom, musicalTo)) {
        // Inclusive lower bound (with tolerance) so an event exactly on the
        // window/segment start is never lost to rounding.
        if (event.beat >= musicalFrom - EPS && event.beat < musicalTo) {
          emit(event.beat, event);
        }
      }
    }
  }
}

// Local alias to keep the emit signature readable without re-importing.
type ScheduledEventOf<T> = Parameters<ScheduleHandler<T>>[0];
