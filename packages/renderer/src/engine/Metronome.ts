import { Gain, Synth, type ToneAudioNode } from 'tone';
import type { Transport } from 'tone/build/esm/core/clock/Transport';

/**
 * A transport-synced click track. While the transport is running and the
 * metronome is enabled it ticks once per beat, with an accented (higher) click
 * on the downbeat of each bar. It is purely a monitoring aid for playing /
 * recording in time: it is NOT part of the serialized project, so it never
 * lands in undo/redo, autosave, or a mixdown export (the offline render engine
 * is created with the metronome disabled and is never enabled).
 *
 * The output is routed into the master bus (before the limiter/meter) so the
 * click respects master volume and shows on the master meter.
 */
export class Metronome {
  private output = new Gain(0.5);

  // A short percussive blip. Square wave + a fast decay envelope gives a clear,
  // dry tick that cuts through a busy mix without ringing.
  private synth = new Synth({
    oscillator: { type: 'square' },
    envelope: { attack: 0.001, decay: 0.04, sustain: 0, release: 0.02 },
  });

  private repeatId?: number;

  public enabled = false;

  constructor(private transport: Transport, destination: ToneAudioNode) {
    this.synth.connect(this.output);
    this.output.connect(destination);
  }

  setEnabled(enabled: boolean) {
    if (enabled === this.enabled) return;
    this.enabled = enabled;
    // Toggle the click on/off live if the transport is already running;
    // otherwise it'll be scheduled by the next onStart().
    if (this.transport.state === 'started') {
      if (enabled) this.schedule();
      else this.unschedule();
    }
  }

  // Called by the Engine when the transport starts/stops.
  onStart() {
    if (this.enabled) this.schedule();
  }

  onStop() {
    this.unschedule();
  }

  private schedule() {
    this.unschedule();
    this.repeatId = this.transport.scheduleRepeat((time) => {
      // Map the audio-clock time back to a beat index so the downbeat accent
      // stays correct even when playback starts from an offset.
      const beat = Math.round(
        this.transport.getTicksAtTime(time) / this.transport.PPQ,
      );
      // Tone's getter is normally a plain number (the numerator over 4); the
      // array form is [numerator, denominator], so the beats-per-bar is [0].
      const signature = this.transport.timeSignature;
      const beatsPerBar = Array.isArray(signature) ? signature[0] : signature;
      const isDownbeat = beatsPerBar > 0 && beat % beatsPerBar === 0;

      this.synth.triggerAttackRelease(
        isDownbeat ? 'C6' : 'C5',
        '32n',
        time,
        isDownbeat ? 1 : 0.7,
      );
    }, '4n');
  }

  private unschedule() {
    if (this.repeatId !== undefined) {
      this.transport.clear(this.repeatId);
      this.repeatId = undefined;
    }
  }

  dispose() {
    this.unschedule();
    this.synth.dispose();
    this.output.dispose();
  }
}
