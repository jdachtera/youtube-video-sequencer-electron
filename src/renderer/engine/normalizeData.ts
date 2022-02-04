import { Step } from 'renderer/SequencerStep';
import { Pattern, Slice } from 'renderer/Slice';
import { createUniqueId } from 'solid-js';
import { Engine } from './Engine';
import { Sampler } from './Sampler';

export const normalizeStepData = (step: Partial<Step>): Step => ({
  actions: Array.isArray(step.actions) ? step.actions : [],
});

export const normalizePatternData = (
  pattern: Partial<Pattern> | Step[]
): Pattern => ({
  subdivision: Array.isArray(pattern) ? 16 : pattern.subdivision ?? 16,
  subdivisionType: Array.isArray(pattern)
    ? 'n'
    : pattern.subdivisionType ?? 'n',
  steps: (Array.isArray(pattern)
    ? pattern
    : Array.isArray(pattern.steps)
    ? pattern.steps
    : []
  ).map(normalizeStepData),
});

export const normalizeSliceData = (slice: Partial<Slice>): Slice => ({
  id: slice.id ?? createUniqueId(),
  name: slice.name ?? '',
  color: slice.color ?? 'red',
  start: slice.start ?? 0,
  end: slice.end ?? 10,
  playbackSpeed: slice.playbackSpeed ?? 1,
  reverse: slice.reverse ?? false,
  volume: slice.volume ?? 1,
  patterns: (Array.isArray(slice.patterns) ? slice.patterns : []).map(
    normalizePatternData
  ),
  solo: slice.solo ?? false,
});

export const normalizeSamplerData = (
  sampler: Partial<ReturnType<Sampler['serialize']>>
): ReturnType<Sampler['serialize']> => ({
  url: sampler.url ?? '',
  volume: sampler.volume ?? 1,
  zoom: sampler.zoom ?? 0,
  slices: (Array.isArray(sampler.slices) ? sampler.slices : []).map(
    normalizeSliceData
  ),
});

export const normalizeData = (
  parsedData: Partial<ReturnType<Engine['serialize']>>
): ReturnType<Engine['serialize']> => {
  return {
    bpm: parsedData.bpm ?? 120,
    swing: parsedData.swing ?? 0,
    currentPatternIndex: parsedData.currentPatternIndex ?? 0,
    samplers: (Array.isArray(parsedData.samplers)
      ? parsedData.samplers
      : []
    ).map(normalizeSamplerData),
  };
};
