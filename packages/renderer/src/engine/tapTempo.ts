// Tap-tempo helpers, kept pure (no timers/DOM) so they're easy to unit-test.

// A gap longer than this between taps starts a fresh measurement.
export const TAP_RESET_MS = 2000;
// How many recent taps to average over.
const MAX_TAPS = 8;

/**
 * Append a tap (a timestamp in ms) to the running list, resetting to a single
 * tap when the previous one was too long ago. Keeps only the most recent taps.
 */
export function pushTap(
  times: number[],
  now: number,
  resetMs: number = TAP_RESET_MS,
): number[] {
  const last = times[times.length - 1];
  if (last !== undefined && now - last > resetMs) return [now];
  return [...times, now].slice(-MAX_TAPS);
}

/**
 * Average BPM implied by the intervals between consecutive taps, or null when
 * there aren't enough taps (or the timestamps don't increase).
 */
export function bpmFromTaps(times: number[]): number | null {
  if (times.length < 2) return null;
  let total = 0;
  for (let i = 1; i < times.length; i++) total += times[i] - times[i - 1];
  const averageInterval = total / (times.length - 1);
  if (!(averageInterval > 0)) return null;
  return 60000 / averageInterval;
}
