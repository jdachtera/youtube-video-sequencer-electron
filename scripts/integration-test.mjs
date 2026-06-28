#!/usr/bin/env node
/**
 * Headless integration test harness.
 *
 * This is the "complete control" test for the Electron app: it drives the real
 * audio engine end-to-end with no network and no audio hardware, and asserts on
 * what actually comes out of the master bus. It builds the app with the engine
 * exposed (VITE_EXPOSE_ENGINE -> window.__engine), launches it under Xvfb,
 * seeds a fixture project, injects a synthesized sine straight into the samplers
 * (the real yt-dlp download path goes through a frozen contextBridge object that
 * can't be stubbed, and there's no headless file access), then runs a series of
 * labelled sub-tests:
 *
 *   1. sound      — step grid AND piano-roll each produce audio (master meter).
 *   2. pitch      — a roll note an octave up plays back at 2x frequency. The
 *                   injected sample is a pure 440 Hz sine, so we can verify the
 *                   resample pitch-shift by autocorrelating a native AnalyserNode
 *                   tapped onto the master bus (midi 60 -> ~440 Hz, 72 -> ~880).
 *   3. automation — a flat volume automation curve at 0.25 scales the master
 *                   peak to ~1/4 of the un-automated peak.
 *   4. midi       — a *mocked* Web MIDI device drives the full MidiInput path:
 *                   live audition (sound), record-into-pattern (a note is added
 *                   to the target track), and channel filtering (a note on the
 *                   wrong channel is ignored).
 *   5. scheduling — rapid clip launches + mode switches while the transport runs
 *                   never throw a Tone "time must be >= last scheduled" / stack
 *                   overflow in the renderer (the two crashes we fixed).
 *
 * Everything runs offline. Audio analysis uses a LIVE AnalyserNode on the master
 * bus, NOT engine.renderToBuffer — the offline render engine rebuilds itself
 * from serialize() and re-downloads its samples, so it can't see the injected
 * buffers.
 *
 * Usage:
 *   node scripts/integration-test.mjs            # build (engine exposed), run
 *   node scripts/integration-test.mjs --no-build # reuse an existing exposed build
 */
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const require = createRequire(import.meta.url);
const __dirname = dirname(fileURLToPath(import.meta.url));
const repo = resolve(__dirname, '..');
const args = process.argv.slice(2);
const noBuild = args.includes('--no-build');
const WIDTH = 1400;
const HEIGHT = 900;

const has = (cmd) =>
  spawnSync('sh', ['-c', `command -v ${cmd}`], { stdio: 'ignore' }).status === 0;

// Re-exec under a virtual framebuffer when there's no display (CI / containers).
if (
  process.platform === 'linux' &&
  !process.env.DISPLAY &&
  !process.env.__ITEST_XVFB
) {
  if (!has('xvfb-run')) {
    console.error('[itest] No DISPLAY and xvfb-run is not installed.');
    process.exit(1);
  }
  const r = spawnSync(
    'xvfb-run',
    [
      '-a',
      '-s',
      `-screen 0 ${WIDTH}x${HEIGHT}x24`,
      'node',
      fileURLToPath(import.meta.url),
      ...args,
    ],
    { stdio: 'inherit', cwd: repo, env: { ...process.env, __ITEST_XVFB: '1' } },
  );
  process.exit(r.status ?? 1);
}

if (!noBuild) {
  console.log('[itest] Building app (engine exposed)...');
  const b = spawnSync('pnpm', ['build'], {
    stdio: 'inherit',
    cwd: repo,
    env: { ...process.env, VITE_EXPOSE_ENGINE: 'true', MODE: 'production' },
  });
  if (b.status !== 0) process.exit(b.status ?? 1);
}

const electronPath = require('electron');
const { _electron } = require('playwright-core');

const electronArgs = ['.'];
if (process.platform === 'linux') {
  electronArgs.push('--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage');
}

// Fixture: one sampler (root note C4, plays the injected sample at its natural
// pitch) and two tracks — a step grid and a piano roll — each triggering it.
const seed = JSON.stringify({
  samplers: [
    {
      name: 'Sampler',
      id: 's0',
      title: 'Test',
      url: 'https://www.youtube.com/watch?v=test',
      start: 0,
      end: 0,
      rootNote: 0,
    },
  ],
  tracks: [
    {
      name: 'Step',
      chain: {
        name: 'DeviceChain',
        devices: [
          {
            name: 'Sequencer',
            patterns: [
              {
                mode: 'steps',
                steps: [
                  { play: true },
                  { play: true },
                  { play: true },
                  { play: true },
                ],
              },
            ],
          },
          { name: 'Slice', samplerId: 's0' },
        ],
      },
    },
    {
      name: 'Roll',
      chain: {
        name: 'DeviceChain',
        devices: [
          {
            name: 'Sequencer',
            patterns: [
              {
                mode: 'pianoroll',
                duration: 768,
                notes: [
                  { ticks: 0, durationTicks: 192, midi: 60, velocity: 100 },
                  { ticks: 384, durationTicks: 192, midi: 67, velocity: 100 },
                ],
              },
            ],
          },
          { name: 'Slice', samplerId: 's0' },
        ],
      },
    },
  ],
  bpm: 120,
});

