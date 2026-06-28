import type { DefaultListener, ListenerSignature } from 'tiny-typed-emitter';
import { Gain } from 'tone';
import type { ToneAudioNode } from 'tone';
import type { Engine } from '../Engine';
import { EngineBase } from '../EngineBase';
import type { PropertyUpdateEvents } from '../helpers';
import { entries } from '../helpers';
import type { SerializedDevice } from '../types';
import type { Step } from './Patttern';

export type SerializedDeviceBase = {
  volume: number;
  inputGain: number;
  color: string;
  collapsed: boolean;
  // Effects only: when true the effect is bypassed (the dry input passes
  // straight through). Optional so non-effect devices don't have to serialize
  // it.
  bypass?: boolean;
};

type DeviceEvents = PropertyUpdateEvents<SerializedDeviceBase> & {
  change: (device: Device) => void;
  sequenceEvent: (time: number, step: Step) => void;
};

export abstract class Device<
  L extends ListenerSignature<L> = DefaultListener,
> extends EngineBase<DeviceEvents & L> {
  input = new Gain();
  output = new Gain();

  collapsed = false;
  color = 'gray';
  bypassed = false;

  // Bypass is a wet/dry crossfade: the effect (wet) runs through `wetGain` and
  // a parallel dry tap runs through `dryGain`; bypassing fades wet->0, dry->1.
  // Gain automation is robust and click-free, unlike re-patching connect edges.
  // Created lazily by connectEffect so non-effect devices don't allocate them.
  private wetGain?: Gain;
  private dryGain?: Gain;

  private inputDevice?: Device<ListenerSignature<unknown>>;

  constructor(public engine: Engine) {
    super();
  }

  // Effects call this instead of wiring input -> node -> output by hand, so the
  // base class can insert the wet/dry bypass crossfade around the effect node.
  protected connectEffect(node: ToneAudioNode) {
    this.wetGain = new Gain(this.bypassed ? 0 : 1);
    this.dryGain = new Gain(this.bypassed ? 1 : 0);
    // Wet path: input -> effect -> wetGain -> output.
    this.input.connect(node);
    node.connect(this.wetGain);
    this.wetGain.connect(this.output);
    // Dry path: input -> dryGain -> output.
    this.input.connect(this.dryGain);
    this.dryGain.connect(this.output);
  }

  private applyBypassRouting() {
    this.wetGain?.gain.rampTo(this.bypassed ? 0 : 1, 0.01);
    this.dryGain?.gain.rampTo(this.bypassed ? 1 : 0, 0.01);
  }

  setBypassed(bypassed: boolean) {
    if (bypassed === this.bypassed) return;
    this.bypassed = bypassed;
    this.applyBypassRouting();
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
    this.wetGain?.dispose();
    this.dryGain?.dispose();
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
        case 'bypass':
          this.setBypassed(entry[1] ?? false);
          break;
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (this as any).emit(`${entry[0]}Updated`, entry[1]);
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
