import { PingPongDelay as PingPongDelayNode } from 'tone';
import type { NormalRange, Time } from 'tone/build/esm/core/type/Units';
import type { Engine } from '../Engine';
import type { PropertyUpdateEvents } from '../helpers';
import { entries } from '../helpers';
import type { DeepPartial } from '../types';
import { Device } from './Device';
import type { SerializedDeviceBase } from './Device';

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

  // The wet level the user dialled in. The node's actual wet is ducked to 0
  // while the transport is stopped so the feedback echoes don't keep ringing
  // after the user presses stop, then ramped back when playback resumes.
  private configuredWet = 0.2;

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

    this.engine.on('start', this.handleTransportStart);
    this.engine.on('stop', this.handleTransportStop);
    // Start ducked unless already playing, so loading a project doesn't leave a
    // tail armed.
    if (this.engine.transport.state !== 'started') {
      this.pingPongDelayNode.wet.value = 0;
    }
  }

  emitChange = () => this.emit('change', this);

  private handleTransportStart = () => {
    this.pingPongDelayNode.wet.rampTo(this.configuredWet, 0.03);
  };

  private handleTransportStop = () => {
    this.pingPongDelayNode.wet.rampTo(0, 0.05);
  };

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
          this.configuredWet = entry[1] ?? 0.2;
          // Only drive the live node while playing; when stopped it stays
          // ducked so adjusting the knob doesn't reawaken the echo tail.
          if (this.engine.transport.state === 'started') {
            this.pingPongDelayNode.set({ wet: this.configuredWet });
          }
          break;
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      this.emit(`${entry[0]}Updated` as any, entry[1]);
    });

    super.set(partialSerializedPingPongDelay);
  }

  dispose(): void {
    super.dispose();
    this.engine.off('start', this.handleTransportStart);
    this.engine.off('stop', this.handleTransportStop);
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
