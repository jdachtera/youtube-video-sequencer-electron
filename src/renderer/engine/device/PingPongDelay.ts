import { Device, SerializedDeviceBase } from './Device';
import { entries, PropertyUpdateEvents } from '../helpers';

import { PingPongDelay as PingPongDelayNode } from 'tone';
import { Engine } from '../Engine';
import { NormalRange, Time } from 'tone/build/esm/core/type/Units';
import { DeepPartial } from '../types';

export type SerializedPingPongDelayDevice = SerializedDeviceBase & {
  name: 'PingPongDelay';
  delayTime: Time;
  feedback: NormalRange;
};

type PingPongDelayEvents = {
  change: (deviceChain: PingPongDelayDevice) => void;
} & PropertyUpdateEvents<SerializedPingPongDelayDevice>;

export class PingPongDelayDevice extends Device<PingPongDelayEvents> {
  pingPongDelayNode = new PingPongDelayNode();

  static normalizeData = (
    pingPongDelay: DeepPartial<SerializedPingPongDelayDevice>
  ): SerializedPingPongDelayDevice => ({
    name: 'PingPongDelay',
    inputGain: pingPongDelay.inputGain ?? 1,
    volume: pingPongDelay.volume ?? 1,
    delayTime: pingPongDelay.delayTime ?? 100,
    feedback: pingPongDelay.feedback ?? 0.2,
  });

  constructor(
    engine: Engine,
    serializedPingPongDelay: Partial<SerializedPingPongDelayDevice>
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
      }
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
      volume: this.output.gain.value,
      inputGain: this.input.gain.value,
      delayTime: this.pingPongDelayNode.delayTime.value,
      feedback: this.pingPongDelayNode.feedback.value,
    };
  }
}
