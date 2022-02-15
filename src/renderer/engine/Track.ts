import { entries, PropertyUpdateEvents } from './helpers';

import { TypedEmitter } from 'tiny-typed-emitter';
import { DeviceChain, SerializedDeviceChain } from './device/DeviceChain';
import { Engine } from './Engine';

export type SerializedTrack = {
  chain: SerializedDeviceChain;
};

type TrackEvents = {
  change: (deviceChain: Track) => void;
} & PropertyUpdateEvents<SerializedTrack>;

export class Track extends TypedEmitter<TrackEvents> {
  chain: DeviceChain = null!;

  constructor(public engine: Engine, serializedTrack: SerializedTrack) {
    super();
    this.set(serializedTrack);
  }

  emitChange = () => this.emit('change', this);

  set(partialSerializedDevice: Partial<SerializedTrack>) {
    entries(partialSerializedDevice).forEach((entry) => {
      if (!entry) return;
      switch (entry[0]) {
        case 'chain':
          this.chain?.dispose();
          this.chain?.off('change', this.emitChange);

          this.chain = new DeviceChain(this.engine, entry[1]!);

          this.chain.on('change', this.emitChange);
          this.chain.output.toDestination();
          break;
      }
    });
  }

  async hasLoaded() {
    await this.chain.hasLoaded();
  }

  dispose() {
    this.chain.dispose();
  }

  serialize(): SerializedTrack {
    return {
      chain: this.chain.serialize(),
    };
  }
}
