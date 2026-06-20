import { batch, createUniqueId } from 'solid-js';
import { getContext, Player, ToneAudioBuffer } from 'tone';
import { notify } from '../../notifications';
import type { Engine } from '../Engine';
import { EngineBase } from '../EngineBase';
import type { PropertyUpdateEvents } from '../helpers';
import { entries, fetchSliceUrlInfo, randomColor } from '../helpers';
import { loadFileAsBuffer, resolveFileUrl } from '../localFile';
import type { DeepPartial } from '../types';
import type { Device } from './Device';
import type { Slice } from './Slice';

export type SerializedSampler = {
  name: 'Sampler';
  // Stable per-slot id. A sampler is a "sample slot": one source video and one
  // selected region the user prepared. Multiple slots can share a url (chops),
  // so slots are keyed by id, not url.
  id: string;
  title: string;
  url: string;
  // Thumbnail/cover image URL (proxied through the main process when shown).
  cover: string;
  zoom: number;
  position: number;
  // The selected region (seconds). end <= start means "to the end of the
  // buffer" — see selectionEnd().
  start: number;
  end: number;
  // Base pitch ("root note", semitones) applied when the sample is played;
  // sequencer steps pitch up/down from here.
  rootNote: number;
  color: string;
  // Sound-shaping params. The slot is the complete definition of a sound; a
  // voice just triggers it (clone a slot to make a variation). Per-step
  // pitch/velocity still come from the sequencer pattern.
  volume: number;
  playbackRate: number;
  warpmode: 'resample' | 'stretch';
  reverse: boolean;
  grainSize: number;
};

type SamplerDeviceEvents = {
  sliceAdded: (slice: Slice) => void;
  sliceRemoved: (slice: Slice) => void;
  sliceUpdated: (slice: Slice) => void;
  sliceSelected: (slice?: Slice) => void;
  load: () => void;
  change: (sampler: SamplerDevice) => void;
} & PropertyUpdateEvents<SerializedSampler>;

export class SamplerDevice extends EngineBase<SamplerDeviceEvents> {
  name = 'Sampler';
  buffer = new ToneAudioBuffer();
  slices: Slice[] = [];
  id = '';
  url = '';
  cover = '';
  zoom = 1;
  position = 0;
  start = 0;
  end = 0;
  rootNote = 0;
  color = '';
  title = '';
  volume = 1;
  playbackRate = 1;
  warpmode: SerializedSampler['warpmode'] = 'resample';
  reverse = false;
  grainSize = 0.1;
  selectedSlice?: Slice;

  // Transient preview player for the Audition button.
  private auditionPlayer?: Player;

  private isLoading = false;

  private _hasLoaded = false;

  static normalizeData = (
    sampler: DeepPartial<SerializedSampler>,
  ): SerializedSampler => ({
    name: 'Sampler',

    id: sampler.id && sampler.id !== '' ? sampler.id : createUniqueId(),
    title: sampler.title ?? '',
    url: sampler.url ?? '',
    cover: sampler.cover ?? '',
    position: sampler.position ?? 0,
    zoom: sampler.zoom ?? 1,
    start: sampler.start ?? 0,
    end: sampler.end ?? 0,
    rootNote: sampler.rootNote ?? 0,
    color: sampler.color ?? randomColor(),
    volume: sampler.volume ?? 1,
    playbackRate: sampler.playbackRate ?? 1,
    warpmode: sampler.warpmode ?? 'resample',
    reverse: sampler.reverse ?? false,
    grainSize: sampler.grainSize ?? 0.1,
  });

  constructor(public engine: Engine, serializedSampler: SerializedSampler) {
    super();
    this.setMaxListeners(1000);

    this.on('sliceAdded', this.emitChange);
    this.on('sliceRemoved', this.emitChange);
    this.set(serializedSampler);
  }

  emitChange = () => this.emit('change', this);

  private async load() {
    this.isLoading = true;
    this._hasLoaded = false;

    try {
      if (this.url.startsWith('http://file.local')) {
        const file = await resolveFileUrl(this.url);
        if (!file) throw new Error('the local file could not be opened');

        const arrayBuffer = await loadFileAsBuffer(file);
        const audioBuffer = await getContext().decodeAudioData(arrayBuffer);
        this.buffer.set(audioBuffer);
      } else {
        // Remote sources are cached as compressed files on disk by the main
        // process; fetch the bytes (cache hit or fresh yt-dlp download) and
        // decode them here.
        const base64StringOrBuffer = await this.loadArrayBuffer();

        const arrayBuffer =
          typeof base64StringOrBuffer === 'string'
            ? base64ToArrayBuffer(base64StringOrBuffer)
            : base64StringOrBuffer;

        if (!arrayBuffer) throw new Error('no audio was returned');

        const audioBuffer = await getContext().decodeAudioData(arrayBuffer);
        this.buffer.set(audioBuffer);
      }
    } catch (error) {
      // Surface the failure instead of leaving the slice spinning forever.
      const reason = error instanceof Error ? error.message : 'unknown error';
      notify(`Couldn't load "${this.title || this.url}": ${reason}`, 'error');
    } finally {
      // Always resolve waiters (hasLoaded) even on failure so the UI doesn't
      // hang; the buffer simply stays empty and the slice won't play.
      this.emit('load');
      this.isLoading = false;
      this._hasLoaded = true;
    }
  }

