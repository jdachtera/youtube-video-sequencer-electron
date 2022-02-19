import { entries, PropertyUpdateEvents } from './helpers';
import { DeviceChain, SerializedDeviceChain } from './device/DeviceChain';
import { Engine } from './Engine';
import { DeepPartial } from './types';
import { EngineBase } from './EngineBase';

export type SerializedTrack = {
  chain: SerializedDeviceChain;
};

type TrackEvents = {
  change: (deviceChain: Track) => void;
} & PropertyUpdateEvents<SerializedTrack>;

export class Track extends EngineBase<TrackEvents> {
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  chain: DeviceChain = null!;

  static normalizeData = (
    track: DeepPartial<SerializedTrack>
  ): SerializedTrack => ({
    chain: DeviceChain.normalizeData({
      ...track.chain,
      devices: track.chain?.devices,
    }),
  });

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

          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
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
