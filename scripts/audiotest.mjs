#!/usr/bin/env node
/**
 * Headless audio smoke test.
 *
 * Builds the app with the engine exposed (VITE_EXPOSE_ENGINE), launches it under
 * Xvfb, seeds a tiny project (a step sequencer and a piano-roll pattern, both
 * triggering a sample), injects a synthesized sine buffer straight into the
 * samplers (the real download path goes through a frozen contextBridge object
 * and can't be stubbed, and there's no headless file access), then starts live
 * playback and watches the master meter. A non-zero peak proves the sequencer +
 * piano-roll actually produce audio. Electron's mainWindow sets
 * autoplayPolicy: 'no-user-gesture-required', so the AudioContext runs without a
 * user gesture.
 *
 * Usage:
 *   node scripts/audiotest.mjs            # build (engine exposed), run
 *   node scripts/audiotest.mjs --no-build # reuse an existing exposed build
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

if (
  process.platform === 'linux' &&
  !process.env.DISPLAY &&
  !process.env.__AUDIOTEST_XVFB
) {
  if (!has('xvfb-run')) {
    console.error('[audiotest] No DISPLAY and xvfb-run is not installed.');
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
    { stdio: 'inherit', cwd: repo, env: { ...process.env, __AUDIOTEST_XVFB: '1' } },
  );
  process.exit(r.status ?? 1);
}

if (!noBuild) {
  console.log('[audiotest] Building app (engine exposed)...');
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

// A project exercising both playback paths: a step sequencer and a piano-roll
// pattern, each triggering the same sample.
const seed = JSON.stringify({
  samplers: [
    {
      name: 'Sampler',
      id: 's0',
      title: 'Test',
      url: 'https://www.youtube.com/watch?v=test',
      start: 0,
      end: 0.4,
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
                  { ticks: 0, durationTicks: 192, midi: 60, velocity: 1 },
                  { ticks: 384, durationTicks: 192, midi: 67, velocity: 1 },
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

const win = await app.firstWindow({ timeout: 30000 });
win.on('pageerror', (e) => console.log('[renderer:pageerror]', e.message));
await win.waitForLoadState('domcontentloaded').catch(() => {});

await win.evaluate((s) => localStorage.setItem('track', s), seed);
await win.reload();
await win.waitForLoadState('domcontentloaded').catch(() => {});

const result = await win.evaluate(async () => {
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

  // Synthesize a 0.5s 440Hz sine AudioBuffer and inject it into every sampler,
  // bypassing the (frozen, un-stubbable) download path entirely.
  const ctx = e.gain.context.rawContext;
  const sr = ctx.sampleRate;
  const ab = ctx.createBuffer(1, Math.floor(sr * 0.5), sr);
  const ch = ab.getChannelData(0);
  for (let i = 0; i < ch.length; i++) {
    ch[i] = Math.sin((2 * Math.PI * 440 * i) / sr) * 0.6;
  }
  for (const s of e.samplers) {
    s.buffer.set(ab);
    s._hasLoaded = true;
  }
  // Rebuild every voice's sliced buffer from the injected sample.
  await e.hasLoaded();
  await e.gain.context.resume().catch(() => {});

  // Measure the master peak over a short window of live playback.
  const measurePeak = async () => {
    e.start();
    let peak = 0;
    const t0 = Date.now();
    while (Date.now() - t0 < 1800) {
      const v = e.meter.getValue();
      const lv = Array.isArray(v) ? Math.max(...v) : v;
      if (Number.isFinite(lv) && lv > peak) peak = lv;
      await sleep(40);
    }
    e.stop();
    await sleep(120);
    return peak;
  };

  // Isolate each playback path by muting the other track, so a regression in
  // one mode (e.g. the piano-roll Part not firing) can't be masked by the
  // other's sound on the shared master meter. tracks[0]=steps, tracks[1]=roll.
  const [stepTrack, rollTrack] = e.tracks;
  rollTrack.set({ mute: true });
  stepTrack.set({ mute: false });
  const stepPeak = await measurePeak();

  stepTrack.set({ mute: true });
  rollTrack.set({ mute: false });
  const rollPeak = await measurePeak();

  return {
    samplerCount: e.samplers.length,
    sampleDuration: e.samplers[0].buffer.duration,
    contextState: ctx.state,
    stepPeak,
    rollPeak,
  };
});

console.log('[audiotest] result:', JSON.stringify(result));
await app.close();

const ok = result && result.stepPeak > 1e-3 && result.rollPeak > 1e-3;
if (!ok) {
  console.error(
    `[audiotest] FAIL: step=${result?.stepPeak ?? 'n/a'} roll=${
      result?.rollPeak ?? 'n/a'
    } — a sequencer mode produced no audio`,
  );
  process.exit(1);
}
console.log('[audiotest] PASS: step sequencer AND piano-roll both produce audio');
