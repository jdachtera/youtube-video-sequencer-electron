import { Distortion as DistortionNode } from 'tone';
import type { Engine } from '../Engine';
import type { PropertyUpdateEvents } from '../helpers';
import { entries } from '../helpers';
import type { DeepPartial } from '../types';
import { Device } from './Device';
import type { SerializedDeviceBase } from './Device';

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
    distortion: DeepPartial<SerializedDistortionDevice>,
  ): SerializedDistortionDevice => ({
    name: 'Distortion',
    collapsed: false,
    inputGain: distortion.inputGain ?? 1,
    volume: distortion.volume ?? 1,
    distortion: distortion.distortion ?? 0.1,
    bypass: distortion.bypass ?? false,
    color: 'yellow',
  });

  constructor(
    engine: Engine,
    serializedDistortion: Partial<SerializedDistortionDevice>,
  ) {
    super(engine);
    this.connectEffect(this.distortionNode);
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
      collapsed: this.collapsed,
      color: this.color,
      volume: this.output.gain.value,
      inputGain: this.input.gain.value,
      distortion: this.distortionNode.distortion,
      bypass: this.bypassed,
    };
  }
}
