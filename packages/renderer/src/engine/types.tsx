import type { SerializedCompressorDevice } from './device/Compressor';
import type { SerializedDeviceChain } from './device/DeviceChain';
import type { SerializedDistortionDevice } from './device/Distortion';
import type { SerializedFilterDevice } from './device/Filter';
import type { SerializedPingPongDelayDevice } from './device/PingPongDelay';
import type { SerializedReverbDevice } from './device/Reverb';
import type { SerializedSequencerDevice } from './device/Sequencer';
import type { SerializedSlice } from './device/Slice';

export type SerializedDevice =
  | SerializedSequencerDevice
  | SerializedSlice
  | SerializedDeviceChain
  | SerializedFilterDevice
  | SerializedPingPongDelayDevice
  | SerializedReverbDevice
  | SerializedDistortionDevice
  | SerializedCompressorDevice;

export type DeepPartial<T> = T extends Array<unknown>
  ? DeepPartial<T[number]>[]
  : T extends object
  ? {
      [P in keyof T]?: DeepPartial<T[P]>;
    }
  : T;

export const subdivisions = [
  -0.5,
  ...Array.from({ length: 7 }).map((_, index) => Math.pow(2, index)),
];

export const subdivisionTypes = ['n', 't', 'n.'] as const;

type test = {
  bla: { b: 1 }[];
};
