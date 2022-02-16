import { Device, SerializedDeviceBase } from './Device';
import { entries, PropertyUpdateEvents } from '../helpers';

import { Distortion as DistortionNode } from 'tone';
import { Engine } from '../Engine';

import { DeepPartial } from '../types';

export type SerializedDistortionDevice = SerializedDeviceBase & {
  name: 'Distortion';
  distortion: number;
};

type DistortionDeviceEvents = {
  change: (deviceChain: DistortionDevice) => void;
} & PropertyUpdateEvents<SerializedDistortionDevice>;

export class DistortionDevice extends Device<DistortionDeviceEvents> {
  distortionNode = new DistortionNode();

  static normalizeData = (
    distortion: DeepPartial<SerializedDistortionDevice>
  ): SerializedDistortionDevice => ({
    name: 'Distortion',
    inputGain: distortion.inputGain ?? 1,
    volume: distortion.volume ?? 1,
    distortion: distortion.distortion ?? 0.1,
  });

  constructor(
    engine: Engine,
    serializedDistortion: Partial<SerializedDistortionDevice>
  ) {
    super(engine);
    this.input.connect(this.distortionNode);
    this.distortionNode.connect(this.output);
    this.set(serializedDistortion);
  }

  emitChange = () => this.emit('change', this);

  set(partialSerializedDistortion: Partial<SerializedDistortionDevice>) {
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

  serialize(): SerializedDistortionDevice {
    return {
      name: 'Distortion',
      volume: this.output.gain.value,
      inputGain: this.input.gain.value,
      distortion: this.distortionNode.distortion,
    };
  }
}
