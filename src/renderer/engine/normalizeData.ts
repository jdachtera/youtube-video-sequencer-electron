import { createUniqueId } from 'solid-js';
import { SerializedDeviceChain } from './device/DeviceChain';
import { SerializedFilter } from './device/Filter';
import { SerializedPingPongDelay } from './device/PingPongDelay';
import { SerializedSampler } from './device/Sampler';
import { SerializedTrack } from './Track';

import {
  SerializedSlice,
  SerializedEngine,
  Pattern,
  Step,
  Action,
  SerializedDevice,
} from './types';

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

export const normalizeSliceData = (
  slice: DeepPartial<SerializedSlice>
): SerializedSlice => ({
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
  chain: normalizeDeviceChainData(slice.chain ?? {}),
});

export const normalizeSamplerData = (
  sampler: DeepPartial<SerializedSampler>
): SerializedSampler => ({
  name: 'Sampler',
  inputGain: sampler.inputGain ?? 1,
  volume: sampler.volume ?? 1,
  url: sampler.url ?? '',
  zoom: sampler.zoom ?? 0,
  slices: (Array.isArray(sampler.slices) ? sampler.slices : [])
    .filter(
      (maybeStep): maybeStep is DeepPartial<SerializedSlice> => !!maybeStep
    )
    .map(normalizeSliceData),
});

export const normalizeFilterData = (
  filter: DeepPartial<SerializedFilter>
): SerializedFilter => ({
  name: 'Filter',
  inputGain: filter.inputGain ?? 1,
  volume: filter.volume ?? 1,
  frequency: filter.frequency ?? 4000,
  type: filter.type ?? 'lowpass',
  resonance: filter.resonance ?? 0.1,
  rolloff: filter.rolloff ?? -12,
});

export const normalizePingPongDelayData = (
  pingPongDelay: DeepPartial<SerializedPingPongDelay>
): SerializedPingPongDelay => ({
  name: 'PingPongDelay',
  inputGain: pingPongDelay.inputGain ?? 1,
  volume: pingPongDelay.volume ?? 1,
  delayTime: pingPongDelay.delayTime ?? 100,
  feedback: pingPongDelay.feedback ?? 0.2,
});

export const normalizeDeviceData = (
  device: DeepPartial<SerializedDevice>
): SerializedDevice | undefined => {
  switch (device.name) {
    case 'DeviceChain':
      return normalizeDeviceChainData(device);
    case 'Sampler':
      return normalizeSamplerData(device);
    case 'Filter':
      return normalizeFilterData(device);
    case 'PingPongDelay':
      return normalizePingPongDelayData(device);
    default:
      return;
  }
};

export const normalizeDeviceChainData = (
  deviceChain: DeepPartial<SerializedDeviceChain>
): SerializedDeviceChain => ({
  name: 'DeviceChain',
  inputGain: deviceChain.inputGain ?? 1,
  volume: deviceChain.volume ?? 1,
  devices: (Array.isArray(deviceChain.devices) ? deviceChain.devices : [])
    .filter(
      (maybeDevice): maybeDevice is DeepPartial<SerializedDevice> =>
        !!maybeDevice
    )
    .map(normalizeDeviceData)
    .filter((maybeDevice): maybeDevice is SerializedDevice => !!maybeDevice),
});

export const normalizeTrackData = (
  track: DeepPartial<SerializedTrack>
): SerializedTrack => ({
  chain: normalizeDeviceChainData({
    ...track.chain,
    devices: track.chain?.devices,
  }),
});

export const normalizeData = (
  parsedData: DeepPartial<SerializedEngine & { samplers: SerializedSampler[] }>
): SerializedEngine => {
  return {
    bpm: parsedData.bpm ?? 120,
    swing: parsedData.swing ?? 0,
    currentPatternIndex: parsedData.currentPatternIndex ?? 0,
    tracks: [
      ...(Array.isArray(parsedData.tracks) ? parsedData.tracks : [])
        .filter(
          (maybeTrack): maybeTrack is DeepPartial<SerializedTrack> =>
            !!maybeTrack
        )
        .map((track) => normalizeTrackData({ ...track })),

      ...(Array.isArray(parsedData.samplers) ? parsedData.samplers : []).map(
        (sampler): SerializedTrack => ({
          chain: {
            name: 'DeviceChain',
            inputGain: 1,
            volume: 1,
            devices: [
              normalizeSamplerData({
                ...sampler,
                name: 'Sampler',
              }),
            ],
          },
        })
      ),
    ],
  };
};

export type DeepPartial<T> = T extends object
  ? {
      [P in keyof T]?: DeepPartial<T[P]>;
    }
  : T;
