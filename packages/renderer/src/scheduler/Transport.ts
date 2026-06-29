import type { Clock } from './Clock';
import type { Beats, Seconds } from './types';

/**
 * A linear stretch of musical time mapped to the raw timeline, produced by
 * `Transport.segments`. Within a segment the musical position advances 1:1 with
 * raw beats, so the scheduler can treat it as un-looped:
 *
 *   musical(rawBeat) = musicalFrom + (rawBeat - rawFrom)
 *
 * A transport loop produces several segments per lookahead window (one per loop
 * wrap); without a loop there's always exactly one.
 */
export interface TransportSegment {
  /** Musical beat at the start of the segment. */
  musicalFrom: Beats;
  /** Musical beat at the end (exclusive). */
  musicalTo: Beats;
  /** Raw beat corresponding to `musicalFrom` (for converting back to time). */
  rawFrom: Beats;
}

/**
 * Tempo + playhead, decoupled from any audio library.
 *
 * Two timelines are kept distinct on purpose:
 *  - **raw** beats advance monotonically from `start()` and map linearly to wall
 *    (audio) time. The scheduler walks raw beats so it never double-fires across
 *    a loop.
 *  - **musical** beats are what the user sees: raw beats with the loop applied
 *    (they jump back to `loopStart` at `loopEnd`).
 *
 * `segments()` bridges the two for the scheduler; `position` exposes the musical
 * playhead for the UI.
 */
export class Transport {
  private bpmValue: number;
  private playing = false;

  // raw-beat anchor: rawBeat(anchorTime) === anchorBeat. Re-anchored on tempo
  // changes so the playhead stays continuous.
  private anchorTime: Seconds = 0;
  private anchorBeat: Beats = 0;

  private loopEnabled = false;
  private loopStartBeat = 0;
  private loopEndBeat = 0;

  constructor(private readonly clock: Clock, bpm = 120) {
    this.bpmValue = bpm;
  }

  get bpm(): number {
    return this.bpmValue;
  }

  set bpm(value: number) {
    if (value === this.bpmValue || value <= 0) return;
    // Re-anchor so the current raw position is preserved across the tempo change.
    if (this.playing) {
      this.anchorBeat = this.rawBeatAt(this.clock.now);
      this.anchorTime = this.clock.now;
    }
    this.bpmValue = value;
  }

  get secondsPerBeat(): Seconds {
    return 60 / this.bpmValue;
  }

  get state(): 'started' | 'stopped' {
    return this.playing ? 'started' : 'stopped';
  }

  /**
   * Set (or clear) the transport loop region in beats. When enabled, the
   * playhead jumps from `end` back to `start` — the first wrap happens the first
   * time it reaches `end`, so playback before `start` plays through linearly.
   */
  setLoop(start: Beats, end: Beats): void {
    this.loopEnabled = end > start;
    this.loopStartBeat = start;
    this.loopEndBeat = end;
  }

  clearLoop(): void {
    this.loopEnabled = false;
  }

  get loop(): { enabled: boolean; start: Beats; end: Beats } {
    return {
      enabled: this.loopEnabled,
      start: this.loopStartBeat,
      end: this.loopEndBeat,
    };
  }

  /** Start playing, with the playhead at musical beat `atBeat`. */
  start(atBeat: Beats = 0): void {
    this.anchorTime = this.clock.now;
    this.anchorBeat = atBeat;
    this.playing = true;
  }

  stop(): void {
    this.playing = false;
  }

  /** Raw (un-looped, monotonic) beat at an audio time — default now. */
  rawBeatAt(time: Seconds = this.clock.now): Beats {
    if (!this.playing) return this.anchorBeat;
    return this.anchorBeat + (time - this.anchorTime) / this.secondsPerBeat;
  }

  /** Audio time of a raw beat. Inverse of `rawBeatAt` while playing. */
  timeAt(rawBeat: Beats): Seconds {
    return this.anchorTime + (rawBeat - this.anchorBeat) * this.secondsPerBeat;
  }

  /** Apply the loop to a raw beat to get the musical (visible) position. */
  toMusical(rawBeat: Beats): Beats {
    if (!this.loopEnabled || rawBeat < this.loopEndBeat) return rawBeat;
    const length = this.loopEndBeat - this.loopStartBeat;
    if (length <= 0) return rawBeat;
    return this.loopStartBeat + ((rawBeat - this.loopStartBeat) % length);
  }

  /** Musical playhead position (loop applied), for display. */
  get position(): Beats {
    return this.toMusical(this.rawBeatAt());
  }

  /**
   * Split the raw range `[rawFrom, rawTo)` into linear musical segments, cutting
   * at each loop wrap. The scheduler walks these so it only ever deals with
   * monotonic musical time within a segment.
   */
  segments(rawFrom: Beats, rawTo: Beats): TransportSegment[] {
    if (!this.loopEnabled || this.loopEndBeat <= this.loopStartBeat) {
      return [{ musicalFrom: rawFrom, musicalTo: rawTo, rawFrom }];
    }
    const length = this.loopEndBeat - this.loopStartBeat;
    const segments: TransportSegment[] = [];
    let raw = rawFrom;
    while (raw < rawTo) {
      const musicalFrom = this.toMusical(raw);
      // Raw distance to the next wrap: the first wrap is at loopEnd; afterwards
      // every `length` beats.
      const distanceToWrap =
        raw < this.loopEndBeat
          ? this.loopEndBeat - raw
          : length - ((raw - this.loopStartBeat) % length);
      const rawNext = Math.min(rawTo, raw + distanceToWrap);
      segments.push({
        musicalFrom,
        musicalTo: musicalFrom + (rawNext - raw),
        rawFrom: raw,
      });
      raw = rawNext;
    }
    return segments;
  }
}