const app = await _electron.launch({
  executablePath: electronPath,
  cwd: repo,
  args: electronArgs,
  env: { ...process.env, MODE: 'production' },
  timeout: 60000,
});

// Collect every uncaught renderer error for the scheduling assertion.
const pageErrors = [];
const win = await app.firstWindow({ timeout: 30000 });
win.on('pageerror', (e) => {
  pageErrors.push(e.message);
  console.log('[renderer:pageerror]', e.message);
});
await win.waitForLoadState('domcontentloaded').catch(() => {});

await win.evaluate((s) => localStorage.setItem('track', s), seed);
await win.reload();
await win.waitForLoadState('domcontentloaded').catch(() => {});

// ---------------------------------------------------------------------------
// 0. Setup: wait for the engine, inject a 2s 440 Hz sine into every sampler,
//    tap a native AnalyserNode onto the master bus, and install page-side
//    helpers (peak meter, autocorrelation pitch detector) reused below.
// ---------------------------------------------------------------------------
const setup = await win.evaluate(async () => {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const wait = async (cond, ms = 10000) => {
    const t0 = Date.now();
    while (!cond()) {
      if (Date.now() - t0 > ms) throw new Error('timeout waiting for engine');
      await sleep(50);
    }
  };
  const w = window;
  await wait(() => w.__engine && w.__engine.samplers && w.__engine.samplers.length > 0);
  await wait(() => w.__engine.tracks && w.__engine.tracks.length > 1);
  const e = w.__engine;
  const ctx = e.gain.context.rawContext;
  const sr = ctx.sampleRate;

  // A 2s steady 440 Hz sine (long enough that a single trigger sustains across
  // the pitch-capture window). Amplitude 0.5 stays under the master limiter
  // (-1 dBFS ~= 0.89), so peak measurements stay linear for the automation test.
  const ab = ctx.createBuffer(1, Math.floor(sr * 2), sr);
  const ch = ab.getChannelData(0);
  for (let i = 0; i < ch.length; i++) {
    ch[i] = Math.sin((2 * Math.PI * 440 * i) / sr) * 0.5;
  }
  for (const s of e.samplers) {
    s.buffer.set(ab);
    s._hasLoaded = true;
  }
  await e.hasLoaded();
  await e.gain.context.resume().catch(() => {});

  // Native analyser tapped onto the master bus for time-domain capture (pitch).
  // An AnalyserNode only updates its buffer when it's pulled by the renderer, so
  // it must have a path to the destination — route it through a muted gain so
  // it stays "active" without adding any audible signal (the meter taps the
  // limiter separately, so this doesn't perturb peak measurements).
  const analyser = ctx.createAnalyser();
  analyser.fftSize = 8192;
  const silent = ctx.createGain();
  silent.gain.value = 0;
  analyser.connect(silent);
  silent.connect(ctx.destination);
  let analyserConnected = false;
  try {
    e.limiter.connect(analyser);
    analyserConnected = true;
  } catch (err) {
    try {
      e.gain.connect(analyser);
      analyserConnected = true;
    } catch (err2) {
      analyserConnected = false;
    }
  }
  w.__analyser = analyser;

  // --- page-side helpers (persist on window for later evaluate() calls) ---
  w.__sleep = sleep;

  // Master peak over a window of live transport playback.
  w.__measureTransportPeak = async (ms = 1500) => {
    e.start();
    let peak = 0;
    const t0 = Date.now();
    while (Date.now() - t0 < ms) {
      const v = e.meter.getValue();
      const lv = Array.isArray(v) ? Math.max(...v) : v;
      if (Number.isFinite(lv) && lv > peak) peak = lv;
      await sleep(40);
    }
    e.stop();
    await sleep(150);
    return peak;
  };

  // Master peak over a window WITHOUT the transport (audition path).
  w.__measureIdlePeak = async (ms = 600) => {
    let peak = 0;
    const t0 = Date.now();
    while (Date.now() - t0 < ms) {
      const v = e.meter.getValue();
      const lv = Array.isArray(v) ? Math.max(...v) : v;
      if (Number.isFinite(lv) && lv > peak) peak = lv;
      await sleep(30);
    }
    return peak;
  };

  // Normalized autocorrelation: returns the dominant frequency (Hz) of a
  // time-domain frame, or -1 if it's too quiet / no clear period.
  w.__autoCorrelate = (buf, sampleRate) => {
    const size = buf.length;
    let rms = 0;
    for (let i = 0; i < size; i++) rms += buf[i] * buf[i];
    rms = Math.sqrt(rms / size);
    if (rms < 0.005) return -1;
    const minLag = Math.floor(sampleRate / 1500); // up to 1500 Hz
    const maxLag = Math.floor(sampleRate / 150); //  down to 150 Hz
    let bestLag = -1;
    let bestCorr = 0;
    for (let lag = minLag; lag <= maxLag; lag++) {
      let corr = 0;
      for (let i = 0; i < size - lag; i++) corr += buf[i] * buf[i + lag];
      corr /= size - lag;
      if (corr > bestCorr) {
        bestCorr = corr;
        bestLag = lag;
      }
    }
    return bestLag > 0 ? sampleRate / bestLag : -1;
  };

  // Median dominant frequency over a capture window.
  w.__captureFreq = async (ms = 400) => {
    const a = w.__analyser;
    if (!a) return -1;
    const buf = new Float32Array(a.fftSize);
    const freqs = [];
    const t0 = Date.now();
    while (Date.now() - t0 < ms) {
      a.getFloatTimeDomainData(buf);
      const f = w.__autoCorrelate(buf, a.context.sampleRate);
      if (f > 0) freqs.push(f);
      await sleep(20);
    }
    if (!freqs.length) return -1;
    freqs.sort((x, y) => x - y);
    return freqs[Math.floor(freqs.length / 2)];
  };

  // The sequencer device on a given track index (drives the audition path).
  w.__seqOf = (trackIndex) =>
    e.tracks[trackIndex]?.chain.devices.find((d) => d.name === 'Sequencer');

  // Solo a single track by muting the others (peak isolation).
  w.__solo = (trackIndex) =>
    e.tracks.forEach((t, i) => t.set({ mute: i !== trackIndex }));

  return {
    samplerCount: e.samplers.length,
    trackCount: e.tracks.length,
    sampleDuration: e.samplers[0].buffer.duration,
    contextState: ctx.state,
    sampleRate: sr,
    analyserConnected,
  };
});
console.log('[itest] setup:', JSON.stringify(setup));

