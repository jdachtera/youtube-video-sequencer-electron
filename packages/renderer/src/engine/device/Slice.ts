/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { batch, createUniqueId } from 'solid-js';
import { GrainPlayer, Player, ToneAudioBuffer } from 'tone';
import { debounce } from 'ts-debounce';
import type { Engine } from '../Engine';
import type { PropertyUpdateEvents } from '../helpers';
import { entries, randomColor } from '../helpers';
import type { DeepPartial } from '../types';
import type { SerializedDeviceBase } from './Device';
import { Device } from './Device';
import type { Step } from './Patttern';
import type { SamplerDevice } from './Sampler';

export type SerializedSlice = SerializedDeviceBase & {
  name: 'Slice';
  title: string;
  id: string;
  // Id of the prepared sample slot (SamplerDevice) this voice plays. The slot
  // owns the source url + selected region + root note; the voice owns its own
  // tuning (volume, speed, warp, …). Empty on pre-slot projects — migrated on
  // load by binding to / creating a matching slot (see Slice.bindSampler).
  samplerId: string;
  url: string;
  warpmode: 'resample' | 'stretch';
  start: number;
  end: number;
  volume: number;
  playbackRate: number;
  grainSize: number;
  pitch: number;
  reverse: boolean;
  color: string;
  collapsed: boolean;
};

export type SliceEvents = {
  playingUpdated: (playing: boolean) => void;
  currentPositionUpdated: (currentPosition: number) => void;
  load: () => void;
} & PropertyUpdateEvents<SerializedSlice>;

export class Slice extends Device<SliceEvents> {
  sampler: SamplerDevice = null!;

  player: Player | GrainPlayer = null!;
  name = 'Slice';
  title = '';

  id = '';
  samplerId = '';
  url = '';
  start = 0;
  end = 1;
  reverse = false;
  color = 'red';

  collapsed = false;

  playbackRate = 1;
  pitch = 1;
  volume = 1;
  grainSize = 0.1;

  firstFrameTime = 0;
  lastFrameTime = 0;
  currentPosition = 0;

  warpmode: SerializedSlice['warpmode'] = 'resample';

  iteration = 0;

  static normalizeData = (
    slice: DeepPartial<SerializedSlice & { playbackSpeed: number }>,
  ): SerializedSlice => ({
    name: 'Slice',
    title: slice.title ?? '',
    inputGain: slice.inputGain ?? 1,
    id: slice.id && slice.id !== '' ? slice.id : createUniqueId(),
    samplerId: slice.samplerId ?? '',
    url: slice.url ?? '',
    collapsed: slice.collapsed ?? false,
    warpmode: slice.warpmode ?? 'resample',
    color: slice.color ?? randomColor(),
    start: slice.start ?? 0,
    end: slice.end ?? 0,
    pitch: slice.pitch ?? 0,
    grainSize: slice.grainSize ?? 0.1,
    playbackRate: slice.playbackRate ?? slice.playbackSpeed ?? 1,
    reverse: slice.reverse ?? false,
    volume: slice.volume ?? 1,
  });

  constructor(public engine: Engine, serializedSlice: SerializedSlice) {
    super(engine);

    this.setMaxListeners(1000);

    this.engine = engine;

    this.createPlayer();

    this.on('startUpdated', this.updateBuffer);
    this.on('endUpdated', this.updateBuffer);

    this.engine.on('draw', this.handleDraw);

    // A Tone.Player, once started, plays its buffer to the end independently of
    // the transport — so without this a long sample triggered near the end of a
    // loop keeps ringing after the user presses stop. Silence the slice when
    // the transport stops.
    this.engine.on('stop', this.handleTransportStop);

    this.set(serializedSlice);
    this.bindSampler();
  }

  // Re-derive the voice from its slot whenever the slot's source/region/root
  // note changes (edited in the sampler), so edits propagate to every voice
  // that plays the slot.
  private samplerChangeHandler = () => this.syncFromSampler();

