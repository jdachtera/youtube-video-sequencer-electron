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
import type { ToneAudioBuffer } from 'tone';
import type { Transport } from 'tone/build/esm/core/clock/Transport';
import type { Time, TransportTime } from 'tone/build/esm/core/type/Units';
import type { SidePanelTab } from '../panels/SidePanel';
import { EngineBase } from './EngineBase';
import { Metronome } from './Metronome';
import { MidiInput } from './MidiInput';
import type { SerializedTrack } from './Track';
import { Track } from './Track';
import type { SerializedSampler } from './device/Sampler';
import { SamplerDevice } from './device/Sampler';
import { SequencerDevice } from './device/Sequencer';
import { Slice, type SerializedSlice } from './device/Slice';
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
  tracksReordered: () => void;
  change: (engine: Engine) => void;
  start: (time?: Time, offset?: TransportTime) => void;
  stop: (time?: Time) => void;
  mixdownProgress: (progress: number) => void;
  draw: (time: number, position: Time) => void;
  // Live-only click-track controls — deliberately not part of SerializedEngine,
  // so they stay out of project files, undo/redo, and exports.
  metronomeUpdated: (enabled: boolean) => void;
  countInUpdated: (bars: number) => void;
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

  // MIDI keyboard input (play + record). Created here but only activated on the
  // live engine via `midiInput.init()` (App), never the offline render engine.
  public midiInput: MidiInput = new MidiInput(this);

  // Transport-synced click track. Off by default and never enabled on the
  // offline render engine, so it never bleeds into a mixdown export.
  public metronome: Metronome;

  // True between pressing play with a count-in and the transport actually
  // starting (the lead-in clicks are sounding). Guards against a second start.
  private pendingCountIn = false;

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
      // The lead-in is over once the transport actually starts.
      this.pendingCountIn = false;
      this.emit('start', time);
      this.metronome.onStart();
    });
    this.transport.on('stop', () => {
      this.emit('stop');
      this.metronome.onStop();
    });
    this.gain.connect(this.limiter);
    this.limiter.toDestination();
    this.limiter.connect(this.meter);

    // Route the click into the master bus (pre-limiter) so it respects master
    // volume and registers on the master meter.
    this.metronome = new Metronome(this.transport, this.gain);
  }

  // Toggle the live click track. Not serialized, so it's a pure monitoring
  // preference — never captured by undo/redo, autosave, or exports.
  setMetronome(enabled: boolean) {
    this.metronome.setEnabled(enabled);
    this.emit('metronomeUpdated', enabled);
  }

  // Set the count-in length (bars of lead-in clicks before playback starts).
  // Like the metronome toggle, a live-only preference (not serialized).
  setCountIn(bars: number) {
    this.metronome.setCountInBars(bars);
    this.emit('countInUpdated', this.metronome.countInBars);
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

  // Duplicate a slot (source + region + tuning) into a new one and select it,
  // so you can prepare a variation (e.g. reversed, retuned) without re-adding
  // the video.
  cloneSample(sampler: SamplerDevice) {
    const data = sampler.serialize();
    const clone = this.createSample({
      ...data,
      id: '',
      title: data.title ? `${data.title} copy` : '',
    });
    this.setCurrentSampler(clone);
    return clone;
  }

  // Tracks whose voice plays this slot.
  tracksUsingSample(sampler: SamplerDevice) {
    return this.tracks.filter((track) =>
      track.chain.devices.some(
        (device) => device instanceof Slice && device.samplerId === sampler.id,
      ),
    );
  }

  // Find a sample slot matching a source + region, creating one if none exists.
  // Used to migrate pre-slot slices (which carried their own url + region) onto
  // a shared slot, so identical regions across tracks collapse to one slot.
  findOrCreateSampleSlot(data: DeepPartial<SerializedSampler>) {
    const start = data.start ?? 0;
    const end = data.end ?? 0;
    // Match on everything that defines the sound, so two legacy voices with the
    // same region but different tuning migrate to distinct slots (rather than
    // collapsing and losing one's settings).
    const match = this.samplers.find(
      (sampler) =>
        sampler.url === data.url &&
        sampler.start === start &&
        sampler.end === end &&
        sampler.playbackRate === (data.playbackRate ?? 1) &&
        sampler.warpmode === (data.warpmode ?? 'resample') &&
        sampler.reverse === (data.reverse ?? false) &&
        sampler.grainSize === (data.grainSize ?? 0.1) &&
        sampler.volume === (data.volume ?? 1),
    );
    return match ?? this.createSample(data);
  }

  removeSample(sampler: SamplerDevice) {
    // Remove tracks whose voice plays this slot first, so deleting a sample
    // never leaves orphaned sequencers bound to a slot that's gone (which left
    // the project in a stuck, unusable state).
    this.tracksUsingSample(sampler).forEach((track) => this.removeTrack(track));

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

  // Reorder a track within the list (drag-/button-driven reorder in the UI).
  // Track order is part of the serialized project, so this is a real edit —
  // autosaved and captured by undo/redo.
  moveTrack(fromIndex: number, toIndex: number) {
    const count = this.tracks.length;
    const to = Math.max(0, Math.min(count - 1, toIndex));
    if (fromIndex < 0 || fromIndex >= count || fromIndex === to) return;

    const next = [...this.tracks];
    const [moved] = next.splice(fromIndex, 1);
    next.splice(to, 0, moved);
    this.tracks = next;

    this.emit('tracksReordered');
    this.emit('change', this);
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
    this.midiInput.dispose();
    this.metronome.dispose();
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
    // Ignore a second press while a count-in is already counting in.
    if (this.pendingCountIn) return;

    this.transport.clear(this.drawInterval);

    this.drawInterval = this.transport.scheduleRepeat((time) => {
      batch(() => {
        this.emit('draw', time, this.transport.position);
      });
    }, '40hz');

    start();

    // A count-in only applies to a plain "play from here" (no explicit start
    // time): play N bars of lead-in clicks on the audio clock, then start the
    // transport on the next downbeat. Programmatic starts pass a time and skip it.
    if (time === undefined && this.metronome.countInBars > 0) {
      const startAt = this.transport.context.now() + 0.1;
      const playbackAt = startAt + this.metronome.playCountIn(startAt);
      this.pendingCountIn = true;
      this.transport.start(playbackAt, offset);
    } else {
      this.transport.start(time, offset);
    }
  }

  stop() {
    // Stopping during a count-in cancels the pending start and its lead-in clicks.
    if (this.pendingCountIn) {
      this.pendingCountIn = false;
      this.metronome.cancelCountIn();
    }
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
    return this.renderSerializedToBuffer(this.serialize(), timeToRender, (p) =>
      this.emit('mixdownProgress', p),
    );
  }

  // Render each track in isolation (every other track muted) to its own buffer,
  // for exporting stems. Returns one entry per track, in track order.
  async renderStems(
    timeToRender: number,
  ): Promise<{ name: string; buffer: ToneAudioBuffer }[]> {
    const base = this.serialize();
    const total = base.tracks.length;
    const stems: { name: string; buffer: ToneAudioBuffer }[] = [];

    for (let i = 0; i < total; i++) {
      const isolated: SerializedEngine = {
        ...base,
        // Isolate track i: mute every other track, and clear solo everywhere so
        // a leftover solo can't override the mutes.
        tracks: base.tracks.map((track, index) => ({
          ...track,
          mute: index !== i,
          solo: false,
        })),
      };
      const buffer = await this.renderSerializedToBuffer(
        isolated,
        timeToRender,
        // Map each stem's 0..1 progress onto its slice of the overall job.
        (p) => this.emit('mixdownProgress', (i + p) / total),
      );
      stems.push({ name: base.tracks[i].name || `Track ${i + 1}`, buffer });
    }

    return stems;
  }

  // Render one serialized engine snapshot to a stereo buffer in an offline
  // context. Shared by the full mixdown and per-track stem export.
  private async renderSerializedToBuffer(
    serialized: SerializedEngine,
    timeToRender: number,
    onProgress?: (progress: number) => void,
  ): Promise<ToneAudioBuffer> {
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
    offlineEngine.set(serialized);

    if (onProgress) {
      offlineContext.transport.scheduleRepeat(
        (time) => onProgress(time / timeToRender),
        1,
        0,
        timeToRender,
      );
    }

    await offlineEngine.hasLoaded();

    offlineContext.transport.start();
    const buffer = await offlineContext.render(true);

    onProgress?.(1);

    offlineEngine.dispose();

    setContext(originalContext);
    return buffer;
  }
}
