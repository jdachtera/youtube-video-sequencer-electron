import type { SerializedDeviceBase } from './Device';
import { Device } from './Device';
import type { PropertyUpdateEvents } from '../helpers';
import { entries } from '../helpers';

import { PingPongDelay as PingPongDelayNode } from 'tone';
import type { Engine } from '../Engine';
import type { NormalRange, Time } from 'tone/build/esm/core/type/Units';
import type { DeepPartial } from '../types';

export type SerializedPingPongDelayDevice = SerializedDeviceBase & {
  name: 'PingPongDelay';
  delayTime: Time;
  wet: NormalRange;
  feedback: NormalRange;
};

type PingPongDelayEvents = {
  change: (deviceChain: PingPongDelayDevice) => void;
} & PropertyUpdateEvents<SerializedPingPongDelayDevice>;

export class PingPongDelayDevice extends Device<PingPongDelayEvents> {
  pingPongDelayNode = new PingPongDelayNode();

  static normalizeData = (
    pingPongDelay: DeepPartial<SerializedPingPongDelayDevice>,
  ): SerializedPingPongDelayDevice => ({
    name: 'PingPongDelay',
    collapsed: false,
    inputGain: pingPongDelay.inputGain ?? 1,
    volume: pingPongDelay.volume ?? 1,
    delayTime: pingPongDelay.delayTime ?? 1,
    feedback: pingPongDelay.feedback ?? 0.2,
    wet: pingPongDelay.wet ?? 0.2,
    color: 'violet',
  });

  constructor(
    engine: Engine,
    serializedPingPongDelay: Partial<SerializedPingPongDelayDevice>,
  ) {
    super(engine);
    this.input.connect(this.pingPongDelayNode);
    this.pingPongDelayNode.connect(this.output);
    this.set(serializedPingPongDelay);
  }

  emitChange = () => this.emit('change', this);

  set(partialSerializedPingPongDelay: Partial<SerializedPingPongDelayDevice>) {
    entries(partialSerializedPingPongDelay).forEach((entry) => {
      if (!entry) return;

      switch (entry[0]) {
        case 'delayTime':
          this.pingPongDelayNode.set({
            delayTime: entry[1] ?? 100,
          });
          break;
        case 'feedback':
          this.pingPongDelayNode.set({
            feedback: entry[1] ?? 100,
          });
          break;
        case 'wet':
          this.pingPongDelayNode.set({
            wet: entry[1] ?? 100,
          });
          break;
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      this.emit(`${entry[0]}Updated` as any, entry[1]);
    });

    super.set(partialSerializedPingPongDelay);
  }

  dispose(): void {
    super.dispose();
    this.pingPongDelayNode.dispose();
  }

  serialize(): SerializedPingPongDelayDevice {
    return {
      name: 'PingPongDelay',
      collapsed: this.collapsed,
      color: this.color,
      volume: this.output.gain.value,
      inputGain: this.input.gain.value,
      delayTime: this.pingPongDelayNode.delayTime.value,
      feedback: this.pingPongDelayNode.feedback.value,
      wet: this.pingPongDelayNode.wet.value,
    };
  }
}
