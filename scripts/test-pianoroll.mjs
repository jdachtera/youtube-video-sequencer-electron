#!/usr/bin/env node
/**
 * Automated smoke test for the piano roll (solid-pianoroll, now locally linked).
 *
 * Boots the built Electron app, seeds a project whose selected pattern is in
 * "pianoroll" mode, then:
 *   - captures every console message + page error,
 *   - confirms the PianoRoll DOM rendered,
 *   - screenshots the rendered roll,
 *   - dispatches a wheel-zoom over the roll and screenshots again,
 *   - reports a pass/fail summary (non-zero exit on render failure or page error).
 *
 * Usage: node scripts/test-pianoroll.mjs   (run `pnpm build` first, or use the
 * sibling screenshot.mjs which builds for you). Assumes a display (macOS GUI).
 */
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const require = createRequire(import.meta.url);
const __dirname = dirname(fileURLToPath(import.meta.url));
const repo = resolve(__dirname, '..');

// Headless Linux (CI / containers): re-exec under a virtual framebuffer so
// Electron has a screen, mirroring screenshot.mjs / audiotest.mjs.
const has = (cmd) =>
  spawnSync('sh', ['-c', `command -v ${cmd}`], { stdio: 'ignore' }).status ===
  0;
if (
  process.platform === 'linux' &&
  !process.env.DISPLAY &&
  !process.env.__PIANOROLL_XVFB
) {
  if (!has('xvfb-run')) {
    console.error('[test-pianoroll] No DISPLAY and xvfb-run is not installed.');
    process.exit(1);
  }
  const r = spawnSync(
    'xvfb-run',
    [
      '-a',
      '-s',
      '-screen 0 1400x900x24',
      'node',
      fileURLToPath(import.meta.url),
      ...process.argv.slice(2),
    ],
    {
      stdio: 'inherit',
      cwd: repo,
      env: { ...process.env, __PIANOROLL_XVFB: '1' },
    },
  );
  process.exit(r.status ?? 1);
}

const electronPath = require('electron');
const { _electron } = require('playwright-core');

// Under a root container Electron needs --no-sandbox (and is happier without
// the GPU / shared-memory paths); harmless on a normal desktop.
const electronArgs = ['.'];
if (process.platform === 'linux') {
  electronArgs.push('--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage');
}

// Minimal project: one track -> Sequencer device -> one pianoroll pattern with
// a C-major arpeggio. Relies on Engine.normalizeData to fill the rest.
const project = {
  tracks: [
    {
      name: 'PianoRoll Test',
      collapsed: false,
      chain: {
        devices: [
          {
            name: 'Sequencer',
            collapsed: false,
            selectedPatternIndex: 0,
            autoSelectPattern: false,
            patterns: [
              {
                name: 'Arp',
                mode: 'pianoroll',
                ppq: 96,
                duration: 1536,
                // Sequencer.normalizeData drops a pattern whose steps[].length
                // is 0 (replaces it with a default steps-mode pattern), so a
                // pianoroll pattern still needs a non-empty steps array to
                // survive load. Steps are unused in pianoroll mode.
                steps: Array.from({ length: 16 }, () => ({
                  play: false,
                  volume: 1,
                  playbackRate: 1,
                  pitch: 1,
                  reverse: false,
                })),
                // A handful of well-separated notes (6 semitones apart) in the
                // visible band. The wide vertical spacing lets the offset
                // regression check below detect a stray vertical shift on drag
                // (the hit-testing-origin bug pushed a dragged note a few
                // semitones down) without notes landing on each other's rows.
                notes: [56, 62, 68, 74, 80].map((midi, i) => ({
                  ticks: i * 192,
                  durationTicks: 96,
                  midi,
                  velocity: 100,
                })),
              },
            ],
          },
        ],
      },
    },
  ],
  samplers: [],
};

const consoleMsgs = [];
const pageErrors = [];

// Strip ELECTRON_RUN_AS_NODE: when set (common in IDE-integrated terminals) it
// makes the electron binary boot as plain Node, so require('electron').app is
// undefined and the main process crashes on launch.
const launchEnv = { ...process.env, MODE: 'production' };
delete launchEnv.ELECTRON_RUN_AS_NODE;

const app = await _electron.launch({
  executablePath: electronPath,
  cwd: repo,
  args: electronArgs,
  env: launchEnv,
  timeout: 60000,
});

