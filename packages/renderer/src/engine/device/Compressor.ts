import { Compressor as CompressorNode, Time } from 'tone';
import type { Engine } from '../Engine';
import type { PropertyUpdateEvents } from '../helpers';
import { entries } from '../helpers';
import type { DeepPartial } from '../types';
import { Device } from './Device';
import type { SerializedDeviceBase } from './Device';

export type SerializedCompressorDevice = SerializedDeviceBase & {
  name: 'Compressor';
  attack: number;
  release: number;
  knee: number;
  ratio: number;
  threshold: number;
};

type CompressorDeviceEvents = {
  change: (deviceChain: CompressorDevice) => void;
} & PropertyUpdateEvents<SerializedCompressorDevice>;

export class CompressorDevice extends Device<CompressorDeviceEvents> {
  compressorNode = new CompressorNode();

  static normalizeData = (
    compressor: DeepPartial<SerializedCompressorDevice>,
  ): SerializedCompressorDevice => ({
    name: 'Compressor',
    collapsed: false,
    inputGain: compressor.inputGain ?? 1,
    volume: compressor.volume ?? 1,
    attack: compressor.attack ?? 0.1,
    release: compressor.release ?? 0.1,
    knee: compressor.knee ?? 0.3,
    ratio: compressor.ratio ?? 1,
    threshold: compressor.threshold ?? -10,
    bypass: compressor.bypass ?? false,
    color: 'green',
  });

  constructor(
    engine: Engine,
    serializedCompressor: Partial<SerializedCompressorDevice>,
  ) {
    super(engine);
    this.connectEffect(this.compressorNode);
    this.set(serializedCompressor);
  }

  emitChange = () => this.emit('change', this);

  set(partialSerializedCompressor: Partial<SerializedCompressorDevice>) {
    entries(partialSerializedCompressor).forEach((entry) => {
      if (!entry) return;

      switch (entry[0]) {
        case 'attack':
          this.compressorNode.set({ attack: entry[1] });
          break;
        case 'knee':
          this.compressorNode.set({ knee: entry[1] });
          break;
        case 'ratio':
          this.compressorNode.set({ ratio: entry[1] });
          break;
        case 'release':
          this.compressorNode.set({ release: entry[1] });
          break;
        case 'threshold':
          this.compressorNode.set({ threshold: entry[1] });
          break;
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      this.emit(`${entry[0]}Updated` as any, entry[1]);
    });

    super.set(partialSerializedCompressor);
  }

  dispose(): void {
    super.dispose();
    this.compressorNode.dispose();
  }

  serialize(): SerializedCompressorDevice {
    return {
      name: 'Compressor',
      collapsed: this.collapsed,
      color: this.color,
      volume: this.output.gain.value,
      inputGain: this.input.gain.value,
      attack: Time(this.compressorNode.attack.value).toSeconds(),
      release: Time(this.compressorNode.release.value).toSeconds(),
      knee: this.compressorNode.knee.value,
      ratio: this.compressorNode.ratio.value,
      threshold: this.compressorNode.threshold.value,
      bypass: this.bypassed,
    };
  }
}
