/* eslint-disable max-classes-per-file */
import { Time } from 'tone/build/esm/core/type/Units';
import { Transport } from 'tone/build/esm/core/clock/Transport';
import { TypedEmitter } from 'tiny-typed-emitter';
import { SerializedTrack, Track } from './Track';
import { DeepPartial, SerializedEngine } from './types';
import { entries, PropertyUpdateEvents } from './helpers';

import { SamplerDevice, SerializedSamplerDevice } from './device/Sampler';

type EngineEvents = {
  trackAdded: (track: Track) => void;
  trackRemoved: (track: Track) => void;
  change: (engine: Engine) => void;
  start: (time?: Time | undefined, offset?: number | undefined) => void;
  stop: (time?: Time | undefined) => void;
} & PropertyUpdateEvents<SerializedEngine>;

export class Engine extends TypedEmitter<EngineEvents> {
  public tracks: Track[] = [];

  public currentPatternIndex = 0;

  static normalizeData = (
    parsedData: DeepPartial<
      SerializedEngine & { samplers: SerializedSamplerDevice[] }
    >
  ): SerializedEngine => {
    return {
      bpm: parsedData.bpm ?? 120,
      swing: parsedData.swing ?? 0,
      currentPatternIndex: parsedData.currentPatternIndex ?? 0,
      tracks: [
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
      ],
    };
  };

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

  set(serializedEngine: Partial<SerializedEngine>) {
    entries(serializedEngine).forEach((entry) => {
      if (!entry) return;

      switch (entry[0]) {
        case 'bpm':
          this.transport.bpm.value = entry[1] ?? 120;
          break;
        case 'currentPatternIndex':
          this.currentPatternIndex = entry[1] ?? 0;
          break;
        case 'swing':
          this.transport.swing = entry[1] ?? 0;
          this.transport.swingSubdivision = '16n';
          break;
        case 'tracks':
          this.tracks.forEach((track) => this.removeTrack(track));
          entry[1]?.forEach((serializedTrack) =>
            this.createTrack(serializedTrack)
          );
          break;
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      this.emit(`${entry[0]}Updated` as any, entry[1]);
    });
    this.emit('change', this);
  }

  serialize(): SerializedEngine {
    return {
      tracks: this.tracks.map((track) => track.serialize()),
      currentPatternIndex: this.currentPatternIndex,
      bpm: this.transport.bpm.value,
      swing: this.transport.swing,
    };
  }

  start(time?: Time | undefined, offset?: number | undefined) {
    this.emit('start', time, offset);
  }

  stop(time?: Time | undefined) {
    this.emit('stop', time);
  }
}
