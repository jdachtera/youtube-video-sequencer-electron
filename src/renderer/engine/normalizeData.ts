import { Slice, Pattern } from './types';
import { Action } from 'renderer/SequencerAction';
import { Step } from 'renderer/SequencerStep';
import { createUniqueId } from 'solid-js';
import { Engine } from './Engine';
import { Sampler } from './Sampler';

export const normalizeStepData = (step: DeepPartial<Step>): Step => ({
  actions: (Array.isArray(step.actions) ? step.actions : [])
    .map((action): Action | undefined => {
      switch (action?.type) {
        case 'PLAY':
          return {
            ...action,
            type: action.type,
            velocity: action.velocity ?? 1,
          };
        case 'PAUSE':
          return { type: 'PAUSE' };
        case 'SET_PLAYBACK_SPEED':
          return { ...action, type: action.type, value: action.value ?? 1 };
        case 'SET_REVERSE':
          return { ...action, type: action.type, value: action.value ?? false };
        default:
          return undefined;
      }
    })
    .filter((action): action is Action => !!action),
});

export const normalizePatternData = (
  pattern: DeepPartial<Pattern> | Step[]
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
  )
    .filter((maybeStep): maybeStep is DeepPartial<Step> => !!maybeStep)
    .map((step) => normalizeStepData(step)),
});

export const normalizeSliceData = (slice: DeepPartial<Slice>): Slice => ({
  id: slice.id ?? createUniqueId(),
  collapsed: slice.collapsed ?? false,
  name: slice.name ?? '',
  color: slice.color ?? 'red',
  start: slice.start ?? 0,
  end: slice.end ?? 10,
  playbackSpeed: slice.playbackSpeed ?? 1,
  reverse: slice.reverse ?? false,
  volume: slice.volume ?? 1,
  patterns: (Array.isArray(slice.patterns) ? slice.patterns : [])
    .filter((maybeStep): maybeStep is DeepPartial<Pattern> => !!maybeStep)
    .map(normalizePatternData),
  solo: slice.solo ?? false,
});

export const normalizeSamplerData = (
  sampler: DeepPartial<ReturnType<Sampler['serialize']>>
): ReturnType<Sampler['serialize']> => ({
  url: sampler.url ?? '',
  volume: sampler.volume ?? 1,
  zoom: sampler.zoom ?? 0,
  slices: (Array.isArray(sampler.slices) ? sampler.slices : [])
    .filter((maybeStep): maybeStep is DeepPartial<Slice> => !!maybeStep)
    .map(normalizeSliceData),
});

export const normalizeData = (
  parsedData: DeepPartial<ReturnType<Engine['serialize']>>
): ReturnType<Engine['serialize']> => {
  return {
    bpm: parsedData.bpm ?? 120,
    swing: parsedData.swing ?? 0,
    currentPatternIndex: parsedData.currentPatternIndex ?? 0,
    samplers: (Array.isArray(parsedData.samplers) ? parsedData.samplers : [])
      .filter((maybeStep): maybeStep is DeepPartial<Sampler> => !!maybeStep)
      .map(normalizeSamplerData),
  };
};

export type DeepPartial<T> = T extends object
  ? {
      [P in keyof T]?: DeepPartial<T[P]>;
    }
  : T;