const win = await app.firstWindow({ timeout: 30000 });
win.on('console', (msg) =>
  consoleMsgs.push({ type: msg.type(), text: msg.text() }),
);
win.on('pageerror', (e) => pageErrors.push(e.message));
await win.waitForLoadState('domcontentloaded').catch(() => {});

// Seed the project and reload so the engine loads it on boot.
await win.evaluate(
  (seed) => localStorage.setItem('track', seed),
  JSON.stringify(project),
);
await win.reload();
await win.waitForLoadState('domcontentloaded').catch(() => {});

// Give the engine + solid-pianoroll time to mount and paint.
await win.waitForTimeout(4000);

// solid-pianoroll renders its root with a hashed CSS-module class _PianoRoll_*.
const rollHandle = await win.$('[class*="PianoRoll"]');
const rendered = !!rollHandle;

let box = null;
if (rollHandle) box = await rollHandle.boundingBox();

await win.screenshot({ path: resolve(repo, 'pianoroll-window.png') });
if (rollHandle)
  await rollHandle.screenshot({ path: resolve(repo, 'pianoroll-render.png') });

// Offset regression: dragging a note horizontally must not shift ANY note
// vertically. The hit-testing origin once started at the notes-scroller top
// (above the ruler), so the first drag move recomputed MIDI from the cursor
// against the wrong origin and snapped the note a few semitones down. We assert
// the sorted set of note tops is unchanged after a small horizontal drag.
const noteTops = () =>
  win.evaluate(() =>
    [...document.querySelectorAll('[class*="Note"]')]
      .filter((el) => !/PianoRollNotes/.test(el.className))
      .map((el) => Math.round(el.getBoundingClientRect().top))
      .sort((a, b) => a - b),
  );
let offsetDrift = null;
try {
  const leftmost = await win.evaluate(() => {
    const el = [...document.querySelectorAll('[class*="Note"]')]
      .filter((e) => !/PianoRollNotes/.test(e.className))
      .sort(
        (a, b) =>
          a.getBoundingClientRect().left - b.getBoundingClientRect().left,
      )[0];
    if (!el) return null;
    const b = el.getBoundingClientRect();
    return { cx: b.left + b.width / 2, cy: b.top + b.height / 2 };
  });
  const before = await noteTops();
  if (leftmost) {
    await win.mouse.move(leftmost.cx, leftmost.cy);
    await win.mouse.down();
    await win.mouse.move(leftmost.cx + 6, leftmost.cy, { steps: 3 });
    await win.mouse.up();
    await win.waitForTimeout(150);
  }
  const after = await noteTops();
  offsetDrift =
    before.length && before.length === after.length
      ? Math.max(...before.map((top, i) => Math.abs(top - after[i])))
      : 999;
} catch (e) {
  offsetDrift = -1;
}

