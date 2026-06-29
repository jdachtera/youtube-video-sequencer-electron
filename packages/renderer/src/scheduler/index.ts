/**
 * A small, dependency-free lookahead scheduler / transport for sample-accurate
 * sequencing on top of any audio clock.
 *
 * No Tone.js, no Web Audio, no app imports — the only seams are the `Clock`
 * interface (a `now` + a repeating timer) and the `ClipSource` interface (live
 * pattern data). That keeps it trivially extractable into its own package.
 *
 * Typical wiring:
 *
 *   const clock = new AudioContextClock(audioContext);
 *   const transport = new Transport(clock, 120);
 *   const scheduler = new Scheduler(clock, transport, { lookahead: 0.1 });
 *   scheduler.onSchedule((event, time) => player.start(time));
 *   scheduler.add(myClip);
 *   scheduler.start();
 */
export type {
  Beats,
  ClipSource,
  ScheduledEvent,
  ScheduleHandler,
  Seconds,
} from './types';
export type { Clock } from './Clock';
export { AudioContextClock, ManualClock } from './Clock';
export type { TransportSegment } from './Transport';
export { Transport } from './Transport';
export type { SchedulerOptions } from './Scheduler';
export { Scheduler } from './Scheduler';
export { ArrayClip } from './ArrayClip';