// Buffer sharing: both seeded voices play the same sample/region, so they must
// reference the SAME underlying AudioBuffer (one shared slice, not a per-voice
// copy). Different objects here would mean each voice copied the decoded PCM.
const bufferShare = await win.evaluate(async () => {
  const w = window;
  const e = w.__engine;
  await e.hasLoaded();
  const sliceOf = (t) => e.tracks[t]?.chain.devices.find((d) => d.name === 'Slice');
  const b0 = sliceOf(0)?.player?.buffer?.get?.();
  const b1 = sliceOf(1)?.player?.buffer?.get?.();
  return { hasBoth: !!b0 && !!b1, shared: !!b0 && b0 === b1 };
});
console.log('[itest] bufferShare:', JSON.stringify(bufferShare));

// ---------------------------------------------------------------------------
// 1. Sound: step grid and piano roll each produce audio on the master bus.
// ---------------------------------------------------------------------------
const sound = await win.evaluate(async () => {
  const w = window;
  w.__solo(0); // step track
  const stepPeak = await w.__measureTransportPeak(1500);
  w.__solo(1); // roll track
  const rollPeak = await w.__measureTransportPeak(1500);
  return { stepPeak, rollPeak };
});
console.log('[itest] sound:', JSON.stringify(sound));

// ---------------------------------------------------------------------------
// 2. Pitch: a note an octave above the root resamples to twice the frequency.
// ---------------------------------------------------------------------------
const pitch = await win.evaluate(async () => {
  const w = window;
  const e = w.__engine;
  const ctx = e.gain.context.rawContext;
  w.__solo(1); // roll track plays the sample
  const seq = w.__seqOf(1);
  const trigger = (midi) =>
    seq.onSequenceEvent(ctx.currentTime + 0.03, {
      play: true,
      volume: 1,
      playbackRate: 1,
      pitch: (midi - 60) * 100, // PIANO_ROLL_ROOT_MIDI = 60
      reverse: false,
    });

  trigger(60); // root -> sample's natural 440 Hz
  await w.__sleep(150);
  const freq60 = await w.__captureFreq(450);

  trigger(72); // +1 octave -> resampled to 880 Hz
  await w.__sleep(150);
  const freq72 = await w.__captureFreq(450);

  return { freq60, freq72 };
});
console.log('[itest] pitch:', JSON.stringify(pitch));

