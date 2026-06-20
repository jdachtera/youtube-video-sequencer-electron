import { Solo, Volume } from 'tone';
import type { Engine } from './Engine';
import { EngineBase } from './EngineBase';
import type { SerializedDeviceChain } from './device/DeviceChain';
import { DeviceChain } from './device/DeviceChain';
import type { PropertyUpdateEvents } from './helpers';
import { keyValueEntries } from './helpers';
import type { DeepPartial } from './types';

export type SerializedTrack = {
  chain: SerializedDeviceChain;
  name: string;
  mute: boolean;
  collapsed: boolean;
  solo: boolean;
  color: string;
};

type TrackEvents = {
  change: (deviceChain: Track) => void;
} & PropertyUpdateEvents<SerializedTrack>;

export class Track extends EngineBase<TrackEvents> {
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  chain: DeviceChain = null!;
  name = '';
  color = '';
  volume = new Volume();
  soloNode = new Solo();
  collapsed = false;

  static normalizeData = (
    track: DeepPartial<SerializedTrack>,
  ): SerializedTrack => ({
    name: track.name ?? '',
    mute: track.mute ?? false,
    solo: track.solo ?? false,
    color: track.color ?? '',
    collapsed: track.collapsed ?? false,
    chain: DeviceChain.normalizeData({
      ...track.chain,
      devices: track.chain?.devices,
    }),
  });

  constructor(public engine: Engine, serializedTrack: SerializedTrack) {
    super();
    this.volume.connect(this.soloNode);
    this.soloNode.connect(engine.gain);
    this.set(serializedTrack);
  }

  emitChange = () => this.emit('change', this);

  set(partialSerializedDevice: Partial<SerializedTrack>) {
    keyValueEntries(partialSerializedDevice).forEach((entry) => {
      if (!entry) return;

      switch (entry.key) {
        case 'chain':
          this.chain?.dispose();
          this.chain?.off('change', this.emitChange);

          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          this.chain = new DeviceChain(this.engine, entry.value);

          this.chain.on('change', this.emitChange);
          this.chain.output.connect(this.volume);
          break;
        case 'collapsed':
          this.collapsed = entry.value;
          break;
        case 'color':
        case 'name':
          this[entry.key] = entry.value;
          break;
        case 'mute':
          this.volume.set({ mute: entry.value });
          break;
        case 'solo':
          this.soloNode.set({ solo: entry.value });
          break;
      }

      this.emit(`${entry.key}Updated`, entry.value);
    });
    this.emit('change', this);
  }

  setSolo(solo: boolean, multi = false) {
    if (solo && !multi) {
      this.engine.tracks.forEach((slice) =>
        slice.set({ solo: this === slice }),
      );
    } else {
      this.set({ solo });
    }
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
      name: this.name,
      mute: this.volume.mute,
      solo: this.soloNode.solo,
      color: this.color,
      collapsed: this.collapsed,
    };
  }
}
