import {
  DefaultListener,
  ListenerSignature,
  TypedEmitter,
} from 'tiny-typed-emitter';
import { Gain } from 'tone';

import { Engine } from '../Engine';
import { entries, PropertyUpdateEvents } from '../helpers';

import { SerializedDevice } from '../types';

import { Step } from './Slice';

export type SerializedDeviceBase = {
  volume: number;
  inputGain: number;
  color: string;
  collapsed: boolean;
};

type DeviceEvents = PropertyUpdateEvents<SerializedDeviceBase> & {
  change: (device: Device) => void;
  sequenceEvent: (time: number, step: Step) => void;
};

export abstract class Device<
  L extends ListenerSignature<L> = DefaultListener
> extends TypedEmitter<DeviceEvents & L> {
  input = new Gain();
  output = new Gain();

  collapsed = false;
  color = 'gray';

  private inputDevice?: Device<ListenerSignature<unknown>>;

  constructor(public engine: Engine) {
    super();
  }

  abstract emitChange(): void;
  abstract serialize(): SerializedDevice;

  async hasLoaded(): Promise<void> {
    //
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
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
        case 'color':
          this.color = entry[1] ?? 'gray';
          break;
        case 'inputGain':
          this.input.gain.value = entry[1] ?? 1;
          break;
        case 'volume':
          this.output.gain.value = entry[1] ?? 1;
          break;
        case 'collapsed':
          this.collapsed = entry[1] ?? false;
          break;
      }
    });
    this.emitChange();
  }

  setInputDevice(device?: Device) {
    try {
      this.inputDevice?.output.disconnect(this.input);
      this.inputDevice?.off('sequenceEvent', this.handleSequenceEvent);
    } catch {
      //
    }

    this.inputDevice = device;
    this.inputDevice?.output.connect(this.input);
    this.inputDevice?.on('sequenceEvent', this.handleSequenceEvent);
  }
}