  hasLoaded = async () => {
    if (this._hasLoaded) return;

    if (!this.isLoading) this.load();

    await new Promise<void>((resolve) =>
      this.once('load', () => {
        resolve();
      }),
    );
  };

  private async loadArrayBuffer() {
    const { buffer, title, cover } = await fetchSliceUrlInfo(this.url);
    // Only fill in metadata we don't already have, so a cover/title provided up
    // front (e.g. from a search result) isn't clobbered by a later fetch.
    this.set({
      ...(this.title ? {} : { title }),
      ...(this.cover || !cover ? {} : { cover }),
    });
    return buffer;
  }

  set(samplerPartial: Partial<SerializedSampler>) {
    batch(() => {
      entries(samplerPartial).forEach((entry) => {
        if (!entry) return;
        switch (entry[0]) {
          case 'id':
            this.id = entry[1] ?? '';
            break;
          case 'url':
            this.url = entry[1] ?? '';
            break;
          case 'cover':
            this.cover = entry[1] ?? '';
            break;
          case 'zoom':
            this.zoom = entry[1] ?? 1;
            break;
          case 'position':
            this.position = entry[1] ?? 0;
            break;
          case 'start':
            this.start = entry[1] ?? 0;
            break;
          case 'end':
            this.end = entry[1] ?? 0;
            break;
          case 'rootNote':
            this.rootNote = entry[1] ?? 0;
            break;
          case 'color':
            this.color = entry[1] ?? '';
            break;
          case 'title':
            this.title = entry[1] ?? '';
            break;
          case 'volume':
            this.volume = entry[1] ?? 1;
            break;
          case 'playbackRate':
            this.playbackRate = entry[1] ?? 1;
            break;
          case 'warpmode':
            this.warpmode = entry[1] ?? 'resample';
            break;
          case 'reverse':
            this.reverse = entry[1] ?? false;
            break;
          case 'grainSize':
            this.grainSize = entry[1] ?? 0.1;
            break;
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        this.emit(`${entry[0]}Updated` as any, entry[1]);
      });
    });
    this.emit('change', this);
  }

  // End of the selected region, resolving the "0 = to the end" convention
  // against the loaded buffer.
  selectionEnd() {
    return this.end > this.start ? this.end : this.buffer.duration;
  }

  // Preview the currently selected region (the Audition button). Uses a
  // throwaway Player routed through the engine master so it respects the
  // limiter; stops any previous preview first.
  audition() {
    this.stopAudition();
    if (!this.buffer.loaded) {
      // Kick a load and audition once it's ready.
      void this.hasLoaded().then(() =>
        this.buffer.loaded ? this.audition() : undefined,
      );
      return;
    }
    const start = Math.max(this.start, 0);
    const end = Math.min(this.selectionEnd(), this.buffer.duration);
    if (!(end > start)) return;

    const player = new Player(this.buffer.slice(start, end));
    player.connect(this.engine.gain);
    player.onstop = () => {
      player.dispose();
      if (this.auditionPlayer === player) this.auditionPlayer = undefined;
    };
    this.auditionPlayer = player;
    player.start();
  }

  stopAudition() {
    this.auditionPlayer?.stop();
    this.auditionPlayer?.dispose();
    this.auditionPlayer = undefined;
  }

  emitSliceUpdated = (slice: Slice) => {
    this.emit('sliceUpdated', slice);
  };

  findSlice(id: string) {
    return this.slices.find((slice) => slice.id === id);
  }

  addSlice(slice: Slice) {
    this.slices = [...this.slices, slice];
    this.emit('sliceAdded', slice);
    slice.on('change', (device: Device) =>
      this.emitSliceUpdated(device as Slice),
    );
  }

  selectSlice(slice: Slice) {
    this.selectedSlice = slice;
    this.emit('sliceSelected', slice);
  }

  removeSlice(slice: Slice) {
    this.slices = this.slices.filter((s) => s !== slice);
    this.emit('sliceRemoved', slice);
  }

  stop() {
    this.slices.forEach((slice) => slice.stop());
  }

  unload() {
    this.stopAudition();
    this.buffer.dispose();
    this.buffer = new ToneAudioBuffer();
    this._hasLoaded = false;
    this.isLoading = false;
  }

  dispose() {
    this.stopAudition();
    this.buffer.dispose();
  }

  serialize(): SerializedSampler {
    return {
      name: 'Sampler',
      id: this.id,
      title: this.title,
      url: this.url,
      cover: this.cover,
      zoom: this.zoom,
      position: this.position,
      start: this.start,
      end: this.end,
      rootNote: this.rootNote,
      color: this.color,
      volume: this.volume,
      playbackRate: this.playbackRate,
      warpmode: this.warpmode,
      reverse: this.reverse,
      grainSize: this.grainSize,
    };
  }
}
function base64ToArrayBuffer(base64: string) {
  const binary_string = window.atob(base64);
  const len = binary_string.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary_string.charCodeAt(i);
  }
  return bytes.buffer;
}
