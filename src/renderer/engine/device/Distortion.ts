import { Device, SerializedDeviceBase } from './Device';
import { entries, PropertyUpdateEvents } from '../helpers';

import { Distortion as DistortionNode, Time } from 'tone';
import { Engine } from '../Engine';

import { DeepPartial } from '../types';

export type SerializedDistortion = SerializedDeviceBase & {
  name: 'Distortion';
  distortion: number;
};

type DistortionEvents = {
  change: (deviceChain: Distortion) => void;
} & PropertyUpdateEvents<SerializedDistortion>;

export class Distortion extends Device<DistortionEvents> {
  distortionNode = new DistortionNode();

  static normalizeData = (
    distortion: DeepPartial<SerializedDistortion>
  ): SerializedDistortion => ({
    name: 'Distortion',
    inputGain: distortion.inputGain ?? 1,
    volume: distortion.volume ?? 1,
    distortion: distortion.distortion ?? 0.1,
  });

  constructor(
    engine: Engine,
    serializedDistortion: Partial<SerializedDistortion>
  ) {
    super(engine);
    this.input.connect(this.distortionNode);
    this.distortionNode.connect(this.output);
    this.set(serializedDistortion);
  }

  emitChange = () => this.emit('change', this);

  set(partialSerializedDistortion: Partial<SerializedDistortion>) {
    entries(partialSerializedDistortion).forEach((entry) => {
      if (!entry) return;

      switch (entry[0]) {
        case 'distortion':
          this.distortionNode.set({
            distortion: entry[1] ?? 100,
          });
          break;
      }
      this.emit(`${entry[0]}Updated` as any, entry[1]);
    });

    super.set(partialSerializedDistortion);
  }

  dispose(): void {
    super.dispose();
    this.distortionNode.dispose();
  }

  serialize(): SerializedDistortion {
    return {
      name: 'Distortion',
      volume: this.output.gain.value,
      inputGain: this.input.gain.value,
      distortion: this.distortionNode.distortion,
    };
  }
}
