import { describe, expect, it } from 'vitest';
import { normalizeStepData } from './device/Patttern';
import { clearedSteps, rotateSteps } from './patternOps';

const steps = (plays: boolean[]) =>
  plays.map((play) => ({ ...normalizeStepData({}), play }));

const plays = (s: { play: boolean }[]) => s.map((step) => step.play);

describe('rotateSteps', () => {
  it('shifts right (a hit moves to the next step), wrapping the last to the front', () => {
    expect(plays(rotateSteps(steps([true, false, false, false]), 1))).toEqual([
      false,
      true,
      false,
      false,
    ]);
  });

  it('shifts left, wrapping the first to the back', () => {
    expect(plays(rotateSteps(steps([true, false, false, false]), -1))).toEqual([
      false,
      false,
      false,
      true,
    ]);
  });

  it('is the identity for a full rotation or zero', () => {
    const pattern = steps([true, true, false, true]);
    expect(plays(rotateSteps(pattern, 0))).toEqual(plays(pattern));
    expect(plays(rotateSteps(pattern, 4))).toEqual(plays(pattern));
    expect(plays(rotateSteps(pattern, -8))).toEqual(plays(pattern));
  });

  it('handles an empty pattern', () => {
    expect(rotateSteps([], 1)).toEqual([]);
  });
});

describe('clearedSteps', () => {
  it('turns every hit off but keeps the length', () => {
    const cleared = clearedSteps(steps([true, false, true, true]));
    expect(cleared).toHaveLength(4);
    expect(cleared.every((step) => !step.play)).toBe(true);
  });
});
