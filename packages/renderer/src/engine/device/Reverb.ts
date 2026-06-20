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

  // The wet level the user dialled in. Ducked to 0 while the transport is
  // stopped so the reverb tail doesn't keep ringing after stop.
  private configuredWet = 0.2;

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

    this.engine.on('start', this.handleTransportStart);
    this.engine.on('stop', this.handleTransportStop);
    if (this.engine.transport.state !== 'started') {
      this.reverbNode.wet.value = 0;
    }
  }

  emitChange = () => this.emit('change', this);

  private handleTransportStart = () => {
    this.reverbNode.wet.rampTo(this.configuredWet, 0.03);
  };

  private handleTransportStop = () => {
    this.reverbNode.wet.rampTo(0, 0.05);
  };

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
          this.configuredWet = entry[1] ?? 0.2;
          if (this.engine.transport.state === 'started') {
            this.reverbNode.set({ wet: this.configuredWet });
          }
          break;
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      this.emit(`${entry[0]}Updated` as any, entry[1]);
    });

    super.set(partialSerializedReverb);
  }

  dispose(): void {
    super.dispose();
    this.engine.off('start', this.handleTransportStart);
    this.engine.off('stop', this.handleTransportStop);
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
