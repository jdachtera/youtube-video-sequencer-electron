/* eslint-disable max-classes-per-file */
import { batch } from 'solid-js';
import {
  Gain,
  getContext,
  Limiter,
  Meter,
  OfflineContext,
  setContext,
  start,
} from 'tone';
import type { Transport } from 'tone/build/esm/core/clock/Transport';
import type { Time, TransportTime } from 'tone/build/esm/core/type/Units';
import type { SidePanelTab } from '../panels/SidePanel';
import { EngineBase } from './EngineBase';
import type { SerializedTrack } from './Track';
import { Track } from './Track';
import type { SerializedSampler } from './device/Sampler';
import { SamplerDevice } from './device/Sampler';
import { SequencerDevice } from './device/Sequencer';
import type { SerializedSlice } from './device/Slice';
import type { PropertyUpdateEvents } from './helpers';
import { entries } from './helpers';
import type { DeepPartial } from './types';

export type SerializedEngine = {
  zoom: number;
  bpm: number;
  swing: number;
  tracks: SerializedTrack[];
  samplers: SerializedSampler[];
  volume: number;
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
  currentSamplerChanged: (sampler?: SamplerDevice) => void;
  trackAdded: (track: Track) => void;
  trackRemoved: (track: Track) => void;
  change: (engine: Engine) => void;
  start: (time?: Time, offset?: TransportTime) => void;
  stop: (time?: Time) => void;
  mixdownProgress: (progress: number) => void;
  draw: (time: number, position: Time) => void;
} & PropertyUpdateEvents<SerializedEngine>;

export class Engine extends EngineBase<EngineEvents> {
  public tracks: Track[] = [];

  public samplers: SamplerDevice[] = [];
  public currentSampler?: SamplerDevice;

  public gain = new Gain();

  // Brickwall safety limiter on the master bus. Layering several samples can
  // easily push the sum past 0 dBFS and clip into harsh digital distortion;
  // this catches the peaks so the mix (and exports) stay clean.
  public limiter = new Limiter(-1);

  // Post-limiter level meter (0..1) driving the toolbar's master meter.
  public meter = new Meter({ normalRange: true, smoothing: 0.7 });

  public currentPatternIndex = 0;

  public currentSamplerIndex = 0;

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

  drawInterval = 0;

  static normalizeData = (
    parsedData: DeepPartial<SerializedEngine>,
  ): SerializedEngine => {
    return {
      bpm: parsedData.bpm ?? 120,
      swing: parsedData.swing ?? 0,
      zoom: parsedData.zoom ?? 1,
      volume: parsedData.volume ?? 1,
      samplers: (parsedData.samplers ?? []).map((serializedSampler) =>
        SamplerDevice.normalizeData(serializedSampler),
      ),
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

  static normalizeTracks(parsedData: DeepPartial<SerializedEngine>) {
    return (Array.isArray(parsedData.tracks) ? parsedData.tracks : []).map(
      (track) => Track.normalizeData(track),
    );
  }

  constructor(public transport: Transport) {
    super();

    this.setMaxListeners(1000);

    this.on('trackAdded', () => this.emit('change', this));
    this.on('trackRemoved', () => this.emit('change', this));
    this.transport.on('start', (time: number) => {
      this.emit('start', time);
    });
    this.transport.on('stop', () => {
      this.emit('stop');
    });
    this.gain.connect(this.limiter);
    this.limiter.toDestination();
    this.limiter.connect(this.meter);
  }

  emitChange = () => this.emit('change', this);

  async hasLoaded() {
    await Promise.all(this.tracks.map((track) => track.hasLoaded()));
  }

  setCurrentSampler(sampler?: SamplerDevice) {
    if (sampler === this.currentSampler) return;

    this.currentSampler?.unload();
    this.currentSampler = sampler;
    this.emit('currentSamplerChanged', sampler);
  }

  createTrack(serializedTrack: SerializedTrack) {
    const track = new Track(this, serializedTrack);

    this.tracks = [...this.tracks, track];

    track.on('change', this.emitChange);
    this.emit('trackAdded', track);

    return track;
  }

  createSliceTrack(serializedSlice: SerializedSlice) {
    this.createTrack(
      Track.normalizeData({
        chain: {
          devices: [{ name: 'Sequencer' }, serializedSlice],
        },
      }),
    );
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

  // Remove every track but keep the engine and its master bus alive. Used by
  // "Clear all" on the live (singleton) engine.
  clear() {
    this.tracks.forEach((track) => this.removeTrack(track));
  }

  // Full teardown, including the master bus. Only for the throwaway offline
  // render engine — never the live singleton, or playback would go silent.
  dispose() {
    this.clear();
    this.gain.dispose();
    this.limiter.dispose();
    this.meter.dispose();
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
            (serializedTrack) => this.createTrack(serializedTrack),
          );
          break;
        case 'volume':
          this.gain.gain.value = entry[1] ?? 1;
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
      samplers: this.samplers.map((sampler) => sampler.serialize()),
      bpm: this.transport.bpm.value,
      swing: this.transport.swing,
      zoom: this.zoom,
      volume: this.gain.gain.value,
    };
  }

  start(time?: Time, offset?: TransportTime) {
    this.transport.clear(this.drawInterval);

    this.drawInterval = this.transport.scheduleRepeat((time) => {
      batch(() => {
        this.emit('draw', time, this.transport.position);
      });
    }, '40hz');

    start();

    this.transport.start(time, offset);
  }

  stop() {
    this.transport.stop();
  }

  // The render length (in seconds) for a mixdown: one full loop of the longest
  // pattern across all tracks, so the export captures a complete cycle of the
  // beat. Floored so an empty or very short project still yields a usable file.
  getMaxSequenceLength() {
    const durations = this.tracks.map((track) => {
      const sequencer = track.chain.devices.find(
        (device): device is SequencerDevice =>
          device instanceof SequencerDevice,
      );
      return sequencer?.getPattern()?.loopDurationSeconds() ?? 0;
    });

    const longest = durations.length ? Math.max(...durations) : 0;
    return Math.max(longest, 2);
  }

  getOrCreateSampler(url: string) {
    const existingSampler = this.samplers.find(
      (sampler) => sampler.url === url,
    );

    if (existingSampler) return existingSampler;

    console.trace(url);

    const newSampler = new SamplerDevice(
      this,
      SamplerDevice.normalizeData({ url }),
    );

    this.samplers = [...this.samplers, newSampler];

    this.emit(
      'samplersUpdated',
      this.samplers.map((sampler) => sampler.serialize()),
    );

    return newSampler;
  }

  async renderToBuffer(timeToRender: number) {
    const originalContext = getContext();
    const channels = 2;
    const sampleRate = getContext().sampleRate;

    const offlineContext = new OfflineContext(
      channels,
      timeToRender,
      sampleRate,
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
      timeToRender,
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