// Drive a zoom: solid-pianoroll's ScrollZoomContainer zooms on ALT + wheel
// (alt + horizontal-dominant delta => horizontal zoom about the pointer).
// Capture the roll element itself so the note grid + zoom delta are visible.
let zoomError = null;
let zoomBefore = null;
let zoomAfter = null;
if (box && rollHandle) {
  try {
    const cx = box.x + box.width / 2;
    const cy = box.y + box.height / 2;
    // solid-pianoroll zooms on ALT + horizontal-wheel. Playwright's mouse.wheel
    // does not attach the Alt modifier to the wheel event, so dispatch a real
    // WheelEvent with altKey:true on the element under the pointer (it bubbles
    // to the ScrollZoomContainer's onWheel). deltaX kept small so the divisor
    // (1 + deltaX/pixelSize) stays ~0.85 => a clean ~1.18x zoom per step.
    // Dispatch directly on the largest ScrollZoomContainer (the notes area)
    // which owns the alt+wheel zoom handler; elementFromPoint can land on a
    // sibling overlay outside that handler's subtree.
    const wheelZoom = (clientX, clientY, deltaX, steps) =>
      win.evaluate(
        ({ clientX, clientY, deltaX, steps }) => {
          const containers = [
            ...document.querySelectorAll('[class*="ScrollZoomContainer"]'),
          ];
          if (!containers.length) return 0;
          const el = containers.sort(
            (a, b) =>
              b.getBoundingClientRect().width *
                b.getBoundingClientRect().height -
              a.getBoundingClientRect().width *
                a.getBoundingClientRect().height,
          )[0];
          for (let i = 0; i < steps; i++) {
            el.dispatchEvent(
              new WheelEvent('wheel', {
                deltaX,
                deltaY: 0,
                altKey: true,
                bubbles: true,
                cancelable: true,
                clientX,
                clientY,
              }),
            );
          }
          return containers.length;
        },
        { clientX, clientY, deltaX, steps },
      );

    // Definitive zoom check: measure the widest rendered note before/after.
    const noteWidth = () =>
      win.evaluate(() => {
        // Individual notes are class _Note_*; exclude the _PianoRollNotes_
        // full-width container.
        const els = [...document.querySelectorAll('[class*="Note"]')].filter(
          (el) => !/PianoRollNotes/.test(el.className),
        );
        return els.length
          ? Math.max(...els.map((el) => el.getBoundingClientRect().width))
          : 0;
      });

    zoomBefore = await noteWidth();
    await wheelZoom(cx, cy, -100, 6); // zoom in
    await win.waitForTimeout(600);
    zoomAfter = await noteWidth();
    await rollHandle.screenshot({
      path: resolve(repo, 'pianoroll-zoom-in.png'),
    });
    await wheelZoom(cx, cy, 140, 10); // zoom back out past the start
    await win.waitForTimeout(600);
    await rollHandle.screenshot({
      path: resolve(repo, 'pianoroll-zoom-out.png'),
    });
  } catch (e) {
    zoomError = e.message;
    await win.keyboard.up('Alt').catch(() => {});
  }
}

// Count canvases / note elements as a coarse "did it draw something" signal.
const noteCount = await win
  .evaluate(
    () => document.querySelectorAll('[class*="Note"], [class*="note"]').length,
  )
  .catch(() => -1);

const title = await win.title().catch(() => '(no title)');
await app.close();

// ---- report ----
const errors = consoleMsgs.filter((m) => m.type === 'error');
const warnings = consoleMsgs.filter((m) => m.type === 'warning');
const toneMsgs = consoleMsgs.filter((m) =>
  /tone|audio|buffer|player/i.test(m.text),
);

console.log('\n================ PIANO ROLL SMOKE TEST ================');
console.log('window title      :', JSON.stringify(title));
console.log(
  'PianoRoll rendered:',
  rendered,
  box ? `(box ${Math.round(box.width)}x${Math.round(box.height)})` : '(no box)',
);
console.log('note-ish elements :', noteCount);
console.log(
  'zoom interaction  :',
  box
    ? zoomError
      ? 'ERROR ' + zoomError
      : 'ok (3 screenshots)'
    : 'skipped (no roll box)',
);
console.log(
  'note width px     :',
  `before=${zoomBefore?.toFixed?.(1)} after-zoom-in=${zoomAfter?.toFixed?.(1)}`,
  zoomBefore && zoomAfter ? `(x${(zoomAfter / zoomBefore).toFixed(2)})` : '',
);
console.log('console errors    :', errors.length);
errors.slice(0, 20).forEach((e) => console.log('   [error]', e.text));
console.log('console warnings  :', warnings.length);
warnings.slice(0, 10).forEach((w) => console.log('   [warn]', w.text));
console.log('page errors       :', pageErrors.length);
pageErrors.slice(0, 20).forEach((e) => console.log('   [pageerror]', e));
console.log('tone/audio logs   :', toneMsgs.length);
toneMsgs.slice(0, 10).forEach((m) => console.log(`   [${m.type}]`, m.text));
console.log(
  'note drag offset  :',
  offsetDrift === null
    ? 'skipped'
    : `${offsetDrift}px vertical drift ${
        offsetDrift >= 0 && offsetDrift < 4 ? '(ok)' : '(FAIL)'
      }`,
);
console.log(
  'screenshots       : pianoroll-render.png, pianoroll-zoom-in.png, pianoroll-zoom-out.png',
);
console.log('=======================================================\n');

// A note must not drift vertically on a horizontal drag (< half a semitone).
const offsetOk = offsetDrift !== null && offsetDrift >= 0 && offsetDrift < 4;
const pass =
  rendered && pageErrors.length === 0 && errors.length === 0 && offsetOk;
console.log(pass ? 'RESULT: PASS' : 'RESULT: FAIL');
process.exit(pass ? 0 : 1);
