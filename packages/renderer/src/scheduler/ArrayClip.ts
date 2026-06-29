import type { Beats, ClipSource, ScheduledEvent } from './types';

/**
 * A minimal reference {@link ClipSource} backed by a plain array of events.
 *
 * Real hosts will usually implement `ClipSource` directly over their own live
 * pattern data (so edits need no syncing). This is handy for tests and simple
 * cases. `events` may be reassigned at any time — the scheduler reads it fresh
 * on the next tick.
 */
export class ArrayClip<T = unknown> implements ClipSource<T> {
  events: ScheduledEvent<T>[];

  constructor(
    public lengthBeats: Beats,
    public loop = true,
    events: ScheduledEvent<T>[] = [],
  ) {
    this.events = events;
  }

  query(fromBeat: Beats, toBeat: Beats): ReadonlyArray<ScheduledEvent<T>> {
    return this.events.filter(
      (event) => event.beat >= fromBeat && event.beat < toBeat,
    );
  }
}
