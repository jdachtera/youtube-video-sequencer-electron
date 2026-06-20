import { describe, expect, it } from 'vitest';
import {
  euclideanRhythm,
  randomMusicalNotes,
  randomMusicalSteps,
} from './randomize';

describe('euclideanRhythm', () => {
  it('distributes onsets evenly starting on the downbeat', () => {
    expect(euclideanRhythm(4, 16)).toEqual([
      true,
      false,
      false,
      false,
      true,
      false,
      false,
      false,
      true,
      false,
      false,
      false,
      true,
      false,
      false,
      false,
    ]);
  });

  it('always puts an onset on step 0', () => {
    expect(euclideanRhythm(5, 16)[0]).toBe(true);
    expect(euclideanRhythm(3, 8)[0]).toBe(true);
  });

  it('clamps the onset count to the available steps', () => {
    expect(euclideanRhythm(99, 8).filter(Boolean)).toHaveLength(8);
    expect(euclideanRhythm(0, 8).some(Boolean)).toBe(false);
  });

  it('produces the expected number of onsets', () => {
    expect(euclideanRhythm(5, 16).filter(Boolean)).toHaveLength(5);
  });
});

describe('randomMusicalSteps', () => {
  it('returns one step per slot with at least one hit', () => {
    for (let run = 0; run < 50; run++) {
      const steps = randomMusicalSteps(16);
      expect(steps).toHaveLength(16);
      expect(steps.some((step) => step.play)).toBe(true);
      // not every step should fire — it should groove, not machine-gun
      expect(steps.every((step) => step.play)).toBe(false);
    }
  });

  it('handles an empty pattern length', () => {
    expect(randomMusicalSteps(0)).toEqual([]);
  });

  it('accents hits with velocities in (0, 1]', () => {
    for (let run = 0; run < 50; run++) {
      const steps = randomMusicalSteps(16);
      for (const step of steps) {
        if (step.play) {
          expect(step.volume).toBeGreaterThan(0);
          expect(step.volume).toBeLessThanOrEqual(1);
        }
      }
    }
  });
});

describe('randomMusicalNotes', () => {
  it('produces pentatonic notes within the bar range', () => {
    for (let run = 0; run < 50; run++) {
      const notes = randomMusicalNotes({ ppq: 192, bars: 2, root: 60 });
      expect(notes.length).toBeGreaterThan(0);
      const maxTicks = 2 * 4 * 192;
      for (const note of notes) {
        expect(note.ticks).toBeLessThan(maxTicks);
        expect(note.durationTicks).toBeGreaterThan(0);
        // every pitch is a minor-pentatonic degree relative to the root
        const semitone = (((note.midi - 60) % 12) + 12) % 12;
        expect([0, 3, 5, 7, 10]).toContain(semitone);
      }
    }
  });
});
