import type { Step } from './device/Patttern';

// Rotate a step pattern, wrapping around. Positive `by` shifts the pattern
// later (right) — every hit moves to the next step — which is a quick way to
// slide a groove against the beat and find a better pocket. Negative shifts
// earlier (left).
export const rotateSteps = (steps: Step[], by: number): Step[] => {
  const n = steps.length;
  if (n === 0) return steps;
  const offset = ((by % n) + n) % n || 0;
  return [...steps.slice(n - offset), ...steps.slice(0, n - offset)];
};

// Clear every hit while keeping the pattern length (and each step's other
// settings) intact.
export const clearedSteps = (steps: Step[]): Step[] =>
  steps.map((step) => ({ ...step, play: false }));
