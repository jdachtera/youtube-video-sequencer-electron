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

    this.currentSampler = sampler;
    this.currentSamplerIndex = sampler ? this.samplers.indexOf(sampler) : -1;
    // Eagerly decode so the cover/waveform/audition are ready when shown. The
    // buffer is kept loaded (we no longer unload on switch) so browsing through
    // slots with ◀/▶ doesn't re-download/re-decode each step.
    void sampler?.hasLoaded();
    this.emit('currentSamplerChanged', sampler);
  }

  // Browse the prepared sample slots (the sampler's ◀/▶ buttons). Wraps around.
  selectSampleByIndex(index: number) {
    if (!this.samplers.length) return;
    const count = this.samplers.length;
    const wrapped = ((index % count) + count) % count;
    this.setCurrentSampler(this.samplers[wrapped]);
  }

  selectNextSample() {
    this.selectSampleByIndex(this.currentSamplerIndex + 1);
  }

  selectPreviousSample() {
    this.selectSampleByIndex(this.currentSamplerIndex - 1);
  }

  // Create a new sample slot (one per "add video"; chopping makes several).
  // Slots are keyed by id, so the same url can appear in multiple slots.
  createSample(data: DeepPartial<SerializedSampler>) {
    const sampler = new SamplerDevice(this, SamplerDevice.normalizeData(data));
    // Propagate slot edits (region, root note, cover, …) so they're autosaved
    // and captured by undo/redo.
    sampler.on('change', this.emitChange);
    this.samplers = [...this.samplers, sampler];
    this.emit(
      'samplersUpdated',
      this.samplers.map((existing) => existing.serialize()),
    );
    this.emit('change', this);
    return sampler;
  }

  findSampler(id: string) {
    return this.samplers.find((sampler) => sampler.id === id);
  }

  // Find a sample slot matching a source + region, creating one if none exists.
  // Used to migrate pre-slot slices (which carried their own url + region) onto
  // a shared slot, so identical regions across tracks collapse to one slot.
  findOrCreateSampleSlot(data: {
    url: string;
    start?: number;
    end?: number;
    title?: string;
    color?: string;
  }) {
    const start = data.start ?? 0;
    const end = data.end ?? 0;
    const match = this.samplers.find(
      (sampler) =>
        sampler.url === data.url &&
        sampler.start === start &&
        sampler.end === end,
    );
    return match ?? this.createSample(data);
  }

  removeSample(sampler: SamplerDevice) {
    const index = this.samplers.indexOf(sampler);
    sampler.off('change', this.emitChange);
    this.samplers = this.samplers.filter((existing) => existing !== sampler);

    if (this.currentSampler === sampler) {
      this.currentSampler = undefined;
      this.currentSamplerIndex = -1;
      // Fall back to a neighbouring slot so the panel still has something to
      // show.
      this.setCurrentSampler(this.samplers[Math.max(0, index - 1)]);
    }

    sampler.dispose();
    this.emit(
      'samplersUpdated',
      this.samplers.map((existing) => existing.serialize()),
    );
    this.emit('change', this);
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
    this.samplers.forEach((sampler) => {
      sampler.off('change', this.emitChange);
      sampler.dispose();
    });
    this.samplers = [];
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
        case 'samplers': {
          // Restore prepared sample slots. normalizeData emits `samplers`
          // before `tracks`, so this runs first and slices created during
          // track restore can bind to the matching slot (by url) instead of
          // lazily creating a duplicate.
          //
          // Reconcile by id rather than dispose-and-rebuild: undo/redo applies
          // full snapshots through set(), and re-decoding every buffer on each
          // step would be slow — so unchanged slots (and their loaded buffers)
          // are kept in place.
          const previousId = this.currentSampler?.id;
          const byId = new Map(
            this.samplers.map((sampler) => [sampler.id, sampler]),
          );
          const seen = new Set<string>();

          this.samplers = (entry[1] ?? []).map((serializedSampler) => {
            const normalized = SamplerDevice.normalizeData(serializedSampler);
            const existing = byId.get(normalized.id);
            seen.add(normalized.id);
            if (existing) {
              existing.set(normalized);
              return existing;
            }
            const sampler = new SamplerDevice(this, normalized);
            sampler.on('change', this.emitChange);
            return sampler;
          });

          byId.forEach((sampler, id) => {
            if (!seen.has(id)) {
              sampler.off('change', this.emitChange);
              sampler.dispose();
            }
          });

          this.currentSampler = undefined;
          this.currentSamplerIndex = -1;
          this.emit(
            'samplersUpdated',
            this.samplers.map((sampler) => sampler.serialize()),
          );
          // Keep the current selection if it survived; otherwise show the first
          // slot in the always-visible sampler panel.
          this.setCurrentSampler(
            (previousId && this.findSampler(previousId)) || this.samplers[0],
          );
          break;
        }
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
      // Sample slots before tracks: set() restores them in this order so slices
      // (created during track restore) bind to an existing slot rather than
      // lazily creating a duplicate. Matters for offline render, which calls
      // set(serialize()) directly without normalizeData.
      samplers: this.samplers.map((sampler) => sampler.serialize()),
      tracks: this.tracks.map((track) => track.serialize()),
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
