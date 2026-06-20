import { afterEach, describe, expect, it, vi } from 'vitest';
import type { FollowupAction } from './Patttern';
import { getNextPatternIndex } from './patternNavigation';

const action = (partial: Partial<FollowupAction>): FollowupAction =>
  ({
    linked: false,
    multiplicator: 1,
    triggerTime: 16,
    ...partial,
  } as FollowupAction);

describe('getNextPatternIndex', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('advances to the next pattern and wraps at the end', () => {
    expect(getNextPatternIndex(action({ type: 'next' }), 0, 3)).toBe(1);
    expect(getNextPatternIndex(action({ type: 'next' }), 2, 3)).toBe(0);
  });

  it('steps to the previous pattern and wraps below zero', () => {
    expect(getNextPatternIndex(action({ type: 'previous' }), 2, 3)).toBe(1);
    expect(getNextPatternIndex(action({ type: 'previous' }), 0, 3)).toBe(2);
  });

  it('jumps to first and last by pattern count, not step count', () => {
    expect(getNextPatternIndex(action({ type: 'first' }), 2, 4)).toBe(0);
    expect(getNextPatternIndex(action({ type: 'last' }), 0, 4)).toBe(3);
  });

  it('clamps "jump" target into range', () => {
    expect(
      getNextPatternIndex(action({ type: 'jump', targetIndex: 1 }), 0, 3),
    ).toBe(1);
    // Out-of-range target wraps instead of pointing at a missing pattern.
    expect(
      getNextPatternIndex(action({ type: 'jump', targetIndex: 5 }), 0, 3),
    ).toBe(2);
  });

  it('"any" stays within range for every random draw', () => {
    for (const r of [0, 0.5, 0.999]) {
      vi.spyOn(Math, 'random').mockReturnValue(r);
      const index = getNextPatternIndex(action({ type: 'any' }), 0, 3);
      expect(index).toBeGreaterThanOrEqual(0);
      expect(index).toBeLessThan(3);
    }
  });

  it('"other" never returns the current pattern', () => {
    for (const r of [0, 0.34, 0.67, 0.999]) {
      vi.spyOn(Math, 'random').mockReturnValue(r);
      const index = getNextPatternIndex(action({ type: 'other' }), 1, 3);
      expect(index).not.toBe(1);
      expect(index).toBeGreaterThanOrEqual(0);
      expect(index).toBeLessThan(3);
    }
  });

  it('"other" with a single pattern stays put', () => {
    expect(getNextPatternIndex(action({ type: 'other' }), 0, 1)).toBe(0);
  });

  it('holds position when there is no follow-up action', () => {
    expect(getNextPatternIndex(undefined, 2, 4)).toBe(2);
  });
});