  /**
   * Resolve and bind the sample slot this voice plays. By id when set;
   * otherwise migrate this voice's url + region into a matching slot (projects
   * that predate sample slots have no samplerId).
   */
  bindSampler() {
    const resolved =
      (this.samplerId && this.engine.findSampler(this.samplerId)) ||
      this.engine.findOrCreateSampleSlot({
        url: this.url,
        start: this.start,
        end: this.end,
        title: this.title,
        color: this.color,
      });

    if (this.sampler && this.sampler !== resolved) {
      this.sampler.off('change', this.samplerChangeHandler);
      this.sampler.removeSlice(this);
    }

    const isRebind = this.sampler !== resolved;
    this.sampler = resolved;
    this.samplerId = resolved.id;

    if (isRebind) {
      this.sampler.addSlice(this);
      this.sampler.on('change', this.samplerChangeHandler);
    }

    this.syncFromSampler();
  }

  /** Point this voice at a different prepared slot (the sequencer's dropdown). */
  selectSampler(samplerId: string) {
    if (samplerId === this.samplerId) return;
    this.samplerId = samplerId;
    this.bindSampler();
    this.emit('change', this);
  }

  // Mirror the slot's source + region onto the voice so the existing player /
  // buffer code keeps working, then rebuild the sliced buffer.
  private syncFromSampler() {
    this.url = this.sampler.url;
    this.start = this.sampler.start;
    this.end = this.sampler.end;
    this.updateBuffer();
  }

  handleDraw = (now: number) => {
    // Only voices that are actually sounding need a moving playhead. Emitting a
    // position update for every slice on every 40Hz frame is the bulk of the
    // playback-time UI churn, and it scales with track count — so skip the ones
    // that aren't playing.
    if (this.player.state !== 'started') return;

    this.currentPosition = now - this.firstFrameTime;

    this.emit(
      'currentPositionUpdated',
      this.currentPosition / this.player.playbackRate,
    );
  };

  handleTransportStop = () => {
    this.stop();
  };

  emitChange = () => this.emit('change', this);

  public handleSequenceEvent = (time: number, step: Step) => {
    if (step.play) {
      if (step.reverse !== this.player.reverse) {
        this.player.set({ reverse: step.reverse });
      }

      this.play(time);

      // Piano-roll notes carry a gate: release the slice when the note ends
      // instead of letting it ring to the buffer's natural end.
      if (step.gateSeconds && step.gateSeconds > 0) {
        this.player.stop(time + step.gateSeconds);
      }
    }
    // The slot's root note plus the step's pitch offset transpose the sample.
    // Grain (stretch) playback shifts pitch via detune, preserving tempo;
    // resample playback shifts it by changing the playback rate.
    const pitchCents = this.sampler.rootNote * 100 + step.pitch;
    const isGrain = this.player instanceof GrainPlayer;
    const pitchFactor = isGrain ? 1 : Math.pow(2, pitchCents / 1200);

    const playbackRate = this.playbackRate * step.playbackRate * pitchFactor;
    if (playbackRate !== this.player.playbackRate) {
      this.player.playbackRate = playbackRate;
    }

    if (this.player instanceof GrainPlayer) {
      this.player.detune = this.pitch + pitchCents;
      this.player.grainSize = this.grainSize;
    }

    this.output.gain.setValueAtTime(this.volume * step.volume, time);
  };

