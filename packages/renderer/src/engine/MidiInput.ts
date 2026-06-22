import { now } from 'tone';
import type { Engine } from './Engine';
import { EngineBase } from './EngineBase';
import type { Pattern } from './device/Patttern';
import { PIANO_ROLL_ROOT_MIDI, velocityToGain } from './device/Patttern';
import { SequencerDevice } from './device/Sequencer';

// Minimal Web MIDI typings — the DOM lib shipped with our TS version doesn't
// include the Web MIDI API, and we only touch this small surface.
interface WebMidiMessageEvent {
  data: Uint8Array;
}
interface WebMidiInput {
  id: string;
  name: string | null;
  onmidimessage: ((event: WebMidiMessageEvent) => void) | null;
}
interface WebMidiAccess {
  inputs: Map<string, WebMidiInput>;
  onstatechange: (() => void) | null;
}
type RequestMIDIAccess = (options?: {
  sysex?: boolean;
}) => Promise<WebMidiAccess>;

export type MidiInputInfo = { id: string; name: string };

type MidiInputEvents = {
  inputsUpdated: (inputs: MidiInputInfo[]) => void;
  selectedInputIdUpdated: (id: string | undefined) => void;
  channelUpdated: (channel: number) => void;
  targetTrackIndexUpdated: (index: number) => void;
  recordingUpdated: (recording: boolean) => void;
  enabledUpdated: (enabled: boolean) => void;
  // Fired on note-on/off so the UI can flash an activity LED.
  activity: (midi: number, on: boolean) => void;
  change: (midi: MidiInput) => void;
};

/**
 * Web MIDI keyboard input. Routes incoming notes to the currently selected
 * "target" track's voice (live audition) and, when record is armed and the
 * transport is running, overdubs the played notes into that track's pattern.
 *
 * Notes are the single source of truth (see Pattern), so a recorded note shows
 * up identically in the step grid and the piano roll.
 */
export class MidiInput extends EngineBase<MidiInputEvents> {
  private access?: WebMidiAccess;
  private boundInput?: WebMidiInput;

  inputs: MidiInputInfo[] = [];
  selectedInputId?: string;
  // 0 = omni (all channels); 1..16 = a specific MIDI channel.
  channel = 0;
  // Which track receives MIDI (index into engine.tracks).
  targetTrackIndex = 0;
  recording = false;
  // Whether Web MIDI access was granted (false in the web build / if denied).
  enabled = false;

  // midi note -> when it started, so note-off can compute the recorded length.
  private activeRecordings = new Map<
    number,
    { startTicks: number; velocity: number }
  >();

  constructor(private engine: Engine) {
    super();
    this.setMaxListeners(1000);
  }

  // Request access and start listening. Safe to call more than once; only the
  // live engine should call it (not the offline render engine).
  async init() {
    const request = (
      navigator as unknown as {
        requestMIDIAccess?: RequestMIDIAccess;
      }
    ).requestMIDIAccess;
    if (!request) {
      this.setEnabled(false);
      return;
    }
    try {
      this.access = await request.call(navigator, { sysex: false });
      this.setEnabled(true);
      this.access.onstatechange = () => this.refreshInputs();
      this.refreshInputs();
    } catch {
      this.setEnabled(false);
    }
  }

  private setEnabled(enabled: boolean) {
    if (this.enabled === enabled) return;
    this.enabled = enabled;
    this.emit('enabledUpdated', enabled);
    this.emit('change', this);
  }

  private refreshInputs() {
    if (!this.access) return;
    this.inputs = [...this.access.inputs.values()].map((input) => ({
      id: input.id,
      name: input.name || 'MIDI input',
    }));
    this.emit('inputsUpdated', this.inputs);
    this.emit('change', this);

    // Auto-select the first device, or re-bind if the current one vanished.
    if (
      !this.selectedInputId ||
      !this.inputs.some((input) => input.id === this.selectedInputId)
    ) {
      this.setSelectedInput(this.inputs[0]?.id);
    } else {
      this.bind();
    }
  }

  setSelectedInput(id: string | undefined) {
    this.selectedInputId = id;
    this.emit('selectedInputIdUpdated', id);
    this.bind();
    this.emit('change', this);
  }

