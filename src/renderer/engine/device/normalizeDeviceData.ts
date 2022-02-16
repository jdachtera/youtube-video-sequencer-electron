import { DeepPartial, SerializedDevice } from '../types';
import { DeviceChain } from './DeviceChain';
import { Distortion } from './Distortion';
import { Filter } from './Filter';
import { PingPongDelay } from './PingPongDelay';
import { Reverb } from './Reverb';
import { Sampler } from './Sampler';

export const normalizeDeviceData = (device: DeepPartial<SerializedDevice>) => {
  switch (device.name) {
    case 'DeviceChain':
      return DeviceChain.normalizeData(device);
    case 'Sampler':
      return Sampler.normalizeData(device);
    case 'Filter':
      return Filter.normalizeData(device);
    case 'PingPongDelay':
      return PingPongDelay.normalizeData(device);
    case 'Reverb':
      return Reverb.normalizeData(device);
    case 'Distortion':
      return Distortion.normalizeData(device);
    default:
      return;
  }
};
