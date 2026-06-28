import { describe, expect, it } from 'vitest';
import { bpmFromTaps, pushTap, TAP_RESET_MS } from './tapTempo';

describe('bpmFromTaps', () => {
  it('returns null with fewer than two taps', () => {
    expect(bpmFromTaps([])).toBeNull();
    expect(bpmFromTaps([1000])).toBeNull();
  });

  it('computes 120 BPM from 500 ms intervals', () => {
    expect(bpmFromTaps([0, 500, 1000, 1500])).toBeCloseTo(120, 6);
  });

  it('computes 60 BPM from 1000 ms intervals', () => {
    expect(bpmFromTaps([0, 1000, 2000])).toBeCloseTo(60, 6);
  });

  it('averages uneven intervals', () => {
    // intervals 400 and 600 -> average 500 ms -> 120 BPM
    expect(bpmFromTaps([0, 400, 1000])).toBeCloseTo(120, 6);
  });

  it('returns null for non-increasing timestamps', () => {
    expect(bpmFromTaps([1000, 1000])).toBeNull();
  });
});

describe('pushTap', () => {
  it('appends taps within the window', () => {
    expect(pushTap([0, 500], 1000)).toEqual([0, 500, 1000]);
  });

  it('starts fresh after a gap longer than the reset window', () => {
    expect(pushTap([0, 500], 500 + TAP_RESET_MS + 1)).toEqual([
      500 + TAP_RESET_MS + 1,
    ]);
  });

  it('keeps only the most recent taps', () => {
    const times = Array.from({ length: 12 }, (_, i) => i * 100);
    const next = pushTap(times, 1200);
    expect(next.length).toBe(8);
    expect(next[next.length - 1]).toBe(1200);
  });
});