  private bind() {
    if (this.boundInput) this.boundInput.onmidimessage = null;
    this.boundInput = this.selectedInputId
      ? this.access?.inputs.get(this.selectedInputId)
      : undefined;
    if (this.boundInput) {
      this.boundInput.onmidimessage = (event) => this.handleMessage(event);
    }
  }

  setChannel(channel: number) {
    this.channel = Math.max(0, Math.min(16, Math.round(channel)));
    this.emit('channelUpdated', this.channel);
    this.emit('change', this);
  }

  setTargetTrackIndex(index: number) {
    this.targetTrackIndex = Math.max(0, Math.round(index));
    this.emit('targetTrackIndexUpdated', this.targetTrackIndex);
    this.emit('change', this);
  }

  setRecording(recording: boolean) {
    this.recording = recording;
    if (!recording) this.activeRecordings.clear();
    this.emit('recordingUpdated', recording);
    this.emit('change', this);
  }

  private handleMessage(event: WebMidiMessageEvent) {
    const [status, data1, data2] = event.data;
    if (status === undefined) return;
    const messageChannel = (status & 0x0f) + 1; // 1..16
    if (this.channel !== 0 && messageChannel !== this.channel) return;

    const type = status & 0xf0;
    const midi = data1 ?? 0;
    const velocity = data2 ?? 0;

    if (type === 0x90 && velocity > 0) {
      this.noteOn(midi, velocity);
    } else if (type === 0x80 || (type === 0x90 && velocity === 0)) {
      this.noteOff(midi);
    }
  }

  private targetSequencer(): SequencerDevice | undefined {
    const track = this.engine.tracks[this.targetTrackIndex];
    return track?.chain.devices.find(
      (device): device is SequencerDevice => device instanceof SequencerDevice,
    );
  }

  private noteOn(midi: number, velocity: number) {
    const sequencer = this.targetSequencer();
    if (sequencer) {
      // Live audition — same path the on-screen keys + step grid use.
      sequencer.onSequenceEvent(now(), {
        play: true,
        volume: velocityToGain(velocity),
        playbackRate: 1,
        pitch: (midi - PIANO_ROLL_ROOT_MIDI) * 100,
        reverse: false,
      });

      if (this.recording && this.engine.transport.state === 'started') {
        const pattern = sequencer.getPattern();
        if (pattern) {
          this.activeRecordings.set(midi, {
            startTicks: this.recordPositionTicks(pattern),
            velocity,
          });
        }
      }
    }
    this.emit('activity', midi, true);
  }

  private noteOff(midi: number) {
    const recording = this.activeRecordings.get(midi);
    if (recording) {
      this.activeRecordings.delete(midi);
      const sequencer = this.targetSequencer();
      const pattern = sequencer?.getPattern();
      if (pattern) {
        const stepLen = pattern.stepDurationTicks();
        // Snap the start to the grid and the length to whole cells (min one),
        // so overdubs land tidy; the user can fine-tune in the roll.
        const start = Math.round(recording.startTicks / stepLen) * stepLen;
        const end = this.recordPositionTicks(pattern);
        let held = end - recording.startTicks;
        if (held <= 0) held += pattern.duration; // wrapped past the loop end
        const durationTicks = Math.max(
          stepLen,
          Math.round(held / stepLen) * stepLen,
        );
        pattern.set({
          notes: [
            ...pattern.notes,
            { ticks: start, durationTicks, midi, velocity: recording.velocity },
          ].sort((a, b) => a.ticks - b.ticks),
        });
      }
    }
    this.emit('activity', midi, false);
  }

  // Current transport position folded into the pattern's loop, in the pattern's
  // own ppq ticks.
  private recordPositionTicks(pattern: Pattern): number {
    const transportPPQ = Number.isFinite(this.engine.transport.PPQ)
      ? this.engine.transport.PPQ
      : 192;
    const patternTicks = Math.round(
      this.engine.transport.ticks * ((pattern.ppq || 192) / transportPPQ),
    );
    const loop = pattern.duration || (pattern.ppq || 192) * 4;
    return ((patternTicks % loop) + loop) % loop;
  }

  dispose() {
    if (this.boundInput) this.boundInput.onmidimessage = null;
    if (this.access) this.access.onstatechange = null;
    this.activeRecordings.clear();
    this.removeAllListeners();
  }
}
