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
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const require = createRequire(import.meta.url);
const __dirname = dirname(fileURLToPath(import.meta.url));
const repo = resolve(__dirname, '..');

const electronPath = require('electron');
const { _electron } = require('playwright-core');

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
                // Notes are culled from the DOM when outside the viewport
                // (PianoRollNotes wraps each in <Show isVisible>). Vertical
                // maps as 127-midi with default verticalPosition 44, so the
                // visible band is high MIDI. Spray a chromatic spread at low
                // ticks so a clear block of notes lands in the initial view.
                notes: Array.from({ length: 61 }, (_, i) => ({
                  ticks: (i % 8) * 48,
                  durationTicks: 44,
                  midi: 36 + i,
                  velocity: 1,
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
  args: ['.'],
  env: launchEnv,
  timeout: 60000,
});

const win = await app.firstWindow({ timeout: 30000 });
win.on('console', (msg) => consoleMsgs.push({ type: msg.type(), text: msg.text() }));
win.on('pageerror', (e) => pageErrors.push(e.message));
await win.waitForLoadState('domcontentloaded').catch(() => {});

// Seed the project and reload so the engine loads it on boot.
await win.evaluate((seed) => localStorage.setItem('track', seed), JSON.stringify(project));
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
if (rollHandle) await rollHandle.screenshot({ path: resolve(repo, 'pianoroll-render.png') });

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
          const containers = [...document.querySelectorAll('[class*="ScrollZoomContainer"]')];
          if (!containers.length) return 0;
          const el = containers.sort(
            (a, b) =>
              b.getBoundingClientRect().width * b.getBoundingClientRect().height -
              a.getBoundingClientRect().width * a.getBoundingClientRect().height,
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
    await rollHandle.screenshot({ path: resolve(repo, 'pianoroll-zoom-in.png') });
    await wheelZoom(cx, cy, 140, 10); // zoom back out past the start
    await win.waitForTimeout(600);
    await rollHandle.screenshot({ path: resolve(repo, 'pianoroll-zoom-out.png') });
  } catch (e) {
    zoomError = e.message;
    await win.keyboard.up('Alt').catch(() => {});
  }
}

// Count canvases / note elements as a coarse "did it draw something" signal.
const noteCount = await win
  .evaluate(() => document.querySelectorAll('[class*="Note"], [class*="note"]').length)
  .catch(() => -1);

const title = await win.title().catch(() => '(no title)');
await app.close();

// ---- report ----
const errors = consoleMsgs.filter((m) => m.type === 'error');
const warnings = consoleMsgs.filter((m) => m.type === 'warning');
const toneMsgs = consoleMsgs.filter((m) => /tone|audio|buffer|player/i.test(m.text));

console.log('\n================ PIANO ROLL SMOKE TEST ================');
console.log('window title      :', JSON.stringify(title));
console.log('PianoRoll rendered:', rendered, box ? `(box ${Math.round(box.width)}x${Math.round(box.height)})` : '(no box)');
console.log('note-ish elements :', noteCount);
console.log('zoom interaction  :', box ? (zoomError ? 'ERROR ' + zoomError : 'ok (3 screenshots)') : 'skipped (no roll box)');
console.log('note width px     :', `before=${zoomBefore?.toFixed?.(1)} after-zoom-in=${zoomAfter?.toFixed?.(1)}`, zoomBefore && zoomAfter ? `(x${(zoomAfter / zoomBefore).toFixed(2)})` : '');
console.log('console errors    :', errors.length);
errors.slice(0, 20).forEach((e) => console.log('   [error]', e.text));
console.log('console warnings  :', warnings.length);
warnings.slice(0, 10).forEach((w) => console.log('   [warn]', w.text));
console.log('page errors       :', pageErrors.length);
pageErrors.slice(0, 20).forEach((e) => console.log('   [pageerror]', e));
console.log('tone/audio logs   :', toneMsgs.length);
toneMsgs.slice(0, 10).forEach((m) => console.log(`   [${m.type}]`, m.text));
console.log('screenshots       : pianoroll-render.png, pianoroll-zoom-in.png, pianoroll-zoom-out.png');
console.log('=======================================================\n');

const pass = rendered && pageErrors.length === 0 && errors.length === 0;
console.log(pass ? 'RESULT: PASS' : 'RESULT: FAIL');
process.exit(pass ? 0 : 1);
