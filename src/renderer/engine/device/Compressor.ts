import { Device, SerializedDeviceBase } from './Device';
import { entries, PropertyUpdateEvents } from '../helpers';

import { Compressor as CompressorNode, Time } from 'tone';
import { Engine } from '../Engine';

import { DeepPartial } from '../types';

export type SerializedCompressor = SerializedDeviceBase & {
  name: 'Compressor';
  attack: number;
  release: number;
  knee: number;
  ratio: number;
  threshold: number;
};

type CompressorEvents = {
  change: (deviceChain: Compressor) => void;
} & PropertyUpdateEvents<SerializedCompressor>;

export class Compressor extends Device<CompressorEvents> {
  compressorNode = new CompressorNode();

  static normalizeData = (
    compressor: DeepPartial<SerializedCompressor>
  ): SerializedCompressor => ({
    name: 'Compressor',
    inputGain: compressor.inputGain ?? 1,
    volume: compressor.volume ?? 1,
    attack: compressor.attack ?? 0.1,
    release: compressor.release ?? 0.1,
    knee: compressor.knee ?? 0.3,
    ratio: compressor.ratio ?? 1,
    threshold: compressor.threshold ?? -10,
  });

  constructor(
    engine: Engine,
    serializedCompressor: Partial<SerializedCompressor>
  ) {
    super(engine);
    this.input.connect(this.compressorNode);
    this.compressorNode.connect(this.output);
    this.set(serializedCompressor);
  }

  emitChange = () => this.emit('change', this);

  set(partialSerializedCompressor: Partial<SerializedCompressor>) {
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
      this.emit(`${entry[0]}Updated` as any, entry[1]);
    });

    super.set(partialSerializedCompressor);
  }

  dispose(): void {
    super.dispose();
    this.compressorNode.dispose();
  }

  serialize(): SerializedCompressor {
    return {
      name: 'Compressor',
      volume: this.output.gain.value,
      inputGain: this.input.gain.value,
      attack: Time(this.compressorNode.attack.value).toSeconds(),
      release: Time(this.compressorNode.release.value).toSeconds(),
      knee: this.compressorNode.knee.value,
      ratio: this.compressorNode.ratio.value,
      threshold: this.compressorNode.threshold.value,
    };
  }
}
