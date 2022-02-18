import { SerializedCompressorDevice } from './device/Compressor';
import { SerializedDeviceChain } from './device/DeviceChain';
import { SerializedDistortionDevice } from './device/Distortion';
import { SerializedFilterDevice } from './device/Filter';
import { SerializedPingPongDelayDevice } from './device/PingPongDelay';
import { SerializedReverbDevice } from './device/Reverb';
import { SerializedSamplerDevice } from './device/Sampler';

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
