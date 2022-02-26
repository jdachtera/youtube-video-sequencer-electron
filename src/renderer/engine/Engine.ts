/* eslint-disable max-classes-per-file */
import { Time, TransportTime } from 'tone/build/esm/core/type/Units';
import { Transport } from 'tone/build/esm/core/clock/Transport';
import { SerializedTrack, Track } from './Track';
import { DeepPartial } from './types';
import { entries, PropertyUpdateEvents } from './helpers';

import { SamplerDevice, SerializedSamplerDevice } from './device/Sampler';
import { getContext, OfflineContext, setContext } from 'tone';
import { EngineBase } from './EngineBase';

import type { SidePanelTab } from '../panels/SidePanel';

export type SerializedEngine = {
  zoom: number;
  bpm: number;
  swing: number;
  tracks: SerializedTrack[];
  viewMode: {
    channel: boolean;
    slice: boolean;
    sequencer: boolean;
    device: boolean;
    sidePanel: {
      activeTab: SidePanelTab;
      width: number;
      open: boolean;
    };
  };
};

type EngineEvents = {
  trackAdded: (track: Track) => void;
  trackRemoved: (track: Track) => void;
  change: (engine: Engine) => void;
  start: (time?: Time, offset?: TransportTime) => void;
  stop: (time?: Time) => void;
  mixdownProgress: (progress: number) => void;
} & PropertyUpdateEvents<SerializedEngine>;

export class Engine extends EngineBase<EngineEvents> {
  public tracks: Track[] = [];

  public currentPatternIndex = 0;

  zoom = 1;

  viewMode: SerializedEngine['viewMode'] = {
    channel: true,
    slice: true,
    sequencer: true,
    device: true,
    sidePanel: {
      activeTab: 'YouTube',
      width: 300,
      open: true,
    },
  };

  viewModes = ['channel', 'slice', 'sequencer', 'device'] as const;

  static normalizeData = (
    parsedData: DeepPartial<
      SerializedEngine & { samplers: SerializedSamplerDevice[] }
    >
  ): SerializedEngine => {
    return {
      bpm: parsedData.bpm ?? 120,
      swing: parsedData.swing ?? 0,
      zoom: parsedData.zoom ?? 1,
      viewMode: {
        channel: parsedData?.viewMode?.channel ?? true,
        sequencer: parsedData?.viewMode?.sequencer ?? true,
        slice: parsedData?.viewMode?.slice ?? true,
        device: parsedData?.viewMode?.device ?? true,
        sidePanel: {
          activeTab: parsedData?.viewMode?.sidePanel?.activeTab ?? 'YouTube',
          open: parsedData?.viewMode?.sidePanel?.open ?? true,
          width: parsedData?.viewMode?.sidePanel?.width ?? 300,
        },
      },
      tracks: Engine.normalizeTracks(parsedData),
    };
  };

  static normalizeTracks(
    parsedData: DeepPartial<
      SerializedEngine & { samplers: SerializedSamplerDevice[] }
    >
  ) {
    return [
      ...(Array.isArray(parsedData.tracks) ? parsedData.tracks : [])
        .filter(
          (maybeTrack): maybeTrack is DeepPartial<SerializedTrack> =>
            !!maybeTrack
        )
        .map((track) => Track.normalizeData({ ...track })),

      ...(Array.isArray(parsedData.samplers) ? parsedData.samplers : []).map(
        (sampler): SerializedTrack =>
          Track.normalizeData({
            chain: {
              devices: [SamplerDevice.normalizeData({ ...sampler })],
            },
          })
      ),
    ];
  }

  constructor(public transport: Transport) {
    super();

    this.setMaxListeners(1000);

    this.on('trackAdded', () => this.emit('change', this));
    this.on('trackRemoved', () => this.emit('change', this));
  }

  emitChange = () => this.emit('change', this);

  async hasLoaded() {
    await Promise.all(
      this.tracks.map(async (track) => {
        await track.hasLoaded();
      })
    );
  }
  createTrack(serializedTrack: SerializedTrack) {
    const track = new Track(this, serializedTrack);
    this.tracks = [...this.tracks, track];

    track.on('change', this.emitChange);
    this.emit('trackAdded', track);

    return track;
  }

  findTrack(predicate: (track: Track) => boolean): Track | undefined {
    return this.tracks.find(predicate);
  }

  removeTrack(track: Track) {
    track.off('change', this.emitChange);
    track.dispose();

    const index = this.tracks.indexOf(track);

    this.tracks = [
      ...this.tracks.slice(0, index),
      ...this.tracks.slice(index + 1),
    ];
    this.emit('trackRemoved', track);
  }

  dispose() {
    this.tracks.forEach((track) => this.removeTrack(track));
  }

  set(serializedEngine: DeepPartial<SerializedEngine>) {
    entries(serializedEngine).forEach((entry) => {
      if (!entry) return;

      switch (entry[0]) {
        case 'zoom':
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          this.zoom = entry[1]!;
          break;
        case 'bpm':
          this.transport.bpm.value = entry[1] ?? 120;
          break;
        case 'swing':
          this.transport.swing = entry[1] ?? 0;
          this.transport.swingSubdivision = '16n';
          break;
        case 'tracks':
          this.tracks.forEach((track) => this.removeTrack(track));
          Engine.normalizeTracks({ tracks: entry[1] ?? [] }).forEach(
            (serializedTrack) => this.createTrack(serializedTrack)
          );
          break;
        case 'viewMode':
          this.viewMode = {
            ...this.viewMode,
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            ...entry[1]!,
            sidePanel: {
              ...this.viewMode.sidePanel,
              ...entry[1]?.sidePanel,
            },
          };
          break;
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      this.emit(`${entry[0]}Updated` as any, entry[1]);
    });
    this.emit('change', this);
  }

  serialize(): SerializedEngine {
    return {
      viewMode: this.viewMode,
      tracks: this.tracks.map((track) => track.serialize()),
      bpm: this.transport.bpm.value,
      swing: this.transport.swing,
      zoom: this.zoom,
    };
  }

  start(time?: Time, offset?: TransportTime) {
    this.stop();
    this.transport.start();
    this.emit('start', time, offset);
  }

  stop(time?: Time) {
    this.transport.stop();
    this.emit('stop', time);
  }

  getMaxSequenceLength() {
    return (
      this.tracks
        .flatMap((track) =>
          track.chain.devices
            .filter(
              (device): device is SamplerDevice =>
                device instanceof SamplerDevice
            )
            .flatMap((sampler) =>
              sampler.slices.map(
                (slice) =>
                  slice.serialize().patterns[this.currentPatternIndex].steps
                    .length
              )
            )
        )
        .sort()
        .pop() ?? 16
    );
  }

  async renderToBuffer(timeToRender: number) {
    const originalContext = getContext();
    const channels = 2;
    const sampleRate = getContext().sampleRate;

    const offlineContext = new OfflineContext(
      channels,
      timeToRender,
      sampleRate
    );

    setContext(offlineContext);

    const offlineEngine = new Engine(offlineContext.transport);
    offlineEngine.set(this.serialize());

    offlineContext.transport.scheduleRepeat(
      (time) => {
        this.emit('mixdownProgress', time / timeToRender);
      },
      1,
      0,
      timeToRender
    );

    await offlineEngine.hasLoaded();

    offlineContext.transport.start();
    const buffer = await offlineContext.render(true);

    this.emit('mixdownProgress', 1);

    offlineEngine.dispose();

    setContext(originalContext);
    return buffer;
  }
}
