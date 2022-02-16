import { Engine } from '../Engine';
import { SerializedDevice } from '../types';
import { DeviceChain } from './DeviceChain';
import { Distortion } from './Distortion';
import { Filter } from './Filter';
import { PingPongDelay } from './PingPongDelay';
import { Reverb } from './Reverb';
import { Sampler } from './Sampler';

export const createDevice = (
  engine: Engine,
  serializedDevice: SerializedDevice
) => {
  switch (serializedDevice.name) {
    case 'DeviceChain':
      return new DeviceChain(engine, serializedDevice);
    case 'Sampler':
      return new Sampler(engine, serializedDevice);
    case 'Filter':
      return new Filter(engine, serializedDevice);
    case 'PingPongDelay':
      return new PingPongDelay(engine, serializedDevice);
    case 'Reverb':
      return new Reverb(engine, serializedDevice);
    case 'Distortion':
      return new Distortion(engine, serializedDevice);
  }
};
