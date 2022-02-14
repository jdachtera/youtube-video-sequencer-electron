import { SerializedDeviceChain } from './device/DeviceChain';
import { SerializedFilter } from './device/Filter';
import { SerializedSampler } from './device/Sampler';
import { SerializedTrack } from './Track';

export type SerializedSlice = {
  id: string;
  start: number;
  end: number;
  volume: number;
  playbackSpeed: number;
  reverse: boolean;
  color: string;
  patterns: Pattern[];
  name: string;
  solo: boolean;
  collapsed: boolean;
};

export type Pattern = {
  subdivision: number;
  subdivisionType: typeof subdivisionTypes[number];
  steps: Step[];
};

export type Action =
  | {
      type: 'PLAY';
      velocity?: number;
    }
  | {
      type: 'PAUSE';
    }
  | {
      type: 'SET_PLAYBACK_SPEED';
      value: number;
    }
  | {
      type: 'SET_REVERSE';
      value: boolean;
    };

export type Step = {
  actions: Action[];
};

export type SerializedDevice =
  | SerializedSampler
  | SerializedDeviceChain
  | SerializedFilter;

export type SerializedEngine = {
  currentPatternIndex: number;
  bpm: number;
  swing: number;
  tracks: SerializedTrack[];
};

export const subdivisions = [
  -0.5,
  ...Array.from({ length: 7 }).map((_, index) => Math.pow(2, index)),
];

export const subdivisionTypes = ['n', 't', 'n.'] as const;
