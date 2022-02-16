import { SerializedCompressor } from './device/Compressor';
import { SerializedDeviceChain } from './device/DeviceChain';
import { SerializedDistortion } from './device/Distortion';
import { SerializedFilter } from './device/Filter';
import { SerializedPingPongDelay } from './device/PingPongDelay';
import { SerializedReverb } from './device/Reverb';
import { SerializedSampler } from './device/Sampler';
import { SerializedTrack } from './Track';

export type SerializedDevice =
  | SerializedSampler
  | SerializedDeviceChain
  | SerializedFilter
  | SerializedPingPongDelay
  | SerializedReverb
  | SerializedDistortion
  | SerializedCompressor;

export type SerializedEngine = {
  currentPatternIndex: number;
  bpm: number;
  swing: number;
  tracks: SerializedTrack[];
};

export type DeepPartial<T> = T extends object
  ? {
      [P in keyof T]?: DeepPartial<T[P]>;
    }
  : T;

export const subdivisions = [
  -0.5,
  ...Array.from({ length: 7 }).map((_, index) => Math.pow(2, index)),
];

export const subdivisionTypes = ['n', 't', 'n.'] as const;
