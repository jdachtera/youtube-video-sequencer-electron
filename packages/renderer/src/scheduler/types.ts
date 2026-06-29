/**
 * Core time/value types for the scheduler.
 *
 * The whole module is intentionally free of Tone.js, Web Audio, and any app
 * imports so it can be lifted into a standalone package later. The only contact
 * with the outside world is through the small interfaces declared here and in
 * `Clock.ts`.
 */

/** A point in time, in seconds, on the audio clock's time base. */
export type Seconds = number;

/** Musical time, in beats (quarter notes). Sub-beat values are fine. */
export type Beats = number;

/**
 * Something the scheduler will fire. `beat` is the event's position in
 * **clip-local** beats (0 = clip start). `data` is an opaque payload the host
 * supplies and gets back in the schedule callback — typically a note/step, but
 * the scheduler never inspects it.
 */
export interface ScheduledEvent<T = unknown> {
  beat: Beats;
  data: T;
}

/**
 * A loopable source of events — a "clip" or "pattern". The scheduler owns all
 * transport math and loop wrapping; a clip only has to answer one question:
 * "which of your events start within this half-open local beat range?".
 *
 * Because the host implements `query` over its own live data, editing the clip
 * during playback needs no rescheduling — the next scheduler tick simply reads
 * the new answer.
 */
export interface ClipSource<T = unknown> {
  /** Loop length in beats. Ignored when `loop` is false. */
  readonly lengthBeats: Beats;
  /** When true, the clip repeats every `lengthBeats`. */
  readonly loop: boolean;
  /**
   * Events whose local start beat lies in `[fromBeat, toBeat)`. May be called
   * with any non-negative range `< lengthBeats` (the scheduler splits across
   * loop boundaries before calling). Order doesn't matter.
   */
  query(fromBeat: Beats, toBeat: Beats): ReadonlyArray<ScheduledEvent<T>>;
}

/** Fired by the scheduler for every event that lands in a lookahead window. */
export type ScheduleHandler<T = unknown> = (
  event: ScheduledEvent<T>,
  /** Absolute audio time (seconds) at which to play it. */
  time: Seconds,
  source: ClipSource<T>,
) => void;