// ---------------------------------------------------------------------------
// 3. Automation: a flat 0.25 volume curve scales the master peak to ~1/4.
// ---------------------------------------------------------------------------
const automation = await win.evaluate(async () => {
  const w = window;
  const e = w.__engine;
  w.__solo(1); // roll track
  const seq = w.__seqOf(1);
  const pattern = seq.getPattern();
  // Snapshot so later tests (MIDI record) see the original pattern.
  const snap = {
    mode: pattern.mode,
    duration: pattern.duration,
    notes: pattern.notes.map((n) => ({ ...n })),
    automation: JSON.parse(JSON.stringify(pattern.automation || {})),
  };

  // A single sustained note over a 1-bar loop: one steady voice (no retrigger
  // stacking), well under the master limiter, so the meter peak stays linear
  // and the automation ratio reads true.
  pattern.set({
    mode: 'pianoroll',
    duration: 768,
    notes: [{ ticks: 0, durationTicks: 740, midi: 60, velocity: 100 }],
    automation: {},
  });

  // Force a fresh Part (mode steps -> pianoroll tears down + rebuilds it) before
  // each measure, so the note-at-tick-0 fires in sync with the transport start
  // instead of being left on a stale pre-armed schedule from the prior stop.
  const measureClean = async () => {
    e.stop();
    await w.__sleep(250); // let the previous voice decay
    pattern.set({ mode: 'steps' });
    pattern.set({ mode: 'pianoroll' });
    return w.__measureTransportPeak(1400);
  };

  const basePeak = await measureClean();

  pattern.set({
    automation: {
      volume: [
        { ticks: 0, value: 0.25 },
        { ticks: 100000, value: 0.25 },
      ],
    },
  });
  const autoPeak = await measureClean();

  pattern.set(snap); // restore
  return { basePeak, autoPeak, ratio: basePeak > 0 ? autoPeak / basePeak : -1 };
});
console.log('[itest] automation:', JSON.stringify(automation));

// ---------------------------------------------------------------------------
// 4. MIDI: a mocked Web MIDI device drives audition, record, and channel filter.
// ---------------------------------------------------------------------------
const midi = await win.evaluate(async () => {
  const w = window;
  const e = w.__engine;
  const sleep = w.__sleep;

  // Install a fake Web MIDI backend (Electron's real one has no devices, and we
  // want deterministic input). One input whose onmidimessage MidiInput binds to.
  const input = { id: 'mock', name: 'Mock Keyboard', onmidimessage: null };
  const access = { inputs: new Map([['mock', input]]), onstatechange: null };
  Object.defineProperty(navigator, 'requestMIDIAccess', {
    configurable: true,
    writable: true,
    value: async () => access,
  });

  // Re-init so MidiInput picks up the mock and binds input.onmidimessage.
  await e.midiInput.init();
  const send = (bytes) =>
    input.onmidimessage && input.onmidimessage({ data: new Uint8Array(bytes) });

  // (a) Audition: a note-on (no transport) makes sound on the target track.
  e.stop();
  w.__solo(0);
  e.midiInput.setTargetTrackIndex(0);
  e.midiInput.setChannel(0); // omni
  e.midiInput.setRecording(false);
  send([0x90, 60, 100]); // note on, ch 1
  const auditionPeak = await w.__measureIdlePeak(600);
  send([0x80, 60, 0]); // note off

  // (b) Record: with the transport running and record armed, a played note is
  //     overdubbed into the target track's pattern.
  const seq = w.__seqOf(1); // record into the roll track
  e.midiInput.setTargetTrackIndex(1);
  e.midiInput.setRecording(true);
  const before = seq.getPattern().notes.length;
  e.start();
  await sleep(60);
  send([0x90, 64, 100]); // note on, ch 1
  await sleep(250);
  send([0x80, 64, 0]); // note off
  await sleep(60);
  const afterRecord = seq.getPattern().notes.length;

  // (c) Channel filter: locked to channel 1, a note on channel 2 is ignored.
  e.midiInput.setChannel(1);
  const beforeCh = seq.getPattern().notes.length;
  send([0x91, 65, 100]); // note on, ch 2 -> filtered out
  await sleep(60);
  send([0x81, 65, 0]);
  await sleep(60);
  const afterWrongCh = seq.getPattern().notes.length;
  // A note on the right channel still records.
  send([0x90, 67, 100]); // note on, ch 1
  await sleep(250);
  send([0x80, 67, 0]);
  await sleep(60);
  const afterRightCh = seq.getPattern().notes.length;

  e.midiInput.setRecording(false);
  e.stop();
  await sleep(120);

  return {
    enabled: e.midiInput.enabled,
    inputCount: e.midiInput.inputs.length,
    auditionPeak,
    recordedAdded: afterRecord - before,
    wrongChannelAdded: afterWrongCh - beforeCh,
    rightChannelAdded: afterRightCh - afterWrongCh,
  };
});
console.log('[itest] midi:', JSON.stringify(midi));

