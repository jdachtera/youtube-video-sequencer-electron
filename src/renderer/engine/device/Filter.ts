import { Device, SerializedDeviceBase } from './Device';
import { entries, PropertyUpdateEvents } from '../helpers';

import { Frequency, OnePoleFilter } from 'tone';
import { Engine } from '../Engine';

export type SerializedFilter = SerializedDeviceBase & {
  name: 'Filter';
  frequency: number;
  type: OnePoleFilter['type'];
};

type DeviceChainEvents = {
  deviceAdded: (sampler: Device) => void;
  deviceRemoved: (sampler: Device) => void;
  change: (deviceChain: Device) => void;
} & PropertyUpdateEvents<SerializedFilter>;

export class Filter extends Device<DeviceChainEvents> {
  filterNode = new OnePoleFilter();

  constructor(engine: Engine, serializedFilter: Partial<SerializedFilter>) {
    super(engine);
    this.input.connect(this.filterNode);
    this.filterNode.connect(this.output);
    this.set(serializedFilter);
  }

  set(partialSerializedFilter: Partial<SerializedFilter>) {
    super.set(partialSerializedFilter);

    entries(partialSerializedFilter).forEach((entry) => {
      if (!entry) return;
      switch (entry[0]) {
        case 'frequency':
          this.filterNode.frequency = entry[1]!;
          break;
        case 'type':
          this.filterNode.type = entry[1]!;
          break;
      }
      this.emit(`${entry[0]}Updated` as any, entry[1]);
    });

    this.emit('change', this);
  }

  dispose(): void {
    super.dispose();
    this.filterNode.dispose();
  }

  serialize(): SerializedFilter {
    return {
      name: 'Filter',
      volume: this.output.gain.value,
      inputGain: this.input.gain.value,
      type: this.filterNode.type,
      frequency: Frequency(this.filterNode.frequency).toFrequency(),
    };
  }
}
