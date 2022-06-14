import type { DeepPartial, SerializedDevice } from '../types';
import { CompressorDevice } from './Compressor';
import { DeviceChain } from './DeviceChain';
import { DistortionDevice } from './Distortion';
import { FilterDevice } from './Filter';
import { PingPongDelayDevice } from './PingPongDelay';
import { ReverbDevice } from './Reverb';
import { SequencerDevice } from './Sequencer';
import { Slice } from './Slice';

export const normalizeDeviceData = (device: DeepPartial<SerializedDevice>) => {
  switch (device.name) {
    case 'DeviceChain':
      return DeviceChain.normalizeData(device);
    case 'Sequencer':
      return SequencerDevice.normalizeData(device);
    case 'Slice':
      return Slice.normalizeData(device);
    case 'Filter':
      return FilterDevice.normalizeData(device);
    case 'PingPongDelay':
      return PingPongDelayDevice.normalizeData(device);
    case 'Reverb':
      return ReverbDevice.normalizeData(device);
    case 'Distortion':
      return DistortionDevice.normalizeData(device);
    case 'Compressor':
      return CompressorDevice.normalizeData(device);
    default:
      return;
  }
};
