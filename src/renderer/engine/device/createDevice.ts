import { Engine } from '../Engine';
import { SerializedDevice } from '../types';
import { CompressorDevice } from './Compressor';
import { DeviceChain } from './DeviceChain';
import { DistortionDevice } from './Distortion';
import { FilterDevice } from './Filter';
import { PingPongDelayDevice } from './PingPongDelay';
import { ReverbDevice } from './Reverb';
import { SamplerDevice } from './Sampler';

export const createDevice = (
  engine: Engine,
  serializedDevice: SerializedDevice
) => {
  switch (serializedDevice.name) {
    case 'DeviceChain':
      return new DeviceChain(engine, serializedDevice);
    case 'Sampler':
      return new SamplerDevice(engine, serializedDevice);
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