// ---------------------------------------------------------------------------
// 5. Scheduling stress: rapid clip launches + mode switches while running must
//    not throw a Tone "time must be >= last scheduled" / stack overflow.
// ---------------------------------------------------------------------------
const errorsBeforeStress = pageErrors.length;
await win.evaluate(async () => {
  const w = window;
  const e = w.__engine;
  const sleep = w.__sleep;
  const seq0 = w.__seqOf(0);
  const seq1 = w.__seqOf(1);
  e.start();
  for (let i = 0; i < 20; i++) {
    // Relaunch the running patterns (the original "launch while playing" crash).
    seq0.getPattern().start();
    seq1.getPattern().start();
    // Toggle the roll pattern's mode (re-arms scheduler from a stopped/running
    // mix — the "silent / re-schedule behind last tick" path).
    const p1 = seq1.getPattern();
    p1.set({ mode: i % 2 === 0 ? 'steps' : 'pianoroll' });
    // Change the step pattern's subdivision (rebuilds the Tone.Sequence live).
    seq0.getPattern().set({ subdivision: i % 2 === 0 ? 8 : 16 });
    await sleep(30);
  }
  // Restore roll mode.
  seq1.getPattern().set({ mode: 'pianoroll' });
  e.stop();
  await sleep(150);
});
// Let any async renderer errors flush through to the Node listener.
await new Promise((r) => setTimeout(r, 400));
const stressErrors = pageErrors.slice(errorsBeforeStress);
const schedulingErrors = stressErrors.filter((m) =>
  /greater than or equal|last scheduled|call stack|Maximum call/i.test(m),
);
console.log(
  '[itest] scheduling:',
  JSON.stringify({ newErrors: stressErrors.length, schedulingErrors }),
);

// Slice audition: clicking the in-chain waveform calls slice.play() directly
// (no transport). Verify that audition path produces audio on the master bus.
const sliceAudition = await win.evaluate(async () => {
  const w = window;
  const e = w.__engine;
  w.__solo(1);
  e.stop();
  await w.__sleep(150);
  const slice = e.tracks[1].chain.devices.find((d) => d.name === 'Slice');
  if (slice) slice.play();
  const peak = await w.__measureIdlePeak(600);
  return { hasSlice: !!slice, peak };
});
console.log('[itest] sliceAudition:', JSON.stringify(sliceAudition));

// Sampler ids must be globally unique so a freshly added sample never collides
// with one restored from a saved project — a collision made findSampler resolve
// to the wrong device (wrong sound / "edit" opening the wrong sampler). A new
// slice must bind to its own sampler. Use a distinguishable buffer length.
const sampleIds = await win.evaluate(async () => {
  const w = window;
  const e = w.__engine;
  const ctx = e.gain.context.rawContext;
  const sr = ctx.sampleRate;
  const a = e.createSample({ title: 'A', url: 'a' });
  const b = e.createSample({ title: 'B', url: 'b' });
  const ab = ctx.createBuffer(1, Math.floor(sr * 1), sr); // 1s, vs s0's 2s
  b.buffer.set(ab);
  b._hasLoaded = true;
  await e.hasLoaded();
  e.createSliceTrack({ name: 'Slice', samplerId: b.id });
  const newTrack = e.tracks[e.tracks.length - 1];
  const slice = newTrack.chain.devices.find((d) => d.name === 'Slice');
  await w.__sleep(120);
  if (slice?.hasLoaded) await slice.hasLoaded();
  const result = {
    idA: a.id,
    idB: b.id,
    distinct: a.id !== b.id,
    notCounter: !/^cl-\d+$/.test(a.id) && !/^cl-\d+$/.test(b.id),
    boundIsB: slice?.sampler === b,
    bufferDuration: slice?.player?.buffer?.duration,
    bDur: b.buffer.duration,
  };
  e.stop();
  e.removeTrack(newTrack);
  e.removeSample(a);
  e.removeSample(b);
  return result;
});
console.log('[itest] sampleIds:', JSON.stringify(sampleIds));

