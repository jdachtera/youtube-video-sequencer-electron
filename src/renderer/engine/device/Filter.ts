import { Device, SerializedDeviceBase } from './Device';
import { entries, PropertyUpdateEvents } from '../helpers';

import { Frequency, Filter as FilterNode } from 'tone';
import { Engine } from '../Engine';
import { DeepPartial } from '../types';

export type SerializedFilter = SerializedDeviceBase & {
  name: 'Filter';
  frequency: number;
  resonance: number;
  rolloff: FilterNode['rolloff'];
  type: FilterNode['type'];
};

type DeviceChainEvents = {
  deviceAdded: (sampler: Device) => void;
  deviceRemoved: (sampler: Device) => void;
  change: (deviceChain: Device) => void;
} & PropertyUpdateEvents<SerializedFilter>;

export class Filter extends Device<DeviceChainEvents> {
  filterNode = new FilterNode();

  static normalizeData = (
    filter: DeepPartial<SerializedFilter>
  ): SerializedFilter => ({
    name: 'Filter',
    inputGain: filter.inputGain ?? 1,
    volume: filter.volume ?? 1,
    frequency: filter.frequency ?? 4000,
    type: filter.type ?? 'lowpass',
    resonance: filter.resonance ?? 0.1,
    rolloff: filter.rolloff ?? -12,
  });

  constructor(engine: Engine, serializedFilter: Partial<SerializedFilter>) {
    super(engine);
    this.input.connect(this.filterNode);
    this.filterNode.connect(this.output);
    this.set(serializedFilter);
  }

  emitChange = () => this.emit('change', this);

  set(partialSerializedFilter: Partial<SerializedFilter>) {
    entries(partialSerializedFilter).forEach((entry) => {
      if (!entry) return;

      switch (entry[0]) {
        case 'frequency':
          this.filterNode.set({
            frequency: Frequency(Math.round(entry[1]!)).toFrequency(),
          });
          break;
        case 'resonance':
          this.filterNode.set({
            Q: entry[1],
          });
          break;
        case 'rolloff':
          this.filterNode.rolloff = entry[1]!;
          break;
        case 'type':
          this.filterNode.type = entry[1]!;
          break;
      }
      this.emit(`${entry[0]}Updated` as any, entry[1]);
    });

    super.set(partialSerializedFilter);
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
      frequency: Frequency(this.filterNode.frequency.value).toFrequency(),
      resonance: this.filterNode.Q.value,
      rolloff: this.filterNode.rolloff,
    };
  }
}
