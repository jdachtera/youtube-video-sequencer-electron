import { Reverb as ReverbNode, Time } from 'tone';
import type { NormalRange } from 'tone/build/esm/core/type/Units';
import type { Engine } from '../Engine';
import type { PropertyUpdateEvents } from '../helpers';
import { entries } from '../helpers';
import type { DeepPartial } from '../types';
import { Device } from './Device';
import type { SerializedDeviceBase } from './Device';

export type SerializedReverbDevice = SerializedDeviceBase & {
  name: 'Reverb';
  decay: number;
  preDelay: number;
  wet: NormalRange;
};

type ReverbDeviceEvents = {
  change: (deviceChain: ReverbDevice) => void;
} & PropertyUpdateEvents<SerializedReverbDevice>;

export class ReverbDevice extends Device<ReverbDeviceEvents> {
  reverbNode = new ReverbNode();

  static normalizeData = (
    reverb: DeepPartial<SerializedReverbDevice>,
  ): SerializedReverbDevice => ({
    name: 'Reverb',
    collapsed: false,
    inputGain: reverb.inputGain ?? 1,
    volume: reverb.volume ?? 1,
    decay: reverb.decay ?? 2,
    preDelay: reverb.preDelay ?? 0.2,
    wet: reverb.wet ?? 0.2,
    color: 'blue',
  });

  constructor(
    engine: Engine,
    serializedReverb: Partial<SerializedReverbDevice>,
  ) {
    super(engine);
    this.input.connect(this.reverbNode);
    this.reverbNode.connect(this.output);
    this.set(serializedReverb);
  }

  emitChange = () => this.emit('change', this);

  set(partialSerializedReverb: Partial<SerializedReverbDevice>) {
    entries(partialSerializedReverb).forEach((entry) => {
      if (!entry) return;

      switch (entry[0]) {
        case 'decay':
          this.reverbNode.set({
            decay: entry[1],
          });
          break;
        case 'preDelay':
          this.reverbNode.set({
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            preDelay: entry[1]!,
          });
          break;
        case 'wet':
          this.reverbNode.set({
            wet: entry[1] ?? 0.3,
          });
          break;
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      this.emit(`${entry[0]}Updated` as any, entry[1]);
    });

    super.set(partialSerializedReverb);
  }

  dispose(): void {
    super.dispose();
    this.reverbNode.dispose();
  }

  serialize(): SerializedReverbDevice {
    return {
      name: 'Reverb',
      collapsed: this.collapsed,
      color: this.color,
      volume: this.output.gain.value,
      inputGain: this.input.gain.value,
      decay: Time(this.reverbNode.decay).toSeconds(),
      preDelay: Time(this.reverbNode.preDelay).toSeconds(),
      wet: this.reverbNode.wet.value,
    };
  }
}