// Arm bug: a sequencer track added while the transport is already playing must
// arm its pattern so it actually starts — previously start() scheduled at a
// now-past time, threw, and the sequence stayed 'stopped' (silent). The fix
// launches the new pattern at the next launch-grid boundary (launchTime()).
const armWhilePlaying = await win.evaluate(async () => {
  const w = window;
  const e = w.__engine;
  const s = e.createSample({ title: 'Arm', url: 'arm' });
  const ctx = e.gain.context.rawContext;
  const ab = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 1), ctx.sampleRate);
  s.buffer.set(ab);
  s._hasLoaded = true;
  await e.hasLoaded();
  // A 1/16 launch grid so the scheduled boundary arrives within a few hundred
  // ms — sequence.state is evaluated at the current transport time, so it only
  // flips to 'started' once the boundary actually passes.
  const prevQuant = e.launchQuantization;
  e.setLaunchQuantization('16n');
  e.start(); // transport already running before the track is added
  await w.__sleep(200);
  e.createSliceTrack({ name: 'Slice', samplerId: s.id });
  const newTrack = e.tracks[e.tracks.length - 1];
  const seq = newTrack.chain.devices.find((d) => d.name === 'Sequencer');
  // The real signal that a sequencer is running: its step callback fires. Count
  // sequenceEvent emissions over ~600ms — a 16-step pattern on a 1/16 grid fires
  // several times per beat. Zero firings == the arm bug (silent, never started).
  let eventCount = 0;
  const onSeq = () => {
    eventCount += 1;
  };
  seq?.on('sequenceEvent', onSeq);
  const launchAt = e.launchTime();
  await w.__sleep(600); // cross the launch boundary and run a few steps
  seq?.off('sequenceEvent', onSeq);
  const armState = seq?.getPattern()?.sequence?.state;
  e.stop();
  e.removeTrack(newTrack);
  e.removeSample(s);
  e.setLaunchQuantization(prevQuant);
  return {
    armState,
    eventCount,
    launchAt,
    transportWasStarted: true,
  };
});
console.log('[itest] armWhilePlaying:', JSON.stringify(armWhilePlaying));

// Master FX: a highpass on the master bus (cutoff well above the 440 Hz sine)
// attenuates the mix — proving master effects sit in the signal path. Clearing
// them restores the level.
const masterFx = await win.evaluate(async () => {
  const w = window;
  const e = w.__engine;
  w.__solo(1); // roll track plays the injected 440 Hz sine
  const basePeak = await w.__measureTransportPeak(1400);
  e.set({ master: { devices: [{ name: 'Filter', type: 'highpass' }] } });
  const masterDeviceCount = e.masterChain.devices.length;
  const filteredPeak = await w.__measureTransportPeak(1400);
  e.set({ master: { devices: [] } }); // clear master FX
  const restoredPeak = await w.__measureTransportPeak(1400);
  return { basePeak, filteredPeak, restoredPeak, masterDeviceCount };
});
console.log('[itest] masterFx:', JSON.stringify(masterFx));

// ---------------------------------------------------------------------------
// 6. Track reorder: moveTrack() reorders the track list. Done before the
//    metronome section clears the tracks.
// ---------------------------------------------------------------------------
const reorder = await win.evaluate(async () => {
  const w = window;
  const e = w.__engine;
  const before = e.tracks.map((t) => t.name);
  e.moveTrack(0, 1);
  const afterMove = e.tracks.map((t) => t.name);
  e.moveTrack(1, 0); // restore the original order for the sections below
  const restored = e.tracks.map((t) => t.name);
  return { before, afterMove, restored };
});
console.log('[itest] reorder:', JSON.stringify(reorder));

// Device-chain reorder: moving a device onto an occupied slot must keep every
// device (regression for addDevice dropping the device already at that index).
const deviceReorder = await win.evaluate(async () => {
  const w = window;
  const e = w.__engine;
  const chain = e.tracks[0].chain;
  const before = chain.devices.map((d) => d.name);
  const last = chain.devices[chain.devices.length - 1];
  chain.moveDevice(last, 0); // insert at an occupied slot (index 0)
  const after = chain.devices.map((d) => d.name);
  chain.moveDevice(chain.devices[0], chain.devices.length - 1); // restore
  return { before, after };
});
console.log('[itest] deviceReorder:', JSON.stringify(deviceReorder));

// ---------------------------------------------------------------------------
// 7. Metronome: with all tracks cleared, enabling the click track produces audio
//    on the master bus; without it the bus is silent. (The click routes into the
//    master gain, so the meter — tapped off the limiter — sees it.)
// ---------------------------------------------------------------------------
const metronome = await win.evaluate(async () => {
  const w = window;
  const e = w.__engine;
  const sleep = w.__sleep;

  // Remove every track (keeping the master bus + metronome) so the ONLY thing
  // that can reach the master bus is the click — no track voices to isolate.
  // The app closes right after this section, so tearing the tracks down is fine.
  e.clear();
  await sleep(300); // let any prior signal settle out of the smoothed meter

  // Baseline FIRST, while the metronome has never been enabled: transport
  // running, no tracks -> the master bus is silent.
  const enabledAfterOff = e.metronome.enabled; // expected false
  const silentPeak = await w.__measureTransportPeak(1200);

  // Now enable the click -> the master bus carries the metronome and nothing
  // else.
  e.setMetronome(true);
  const enabledAfterOn = e.metronome.enabled; // expected true
  const clickPeak = await w.__measureTransportPeak(1600);

  e.setMetronome(false);
  return { clickPeak, silentPeak, enabledAfterOn, enabledAfterOff };
});
console.log('[itest] metronome:', JSON.stringify(metronome));

