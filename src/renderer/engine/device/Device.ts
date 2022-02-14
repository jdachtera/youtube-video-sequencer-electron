import {
  DefaultListener,
  ListenerSignature,
  TypedEmitter,
} from 'tiny-typed-emitter';
import { Gain } from 'tone';

import { Engine } from '../Engine';
import { entries, PropertyUpdateEvents } from '../helpers';
import { SerializedDevice, Step } from '../types';

export type SerializedDeviceBase = {
  volume: number;
  inputGain: number;
};

type DeviceEvents<L extends ListenerSignature<L> = DefaultListener> =
  PropertyUpdateEvents<SerializedDeviceBase> & {
    change: (device: Device<L>) => void;
    sequenceEvent: (time: number, step: Step) => void;
  };

export abstract class Device<
  L extends ListenerSignature<L> = DefaultListener
> extends TypedEmitter<DeviceEvents<L> & L> {
  input = new Gain();
  output = new Gain();

  private inputDevice?: Device;

  constructor(public engine: Engine) {
    super();
  }

  async hasLoaded(): Promise<void> {
    //
  }

  handleSequenceEvent = (time: number, step: Step) => {
    //
  };

  dispose() {
    this.setInputDevice(undefined);
    this.input.dispose();
    this.output.dispose();
  }

  set(partialSerializedDevice: Partial<SerializedDeviceBase>) {
    entries(partialSerializedDevice).forEach((entry) => {
      if (!entry) return;
      switch (entry[0]) {
        case 'inputGain':
          this.input.gain.value = entry[1] ?? 1;
          break;
        case 'volume':
          this.output.gain.value = entry[1] ?? 1;
          break;
      }
    });
  }

  setInputDevice(device?: Device) {
    this.inputDevice?.output.disconnect(this.input);
    this.inputDevice?.off('sequenceEvent', this.handleSequenceEvent);
    this.inputDevice = device;
    this.inputDevice?.output.connect(this.input);
    this.inputDevice?.on('sequenceEvent', this.handleSequenceEvent);
  }

  abstract serialize(): SerializedDevice;
}
