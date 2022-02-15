import { Device, SerializedDeviceBase } from './Device';
import { entries, PropertyUpdateEvents } from '../helpers';

import { Reverb as ReverbNode, Time } from 'tone';
import { Engine } from '../Engine';
import { NormalRange } from 'tone/build/esm/core/type/Units';
import { DeepPartial } from '../types';

export type SerializedReverb = SerializedDeviceBase & {
  name: 'Reverb';
  decay: number;
  preDelay: number;
  wet: NormalRange;
};

type ReverbEvents = {
  change: (deviceChain: Reverb) => void;
} & PropertyUpdateEvents<SerializedReverb>;

export class Reverb extends Device<ReverbEvents> {
  reverbNode = new ReverbNode();

  static normalizeData = (
    reverb: DeepPartial<SerializedReverb>
  ): SerializedReverb => ({
    name: 'Reverb',
    inputGain: reverb.inputGain ?? 1,
    volume: reverb.volume ?? 1,
    decay: reverb.decay ?? 100,
    preDelay: reverb.preDelay ?? 0.2,
    wet: reverb.wet ?? 0.2,
  });

  constructor(engine: Engine, serializedReverb: Partial<SerializedReverb>) {
    super(engine);
    this.input.connect(this.reverbNode);
    this.reverbNode.connect(this.output);
    this.set(serializedReverb);
  }

  emitChange = () => this.emit('change', this);

  set(partialSerializedReverb: Partial<SerializedReverb>) {
    entries(partialSerializedReverb).forEach((entry) => {
      if (!entry) return;

      switch (entry[0]) {
        case 'decay':
          this.reverbNode.set({
            decay: entry[1] ?? 100,
          });
          break;
        case 'preDelay':
          this.reverbNode.set({
            preDelay: entry[1] ?? 100,
          });
          break;
        case 'wet':
          this.reverbNode.set({
            wet: entry[1] ?? 0.3,
          });
          break;
      }
      this.emit(`${entry[0]}Updated` as any, entry[1]);
    });

    super.set(partialSerializedReverb);
  }

  dispose(): void {
    super.dispose();
    this.reverbNode.dispose();
  }

  serialize(): SerializedReverb {
    return {
      name: 'Reverb',
      volume: this.output.gain.value,
      inputGain: this.input.gain.value,
      decay: Time(this.reverbNode.decay).toSeconds(),
      preDelay: Time(this.reverbNode.preDelay).toSeconds(),
      wet: this.reverbNode.wet.value,
    };
  }
}
