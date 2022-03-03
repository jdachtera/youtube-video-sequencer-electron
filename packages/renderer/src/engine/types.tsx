import type { SerializedCompressorDevice } from './device/Compressor';
import type { SerializedDeviceChain } from './device/DeviceChain';
import type { SerializedDistortionDevice } from './device/Distortion';
import type { SerializedFilterDevice } from './device/Filter';
import type { SerializedPingPongDelayDevice } from './device/PingPongDelay';
import type { SerializedReverbDevice } from './device/Reverb';
import type { SerializedSamplerDevice } from './device/Sampler';

export type SerializedDevice =
  | SerializedSamplerDevice
  | SerializedDeviceChain
  | SerializedFilterDevice
  | SerializedPingPongDelayDevice
  | SerializedReverbDevice
  | SerializedDistortionDevice
  | SerializedCompressorDevice;

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