// ---------------------------------------------------------------------------
// 8. Count-in: with a 1-bar count-in, pressing play sounds lead-in clicks while
//    the transport stays stopped (the lead-in is scheduled on the audio clock,
//    and the transport only starts on the downbeat after it).
// ---------------------------------------------------------------------------
const countIn = await win.evaluate(async () => {
  const w = window;
  const e = w.__engine;
  const sleep = w.__sleep;

  e.clear(); // master bus + metronome only — no track voices
  e.transport.bpm.value = 120; // 1 bar of 4/4 = 2s
  e.metronome.setCountInBars(1);
  e.setMetronome(false); // the lead-in clicks regardless of the ongoing toggle
  await sleep(200);

  e.start();
  await sleep(60);
  // The transport hasn't started yet — the count-in is sounding.
  const stateDuringCountIn = e.transport.state;

  // Over a window shorter than the 2s lead-in, the click is audible but the
  // transport never transitions to started.
  let peak = 0;
  let startedDuringLeadIn = false;
  const t0 = Date.now();
  while (Date.now() - t0 < 1200) {
    const v = e.meter.getValue();
    const lv = Array.isArray(v) ? Math.max(...v) : v;
    if (Number.isFinite(lv) && lv > peak) peak = lv;
    if (e.transport.state === 'started') startedDuringLeadIn = true;
    await sleep(30);
  }

  e.stop();
  e.metronome.setCountInBars(0);
  await sleep(150);

  return { stateDuringCountIn, countInPeak: peak, startedDuringLeadIn };
});
console.log('[itest] countIn:', JSON.stringify(countIn));

await app.close();

// ---------------------------------------------------------------------------
// Assertions
// ---------------------------------------------------------------------------
const results = [];
const check = (name, pass, detail) => {
  results.push({ name, pass, detail });
};

