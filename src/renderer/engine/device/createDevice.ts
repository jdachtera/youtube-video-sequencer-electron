import { Engine } from '../Engine';
import { SerializedDevice } from '../types';
import { DeviceChain } from './DeviceChain';
import { Filter } from './Filter';
import { PingPongDelay } from './PingPongDelay';
import { Sampler } from './Sampler';

export const createDevice = (
  engine: Engine,
  serializedDevice: SerializedDevice
) => {
  switch (serializedDevice.name) {
    case 'DeviceChain':
      return new DeviceChain(engine, serializedDevice);
      break;
    case 'Sampler':
      return new Sampler(engine, serializedDevice);
      break;
    case 'Filter':
      return new Filter(engine, serializedDevice);
      break;
    case 'PingPongDelay':
      return new PingPongDelay(engine, serializedDevice);
      break;
  }
};
