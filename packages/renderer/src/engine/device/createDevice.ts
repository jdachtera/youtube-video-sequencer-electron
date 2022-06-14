import type { Engine } from '../Engine';
import type { SerializedDevice } from '../types';
import { CompressorDevice } from './Compressor';
import { DeviceChain } from './DeviceChain';
import { DistortionDevice } from './Distortion';
import { FilterDevice } from './Filter';
import { PingPongDelayDevice } from './PingPongDelay';
import { ReverbDevice } from './Reverb';
import { SequencerDevice } from './Sequencer';
import { Slice } from './Slice';

export const createDevice = (
  engine: Engine,
  serializedDevice: SerializedDevice,
) => {
  switch (serializedDevice.name) {
    case 'Sequencer':
      return new SequencerDevice(engine, serializedDevice);
    case 'Slice':
      return new Slice(engine, serializedDevice);
    case 'DeviceChain':
      return new DeviceChain(engine, serializedDevice);
    case 'Filter':
      return new FilterDevice(engine, serializedDevice);
    case 'PingPongDelay':
      return new PingPongDelayDevice(engine, serializedDevice);
    case 'Reverb':
      return new ReverbDevice(engine, serializedDevice);
    case 'Distortion':
      return new DistortionDevice(engine, serializedDevice);
    case 'Compressor':
      return new CompressorDevice(engine, serializedDevice);
  }
};