check(
  'engine exposed + sample injected',
  !!setup &&
    setup.samplerCount > 0 &&
    setup.trackCount > 1 &&
    setup.sampleDuration > 1.5,
  `samplers=${setup?.samplerCount} tracks=${setup?.trackCount} dur=${setup?.sampleDuration?.toFixed?.(
    2,
  )}`,
);
check('analyser tapped onto master bus', !!setup && setup.analyserConnected, '');
check(
  'buffer share: voices on the same region share one sliced buffer',
  bufferShare.hasBoth && bufferShare.shared,
  `hasBoth=${bufferShare.hasBoth} shared=${bufferShare.shared}`,
);
check(
  'sound: step grid produces audio',
  sound.stepPeak > 1e-3,
  `peak=${sound.stepPeak?.toExponential?.(2)}`,
);
check(
  'sound: piano roll produces audio',
  sound.rollPeak > 1e-3,
  `peak=${sound.rollPeak?.toExponential?.(2)}`,
);
check(
  'pitch: root note plays at ~440 Hz',
  pitch.freq60 > 0 && Math.abs(pitch.freq60 - 440) / 440 < 0.1,
  `freq=${pitch.freq60?.toFixed?.(1)}Hz`,
);
check(
  'pitch: +1 octave plays at ~880 Hz',
  pitch.freq72 > 0 && Math.abs(pitch.freq72 - 880) / 880 < 0.1,
  `freq=${pitch.freq72?.toFixed?.(1)}Hz`,
);
check(
  'pitch: octave ratio ~2x',
  pitch.freq60 > 0 &&
    pitch.freq72 > 0 &&
    Math.abs(pitch.freq72 / pitch.freq60 - 2) < 0.2,
  `ratio=${(pitch.freq72 / pitch.freq60)?.toFixed?.(3)}`,
);
check(
  'automation: volume 0.25 curve scales peak to ~1/4',
  automation.ratio > 0.12 && automation.ratio < 0.45,
  `ratio=${automation.ratio?.toFixed?.(3)} (base=${automation.basePeak?.toFixed?.(
    3,
  )} auto=${automation.autoPeak?.toFixed?.(3)})`,
);
check(
  'midi: mock device bound',
  midi.enabled === true && midi.inputCount > 0,
  `enabled=${midi.enabled} inputs=${midi.inputCount}`,
);
check(
  'midi: note-on auditions (produces audio)',
  midi.auditionPeak > 1e-3,
  `peak=${midi.auditionPeak?.toExponential?.(2)}`,
);
check(
  'midi: armed record overdubs a note',
  midi.recordedAdded === 1,
  `added=${midi.recordedAdded}`,
);
check(
  'midi: wrong-channel note is filtered out',
  midi.wrongChannelAdded === 0,
  `added=${midi.wrongChannelAdded}`,
);
check(
  'midi: right-channel note still records',
  midi.rightChannelAdded === 1,
  `added=${midi.rightChannelAdded}`,
);
check(
  'scheduling: no Tone/stack errors under stress',
  schedulingErrors.length === 0,
  schedulingErrors.join(' | ') || 'clean',
);
check(
  'slice audition: play() produces audio on the master bus',
  sliceAudition.hasSlice && sliceAudition.peak > 1e-3,
  `peak=${sliceAudition.peak?.toExponential?.(2)} hasSlice=${sliceAudition.hasSlice}`,
);
check(
  'sampler ids are globally unique (uuid, not the session counter)',
  sampleIds.distinct && sampleIds.notCounter,
  `a=${sampleIds.idA} b=${sampleIds.idB}`,
);
check(
  'new slice binds to its own sampler (not a colliding one)',
  sampleIds.boundIsB && sampleIds.bufferDuration === sampleIds.bDur,
  `boundIsB=${sampleIds.boundIsB} dur=${sampleIds.bufferDuration}/${sampleIds.bDur}`,
);
check(
  'arm: a sequencer added while playing arms its pattern (not silent)',
  armWhilePlaying.eventCount > 0,
  `events=${armWhilePlaying.eventCount} armState=${armWhilePlaying.armState} launchAt=${armWhilePlaying.launchAt}`,
);
check(
  'master FX: chain is in the signal path (highpass attenuates the sine)',
  masterFx.masterDeviceCount === 1 &&
    masterFx.filteredPeak < masterFx.basePeak * 0.5,
  `base=${masterFx.basePeak?.toExponential?.(2)} filtered=${masterFx.filteredPeak?.toExponential?.(2)} devices=${masterFx.masterDeviceCount}`,
);
check(
  'master FX: clearing restores the level',
  masterFx.restoredPeak > masterFx.filteredPeak * 1.5,
  `restored=${masterFx.restoredPeak?.toExponential?.(2)} filtered=${masterFx.filteredPeak?.toExponential?.(2)}`,
);
check(
  'reorder: moveTrack swaps track order and restores',
  reorder.before.length === 2 &&
    reorder.afterMove[0] === reorder.before[1] &&
    reorder.afterMove[1] === reorder.before[0] &&
    reorder.restored[0] === reorder.before[0] &&
    reorder.restored[1] === reorder.before[1],
  `before=${reorder.before} after=${reorder.afterMove} restored=${reorder.restored}`,
);
check(
  'device reorder: moving onto an occupied slot keeps all devices',
  deviceReorder.after.length === deviceReorder.before.length &&
    deviceReorder.before.length >= 2 &&
    deviceReorder.after[0] === deviceReorder.before[deviceReorder.before.length - 1],
  `before=${deviceReorder.before} after=${deviceReorder.after}`,
);
check(
  'metronome: click produces audio on master (no tracks)',
  metronome.clickPeak > 1e-2,
  `peak=${metronome.clickPeak?.toExponential?.(2)}`,
);
check(
  'metronome: master is silent without the click',
  metronome.silentPeak < 5e-2 && metronome.silentPeak < metronome.clickPeak * 0.5,
  `off=${metronome.silentPeak?.toExponential?.(2)} on=${metronome.clickPeak?.toExponential?.(2)}`,
);
check(
  'metronome: toggle updates enabled state',
  metronome.enabledAfterOn === true && metronome.enabledAfterOff === false,
  `on=${metronome.enabledAfterOn} off=${metronome.enabledAfterOff}`,
);
check(
  'count-in: lead-in clicks sound on the master bus',
  countIn.countInPeak > 1e-2,
  `peak=${countIn.countInPeak?.toExponential?.(2)}`,
);
check(
  'count-in: transport stays stopped through the lead-in',
  countIn.stateDuringCountIn !== 'started' && !countIn.startedDuringLeadIn,
  `state=${countIn.stateDuringCountIn} startedDuringLeadIn=${countIn.startedDuringLeadIn}`,
);

const failed = results.filter((r) => !r.pass);
console.log('\n[itest] ---- results ----');
for (const r of results) {
  console.log(
    `[itest] ${r.pass ? 'PASS' : 'FAIL'}  ${r.name}${r.detail ? `  (${r.detail})` : ''}`,
  );
}
console.log(
  `[itest] ${results.length - failed.length}/${results.length} checks passed`,
);

if (failed.length) {
  console.error(`[itest] FAIL: ${failed.length} check(s) failed`);
  process.exit(1);
}
console.log('[itest] PASS: full audio + MIDI + scheduling integration verified');
