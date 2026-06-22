import type { Note } from 'solid-pianoroll';
import type { Step } from './device/Patttern';
import { normalizeStepData } from './device/Patttern';

// Evenly distribute `pulses` onsets across `steps` slots, always landing one on
// the downbeat (step 0). This is the Euclidean-rhythm idea that underpins a huge
// range of musical grooves, so the result reads as a rhythm rather than noise.
export const euclideanRhythm = (pulses: number, steps: number): boolean[] => {
  if (steps <= 0) return [];
  const k = Math.max(0, Math.min(Math.round(pulses), steps));
  const onsets = new Set<number>();
  for (let i = 0; i < k; i++) {
    onsets.add(Math.round((i * steps) / k) % steps);
  }
  return Array.from({ length: steps }, (_, i) => onsets.has(i));
};

const randomInt = (min: number, max: number) =>
  min + Math.floor(Math.random() * (max - min + 1));

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

// Metric accent: hits on the beat hit hardest, eighths a touch softer, the
// in-between sixteenths lighter — the dynamic shape that makes a rhythm groove
// rather than sound like a metronome.
const metricAccent = (index: number) => {
  if (index % 4 === 0) return 1;
  if (index % 2 === 0) return 0.82;
  return 0.68;
};

// A musically-plausible step pattern: a Euclidean rhythm with a sensible onset
// density (a fifth to a half of the steps), so it grooves instead of either
// machine-gunning every step or being nearly empty. Hits are velocity-accented
// by metric position with a little humanising jitter.
export const randomMusicalSteps = (length: number): Step[] => {
  if (length <= 0) return [];
  const minHits = Math.max(1, Math.round(length * 0.2));
  const maxHits = Math.max(minHits, Math.round(length * 0.5));
  const hits = randomInt(minHits, maxHits);
  const rhythm = euclideanRhythm(hits, length);
  return rhythm.map((play, index) => ({
    ...normalizeStepData({}),
    play,
    volume: play
      ? clamp(metricAccent(index) + (Math.random() - 0.5) * 0.12, 0.4, 1)
      : 1,
  }));
};

// Minor pentatonic: five notes that sound consonant in essentially any order,
// which keeps a randomised melody musical.
const MINOR_PENTATONIC = [0, 3, 5, 7, 10];

// A random melody on the minor pentatonic scale, on an eighth-note grid over a
// couple of bars. Notes land roughly half the time so there's space, and
// occasionally jump an octave for movement.
export const randomMusicalNotes = (options: {
  ppq: number;
  bars?: number;
  root?: number;
}): Note[] => {
  const ppq = options.ppq || 192;
  const bars = options.bars ?? 2;
  const root = options.root ?? 60;

  const stepTicks = ppq / 2; // eighth notes
  const totalSteps = bars * 8;
  const notes: Note[] = [];

  for (let i = 0; i < totalSteps; i++) {
    if (Math.random() < 0.5) {
      const degree =
        MINOR_PENTATONIC[randomInt(0, MINOR_PENTATONIC.length - 1)];
      const octave = Math.random() < 0.25 ? 12 : 0;
      notes.push({
        ticks: i * stepTicks,
        durationTicks: stepTicks,
        midi: root + degree + octave,
        velocity: 100,
      });
    }
  }

  // Guarantee at least one note so the result is never silent.
  if (notes.length === 0) {
    notes.push({
      ticks: 0,
      durationTicks: stepTicks,
      midi: root,
      velocity: 100,
    });
  }

  return notes;
};
