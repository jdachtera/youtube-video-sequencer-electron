import type { FollowupAction } from './Patttern';

/**
 * Resolve the pattern index a sequencer should advance to when a pattern's
 * follow-up action fires. Kept as a pure function (no Tone / DOM dependencies)
 * so the wrap-around arithmetic can be unit-tested directly.
 *
 * `patternCount` is the number of patterns in the sequencer — NOT the number of
 * steps in a pattern. Conflating the two was the original bug: follow-up actions
 * computed indices against the step count and ran off the end of the pattern
 * list, so the next pattern never started.
 */
export const getNextPatternIndex = (
  followupAction: FollowupAction | undefined,
  currentIndex: number,
  patternCount: number,
): number => {
  if (patternCount <= 0) return 0;

  // Positive modulo so negative offsets (e.g. "previous" from index 0) wrap.
  const wrap = (index: number) =>
    ((index % patternCount) + patternCount) % patternCount;

  switch (followupAction?.type) {
    case 'any':
      return Math.floor(Math.random() * patternCount);
    case 'other': {
      if (patternCount <= 1) return currentIndex;
      // Pick any index except the current one, with uniform probability.
      const offset = 1 + Math.floor(Math.random() * (patternCount - 1));
      return wrap(currentIndex + offset);
    }
    case 'next':
      return wrap(currentIndex + 1);
    case 'previous':
      return wrap(currentIndex - 1);
    case 'first':
      return 0;
    case 'last':
      return patternCount - 1;
    case 'jump':
      return wrap(followupAction.targetIndex);
    default:
      return currentIndex;
  }
};