  set(slicePartial: Partial<SerializedSlice>) {
    // When bound to a sample slot, the region (start/end) is owned by the slot,
    // so route region edits there; the slot's change syncs them back onto every
    // voice that plays it. (During construction this.sampler isn't set yet, so
    // the initial region is applied to the voice and then used to seed the slot
    // in bindSampler.)
    if (
      this.sampler &&
      this.samplerId &&
      (slicePartial.start !== undefined || slicePartial.end !== undefined)
    ) {
      this.sampler.set({
        ...(slicePartial.start !== undefined
          ? { start: slicePartial.start }
          : {}),
        ...(slicePartial.end !== undefined ? { end: slicePartial.end } : {}),
      });
      const { start: _start, end: _end, ...rest } = slicePartial;
      slicePartial = rest;
    }

    batch(() => {
      entries(slicePartial).forEach((entry) => {
        if (!entry) return;

        switch (entry[0]) {
          case 'volume':
            this.volume = entry[1] ?? 1;
            break;
          case 'warpmode':
            if (entry[1] !== this.warpmode) {
              this.warpmode = entry[1]!;
              this.createPlayer();
            }
            break;
          case 'playbackRate':
            this.playbackRate = entry[1] ?? 1;
            break;
          case 'pitch':
            this.pitch = entry[1] ?? 1;
            break;
          case 'grainSize':
            this.grainSize = entry[1] ?? 0.1;
            break;
          case 'reverse':
            this.reverse = entry[1] ?? false;
            break;
          case 'id':
          case 'samplerId':
          case 'url':
          case 'color':
          case 'title':
            this[entry[0]] = entry[1] ?? '';
            break;
          case 'start':
            this.start = entry[1]!;
            break;
          case 'end':
            this.end = entry[1]!;
            break;
          case 'collapsed':
            this[entry[0]] = entry[1] ?? false;
            break;
          default:
            entry[0];
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        this.emit(`${entry[0]}Updated` as any, entry[1]);
      });

      this.emit('change', this);
    });
  }

  async loadBufferFromSampler() {
    await this.sampler.hasLoaded();

    const { buffer } = this.sampler;

    const start = Math.max(this.start, 0);
    // A slot can leave its region open-ended (end <= start) to mean "the whole
    // sample"; resolve that against the loaded buffer here.
    const end =
      this.end > this.start
        ? Math.min(this.end, buffer.duration)
        : buffer.duration;

    const slicedBuffer =
      start < end ? buffer.slice(start, end) : new ToneAudioBuffer();
    return slicedBuffer;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  updateBuffer = debounce(async (..._args: unknown[]) => {
    // Slice the (decoded) sampler buffer in memory. The compressed source it
    // comes from is cached on disk by the main process, so there's no need to
    // persist decoded PCM per slice.
    this.player.buffer = await this.loadBufferFromSampler();

    this.emit('load');
  }, 10);

  createPlayer() {
    if (this.player) {
      this.player.disconnect();
      this.player.dispose();
    }
    switch (this.warpmode) {
      case 'resample': {
        const player = new Player();
        // Tiny fades to declick slice boundaries: chopping a sample mid-
        // waveform otherwise pops on start/stop. A couple of milliseconds is
        // inaudible but smooths the discontinuity. (GrainPlayer's grain
        // envelopes already smooth its boundaries.)
        player.fadeIn = 0.002;
        player.fadeOut = 0.005;
        this.player = player;
        break;
      }
      case 'stretch':
        this.player = new GrainPlayer();
    }
    this.player.connect(this.output);
    this.updateBuffer();
  }

  serialize() {
    return {
      name: 'Slice',
      title: this.title,
      id: this.id,
      samplerId: this.samplerId,
      url: this.url,
      inputGain: this.input.gain.value,
      warpmode: this.warpmode,
      start: this.start,
      end: this.end,
      volume: this.volume,
      playbackRate: this.playbackRate,
      pitch: this.pitch,
      grainSize: this.grainSize,
      reverse: this.reverse,
      color: this.color,
      mute: this.player.mute,
      collapsed: this.collapsed,
    } as const;
  }

  stop(time?: number) {
    this.player.stop(time);
    this.emit('playingUpdated', false);
  }

  dispose() {
    this.sampler.off('change', this.samplerChangeHandler);
    this.sampler.removeSlice(this);
    this.engine.off('draw', this.handleDraw);
    this.engine.off('stop', this.handleTransportStop);

    this.player.stop();
    this.player.disconnect();
    this.player.dispose();

    // super.dispose() disconnects and disposes input/output; do it last so we
    // don't touch the output node after it's already been disposed.
    super.dispose();
    this.removeAllListeners();
  }

  play(time?: number) {
    if (!this.player.buffer.loaded) return;

    try {
      // Honour the slot's root note when auditioning/playing directly (no step).
      const pitchCents = this.sampler.rootNote * 100;
      if (this.player instanceof GrainPlayer) {
        if (this.playbackRate !== this.player.playbackRate) {
          this.player.playbackRate = this.playbackRate;
        }
        this.player.detune = this.pitch + pitchCents;
        this.player.grainSize = this.grainSize;
      } else {
        const rate = this.playbackRate * Math.pow(2, pitchCents / 1200);
        if (rate !== this.player.playbackRate) this.player.playbackRate = rate;
      }

      this.player.stop(time);
      this.player.start(time);
      this.firstFrameTime = time ?? this.player.immediate();
    } catch {
      // Tone throws if start/stop land on an identical transport time; the
      // retrigger is dropped, which is fine — no need to surface it.
    }

    requestAnimationFrame(() => this.emit('playingUpdated', true));
  }
}
