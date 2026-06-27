import { Gain, Synth, type ToneAudioNode } from 'tone';
import type { Transport } from 'tone/build/esm/core/clock/Transport';

/**
 * A transport-synced click track with an optional count-in. While the transport
 * is running and the metronome is enabled it ticks once per beat, with an
 * accented (higher) click on the downbeat of each bar. With a count-in set, the
 * Engine plays N bars of clicks (on the audio clock, before the transport
 * starts) as a lead-in for playing / recording in time.
 *
 * It is purely a monitoring aid: it is NOT part of the serialized project, so it
 * never lands in undo/redo, autosave, or a mixdown export (the offline render
 * engine is created disabled and never enabled).
 *
 * The output is routed into the master bus (before the limiter/meter) so the
 * click respects master volume and shows on the master meter.
 */
export class Metronome {
  private output = new Gain(0.5);

  private synth: Synth;

  private repeatId?: number;

  public enabled = false;

  // Lead-in bars played before the transport starts. 0 = off.
  public countInBars = 0;

  constructor(private transport: Transport, destination: ToneAudioNode) {
    this.synth = this.makeSynth();
    this.output.connect(destination);
  }

  // A short percussive blip: square wave + a fast decay envelope gives a clear,
  // dry tick that cuts through a busy mix without ringing.
  private makeSynth() {
    return new Synth({
      oscillator: { type: 'square' },
      envelope: { attack: 0.001, decay: 0.04, sustain: 0, release: 0.02 },
    }).connect(this.output);
  }

  private beatsPerBar() {
    // Tone's getter is normally a plain number (the numerator over 4); the array
    // form is [numerator, denominator], so the beats-per-bar is [0].
    const signature = this.transport.timeSignature;
    return Array.isArray(signature) ? signature[0] : signature;
  }

  private click(note: string, time: number, accent: boolean) {
    this.synth.triggerAttackRelease(note, '32n', time, accent ? 1 : 0.7);
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

  setCountInBars(bars: number) {
    this.countInBars = Math.max(0, Math.round(bars));
  }

  /**
   * Schedule `countInBars` bars of clicks on the audio clock starting at
   * `startTime`, and return the total lead-in duration in seconds. The clicks
   * land on beats [0 .. N-1]; the transport is meant to start on beat N, so the
   * (enabled) ongoing metronome's beat-0 click isn't doubled with the last
   * count-in click.
   */
  playCountIn(startTime: number): number {
    const beatsPerBar = this.beatsPerBar();
    const beatDuration = 60 / this.transport.bpm.value;
    const totalBeats = this.countInBars * beatsPerBar;
    for (let i = 0; i < totalBeats; i++) {
      this.click(
        i % beatsPerBar === 0 ? 'C6' : 'C5',
        startTime + i * beatDuration,
        i % beatsPerBar === 0,
      );
    }
    return totalBeats * beatDuration;
  }

  /**
   * Drop any count-in clicks already scheduled on the audio clock (there's no
   * per-event cancel for triggerAttackRelease, so replace the synth). Used when
   * playback is stopped mid count-in.
   */
  cancelCountIn() {
    this.synth.dispose();
    this.synth = this.makeSynth();
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
      const beatsPerBar = this.beatsPerBar();
      const isDownbeat = beatsPerBar > 0 && beat % beatsPerBar === 0;
      this.click(isDownbeat ? 'C6' : 'C5', time, isDownbeat);
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
