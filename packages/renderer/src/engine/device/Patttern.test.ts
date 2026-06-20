import { describe, expect, it } from 'vitest';
import {
  normalizeNoteData,
  normalizeStepData,
  pianoRollLoopLengthTicks,
  Pattern,
} from './Patttern';

describe('normalizeStepData', () => {
  it('fills sensible defaults for an empty step', () => {
    expect(normalizeStepData({})).toEqual({
      play: false,
      playbackRate: 1,
      volume: 1,
      pitch: 1,
      reverse: false,
    });
  });

  it('marks a step as playing when it carries legacy actions', () => {
    expect(normalizeStepData({ actions: [{}] }).play).toBe(true);
  });

  it('preserves provided values', () => {
    const step = normalizeStepData({
      play: true,
      volume: 0.5,
      playbackRate: 2,
      pitch: 3,
      reverse: true,
    });
    expect(step).toEqual({
      play: true,
      volume: 0.5,
      playbackRate: 2,
      pitch: 3,
      reverse: true,
    });
  });
});

describe('normalizeNoteData', () => {
  it('fills defaults (root note, full velocity)', () => {
    expect(normalizeNoteData({})).toEqual({
      ticks: 0,
      durationTicks: 0,
      midi: 60,
      velocity: 1,
    });
  });

  it('preserves provided fields', () => {
    expect(
      normalizeNoteData({
        ticks: 96,
        durationTicks: 48,
        midi: 64,
        velocity: 0.8,
      }),
    ).toEqual({ ticks: 96, durationTicks: 48, midi: 64, velocity: 0.8 });
  });
});

describe('Pattern.normalizePatternData', () => {
  it('defaults a new pattern to step mode', () => {
    const pattern = Pattern.normalizePatternData({});
    expect(pattern.mode).toBe('steps');
    expect(pattern.notes).toEqual([]);
    expect(pattern.ppq).toBe(192);
    expect(pattern.subdivision).toBe(16);
    expect(pattern.subdivisionType).toBe('n');
  });

  it('keeps piano-roll mode and normalizes its notes', () => {
    const pattern = Pattern.normalizePatternData({
      mode: 'pianoroll',
      notes: [{ ticks: 0, midi: 67 }],
    });
    expect(pattern.mode).toBe('pianoroll');
    expect(pattern.notes).toEqual([
      { ticks: 0, durationTicks: 0, midi: 67, velocity: 1 },
    ]);
  });

  it('accepts a bare steps array', () => {
    const pattern = Pattern.normalizePatternData([normalizeStepData({})]);
    expect(pattern.steps).toHaveLength(1);
    expect(pattern.mode).toBe('steps');
  });
});

describe('pianoRollLoopLengthTicks', () => {
  const ppq = 192;
  const bar = ppq * 4;

  it('is one bar when there are no notes (never zero)', () => {
    expect(pianoRollLoopLengthTicks([], ppq)).toBe(bar);
  });

  it('stays one bar while notes fit inside the first bar', () => {
    const notes = [
      normalizeNoteData({ ticks: 0, durationTicks: ppq }),
      normalizeNoteData({ ticks: ppq * 3, durationTicks: ppq }),
    ];
    expect(pianoRollLoopLengthTicks(notes, ppq)).toBe(bar);
  });

  it('rounds up to whole bars to contain the last note', () => {
    const notes = [normalizeNoteData({ ticks: bar, durationTicks: ppq })];
    expect(pianoRollLoopLengthTicks(notes, ppq)).toBe(bar * 2);
  });

  it('accounts for note duration crossing a bar line', () => {
    const notes = [
      normalizeNoteData({ ticks: bar - ppq, durationTicks: ppq * 2 }),
    ];
    expect(pianoRollLoopLengthTicks(notes, ppq)).toBe(bar * 2);
  });

  it('respects a custom ppq', () => {
    expect(pianoRollLoopLengthTicks([], 480)).toBe(480 * 4);
  });
});
