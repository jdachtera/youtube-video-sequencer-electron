/* eslint-disable @typescript-eslint/no-non-null-assertion */
import type { SerializedDeviceBase } from './Device';
import { Device } from './Device';
import type { PropertyUpdateEvents } from '../helpers';
import { entries } from '../helpers';

import {
  Frequency,
  Filter as FilterNode,
  Envelope,
  Scale,
  Time,
  Add,
} from 'tone';
import type { Engine } from '../Engine';
import type { DeepPartial } from '../types';
import type { Step } from './Patttern';

export type SerializedFilterDevice = SerializedDeviceBase & {
  name: 'Filter';
  frequency: number;
  resonance: number;
  rolloff: FilterNode['rolloff'];
  type: FilterNode['type'];
  envAmount: number;
  attack: number;
  decay: number;
  release: number;
  sustain: number;
};

type FilterDeviceEvents = {
  deviceAdded: (sampler: Device) => void;
  deviceRemoved: (sampler: Device) => void;
  change: (deviceChain: Device) => void;
} & PropertyUpdateEvents<SerializedFilterDevice>;

export class FilterDevice extends Device<FilterDeviceEvents> {
  filterNode = new FilterNode();
  envelope = new Envelope(0.1, 0.3, 0, 0.1);

  frequencyAccumulator = new Add(4000);

  envelopeScale = new Scale(0, 500);

  static normalizeData = (
    filter: DeepPartial<SerializedFilterDevice>,
  ): SerializedFilterDevice => ({
    name: 'Filter',
    collapsed: false,
    inputGain: filter.inputGain ?? 1,
    volume: filter.volume ?? 1,
    frequency: filter.frequency ?? 4000,
    type: filter.type ?? 'lowpass',
    resonance: filter.resonance ?? 0.1,
    rolloff: filter.rolloff ?? -12,
    envAmount: filter.envAmount ?? 0,
    attack: filter.attack ?? 0.1,
    decay: filter.decay ?? 0.3,
    release: filter.release ?? 0.1,
    sustain: filter.sustain ?? 0,
    color: 'cyan',
  });

  constructor(
    engine: Engine,
    serializedFilter: Partial<SerializedFilterDevice>,
  ) {
    super(engine);
    this.input.connect(this.filterNode);
    this.filterNode.connect(this.output);
    this.frequencyAccumulator.connect(this.filterNode.frequency);
    this.envelopeScale.connect(this.frequencyAccumulator);

    this.envelope.connect(this.envelopeScale);
    this.set(serializedFilter);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  handleSequenceEvent = (time: number, step: Step) => {
    if (step.play) {
      this.envelope.triggerAttack(time);
    }
  };

  emitChange = () => this.emit('change', this);

  set(partialSerializedFilter: Partial<SerializedFilterDevice>) {
    entries(partialSerializedFilter).forEach((entry) => {
      if (!entry) return;

      switch (entry[0]) {
        case 'frequency':
          this.frequencyAccumulator.addend.set({
            value: Frequency(entry[1]).toFrequency(),
          });
          break;
        case 'resonance':
          this.filterNode.set({
            Q: entry[1],
          });
          break;
        case 'rolloff':
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          this.filterNode.rolloff = entry[1]!;
          break;
        case 'type':
          this.filterNode.type = entry[1]!;
          break;
        case 'envAmount':
          this.envelopeScale.max = entry[1]!;
          break;
        case 'attack':
        case 'decay':
        case 'sustain':
        case 'release':
          this.envelope.set({ [entry[0]]: entry[1]! });
          break;
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      this.emit(`${entry[0]}Updated` as any, entry[1]);
    });

    super.set(partialSerializedFilter);
  }

  dispose(): void {
    super.dispose();
    this.filterNode.dispose();
  }

  serialize(): SerializedFilterDevice {
    return {
      name: 'Filter',
      collapsed: this.collapsed,
      color: this.color,
      volume: this.output.gain.value,
      inputGain: this.input.gain.value,
      type: this.filterNode.type,
      frequency: this.frequencyAccumulator.addend.value,
      resonance: this.filterNode.Q.value,
      rolloff: this.filterNode.rolloff,
      envAmount: this.envelopeScale.max,
      attack: Time(this.envelope.attack).toSeconds(),
      decay: Time(this.envelope.decay).toSeconds(),
      sustain: this.envelope.sustain,
      release: Time(this.envelope.release).toSeconds(),
    };
  }
}
