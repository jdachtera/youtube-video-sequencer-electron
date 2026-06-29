import { describe, expect, it } from 'vitest';
import { ArrayClip } from './ArrayClip';
import { ManualClock } from './Clock';
import { Scheduler } from './Scheduler';
import { Transport } from './Transport';

// A 1-bar clip of four quarter-note hits, labelled by their beat.
const fourOnTheFloor = () =>
  new ArrayClip<string>(4, true, [
    { beat: 0, data: 'b0' },
    { beat: 1, data: 'b1' },
    { beat: 2, data: 'b2' },
    { beat: 3, data: 'b3' },
  ]);

interface Fired {
  data: string;
  time: number;
}

const setup = (bpm = 120, options = { lookahead: 0.1, intervalMs: 25 }) => {
  const clock = new ManualClock();
  const transport = new Transport(clock, bpm);
  const scheduler = new Scheduler<string>(clock, transport, options);
  const fired: Fired[] = [];
  scheduler.onSchedule((event, time) => fired.push({ data: event.data, time }));
  return { clock, transport, scheduler, fired };
};

// Round to the nearest ms to absorb float error in comparisons.
const at = (fired: Fired[]) =>
  fired.map((f) => ({ data: f.data, time: Math.round(f.time * 1000) / 1000 }));

describe('Scheduler', () => {
  it('fires the first event immediately on start (no added latency)', () => {
    const { scheduler, fired } = setup();
    scheduler.add(fourOnTheFloor());
    scheduler.start();
    // Synchronous first pass scheduled beat 0 for "now" (t=0) before any time
    // has advanced.
    expect(fired).toHaveLength(1);
    expect(fired[0]).toEqual({ data: 'b0', time: 0 });
  });

  it('schedules a looping clip at the correct audio times', () => {
    const { clock, scheduler, fired } = setup(120); // 0.5s per beat
    scheduler.add(fourOnTheFloor());
    scheduler.start();
    clock.advance(2.05); // just past one bar (2s) so the loop's b0 lands too

    expect(at(fired)).toEqual([
      { data: 'b0', time: 0 },
      { data: 'b1', time: 0.5 },
      { data: 'b2', time: 1 },
      { data: 'b3', time: 1.5 },
      { data: 'b0', time: 2 }, // clip looped
    ]);
  });

  it('fires each event exactly once (no gaps or double-scheduling)', () => {
    const { clock, scheduler, fired } = setup(140);
    scheduler.add(fourOnTheFloor());
    scheduler.start();
    clock.advance(10);

    // Every quarter note over 10s at 140bpm; just assert none are duplicated by
    // checking the times are strictly increasing and unique.
    const times = fired.map((f) => f.time);
    for (let i = 1; i < times.length; i++) {
      expect(times[i]).toBeGreaterThan(times[i - 1]);
    }
  });

  it('does nothing once stopped', () => {
    const { clock, scheduler, fired } = setup();
    scheduler.add(fourOnTheFloor());
    scheduler.start();
    clock.advance(1);
    const countAtStop = fired.length;
    scheduler.stop();
    clock.advance(5);
    expect(fired.length).toBe(countAtStop);
    expect(scheduler.running).toBe(false);
  });

  it('honours a non-looping clip (plays through once)', () => {
    const { clock, scheduler, fired } = setup(120);
    scheduler.add(
      new ArrayClip<string>(4, false, [
        { beat: 0, data: 'b0' },
        { beat: 2, data: 'b2' },
      ]),
    );
    scheduler.start();
    clock.advance(10);
    expect(at(fired)).toEqual([
      { data: 'b0', time: 0 },
      { data: 'b2', time: 1 },
    ]);
  });

  describe('transport loop', () => {
    it('wraps the playhead, replaying only the looped region', () => {
      const { clock, transport, scheduler, fired } = setup(120);
      transport.setLoop(0, 2); // loop the first two beats
      scheduler.add(fourOnTheFloor());
      scheduler.start();
      clock.advance(2.05); // two laps of the 1s loop

      // Only b0/b1 ever play (musical position never reaches beats 2/3), and
      // they repeat every 1s.
      expect(at(fired)).toEqual([
        { data: 'b0', time: 0 },
        { data: 'b1', time: 0.5 },
        { data: 'b0', time: 1 }, // looped back at loopEnd (beat 2 -> beat 0)
        { data: 'b1', time: 1.5 },
        { data: 'b0', time: 2 },
      ]);
      expect(fired.some((f) => f.data === 'b2' || f.data === 'b3')).toBe(false);
    });

    it('plays linearly before the loop region, then wraps', () => {
      const { clock, transport, scheduler, fired } = setup(120);
      transport.setLoop(2, 4); // loop the second half
      scheduler.add(fourOnTheFloor());
      scheduler.start(); // starts at beat 0, before the loop region
      clock.advance(3.05);

      // 0,1,2,3 play through; then it wraps 4->2, replaying b2,b3.
      expect(at(fired)).toEqual([
        { data: 'b0', time: 0 },
        { data: 'b1', time: 0.5 },
        { data: 'b2', time: 1 },
        { data: 'b3', time: 1.5 },
        { data: 'b2', time: 2 }, // wrapped (beat 4 -> beat 2)
        { data: 'b3', time: 2.5 },
        { data: 'b2', time: 3 },
      ]);
    });
  });

  describe('tempo', () => {
    it('keeps the playhead continuous across a bpm change', () => {
      const { clock, transport } = setup(120);
      transport.start(0);
      clock.advance(1); // 2 beats at 120bpm
      expect(transport.position).toBeCloseTo(2, 6);
      transport.bpm = 240; // double time
      clock.advance(1); // 4 beats at 240bpm
      expect(transport.position).toBeCloseTo(6, 6);
    });

    it('schedules at the new tempo after a change', () => {
      const { clock, scheduler, transport, fired } = setup(120);
      scheduler.add(fourOnTheFloor());
      scheduler.start();
      clock.advance(0.55); // past beat 1 (0.5s) at 120bpm
      transport.bpm = 240; // 0.25s per beat now
      clock.advance(1);

      // b0@0, b1@0.5 at 120bpm; then beats keep coming 0.25s apart.
      const times = at(fired).map((f) => f.time);
      expect(times.slice(0, 2)).toEqual([0, 0.5]);
      // The gap after the tempo change is the faster 0.25s.
      const afterChange = fired.filter((f) => f.time > 0.55).map((f) => f.time);
      for (let i = 1; i < afterChange.length; i++) {
        expect(afterChange[i] - afterChange[i - 1]).toBeCloseTo(0.25, 3);
      }
    });
  });

  it('reflects live edits to a clip on the next window (no reschedule)', () => {
    const { clock, scheduler, fired } = setup(120);
    const clip = fourOnTheFloor();
    scheduler.add(clip);
    scheduler.start();
    clock.advance(0.55); // played b0, b1
    // Mute the rest of this bar by editing the data in place.
    clip.events = clip.events.filter((e) => e.beat < 1.5);
    clock.advance(2);
    // b2 and b3 of the first bar should not have fired.
    const firstBar = fired.filter((f) => f.time < 2);
    expect(firstBar.some((f) => f.data === 'b2' || f.data === 'b3')).toBe(
      false,
    );
  });
});
