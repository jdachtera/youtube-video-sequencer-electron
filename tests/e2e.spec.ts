import type { ElectronApplication } from 'playwright-core';
import { _electron as electron } from 'playwright-core';
import { afterAll, beforeAll, expect, test } from 'vitest';
import '../packages/preload/contracts.d.ts';

let electronApp: ElectronApplication;

beforeAll(async () => {
  electronApp = await electron.launch({
    // `--no-sandbox` is required to run Electron as root (CI/containers).
    // `--ignore-certificate-errors` lets the renderer reach HTTPS hosts through
    // the sandbox's TLS-intercepting proxy (whose CA Chromium doesn't trust).
    args: [
      '.',
      '--no-sandbox',
      '--disable-gpu',
      '--disable-dev-shm-usage',
      '--ignore-certificate-errors',
    ],
  });
});

afterAll(async () => {
  await electronApp.close();
});

test('Main window state', async () => {
  const windowState: {
    isVisible: boolean;
    isDevToolsOpened: boolean;
    isCrashed: boolean;
  } = await electronApp.evaluate(({ BrowserWindow }) => {
    const mainWindow = BrowserWindow.getAllWindows()[0];

    const getState = () => ({
      isVisible: mainWindow.isVisible(),
      isDevToolsOpened: mainWindow.webContents.isDevToolsOpened(),
      isCrashed: mainWindow.webContents.isCrashed(),
    });

    return new Promise((resolve) => {
      if (mainWindow.isVisible()) {
        resolve(getState());
      } else
        mainWindow.once('ready-to-show', () =>
          setTimeout(() => resolve(getState()), 0),
        );
    });
  });

  expect(windowState.isCrashed, 'App was crashed').toBeFalsy();
  expect(windowState.isVisible, 'Main window was not visible').toBeTruthy();
  expect(windowState.isDevToolsOpened, 'DevTools was opened').toBeFalsy();
});

test('Main window web content', async () => {
  const page = await electronApp.firstWindow();
  const element = await page.$('#root', { strict: true });
  // eslint-disable-next-line quotes
  expect(element, "Can't find root element").toBeDefined();
  expect(
    (await element.innerHTML()).trim(),
    'Window content was empty',
  ).not.equal('');
});

test('Preload versions', async () => {
  const page = await electronApp.firstWindow();
  const exposedYt = await page.evaluate(() => globalThis.yt);

  expect(exposedYt).toBeDefined();
});

// A seeded project that exercises both editor views at once: a step-grid track
// and a piano-roll track (which renders solid-pianoroll + the expression and
// automation lanes), each bound to a sampler (which renders the solid-waveform
// view). Loading it through the real UI is the regression guard for the two
// renderer crashes we fixed — the Tone scheduling throw and the solid-waveform
// "Maximum call stack size exceeded" overflow — both of which surface as
// uncaught pageerrors during a seeded load/render.
test('Seeded project renders both grid + piano-roll without renderer errors', async () => {
  const page = await electronApp.firstWindow();

  const pageErrors: string[] = [];
  page.on('pageerror', (e) => pageErrors.push(e.message));

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
        name: 'StepTrack',
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
                    { play: false },
                    { play: true },
                    { play: false },
                  ],
                },
              ],
            },
            { name: 'Slice', samplerId: 's0' },
          ],
        },
      },
      {
        name: 'RollTrack',
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
                  // A volume automation curve so the automation lane renders too.
                  automation: {
                    volume: [
                      { ticks: 0, value: 1 },
                      { ticks: 768, value: 0.25 },
                    ],
                  },
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

  await page.evaluate((s) => localStorage.setItem('track', s), seed);
  await page.reload();
  await page.waitForLoadState('domcontentloaded').catch(() => undefined);

  // Both tracks render a name input — proving the step-grid track and the
  // piano-roll track both mounted (the grid and the roll views are shown side
  // by side, one per track).
  await page.waitForFunction(
    () => {
      const values = Array.from(document.querySelectorAll('input')).map(
        (input) => (input as HTMLInputElement).value,
      );
      return values.includes('StepTrack') && values.includes('RollTrack');
    },
    { timeout: 20000 },
  );

  // Give solid-pianoroll + solid-waveform a moment to finish rendering (the
  // overflow crash fired during the waveform's render pass).
  await page.waitForTimeout(1500);

  const trackNames = await page.$$eval('input', (inputs) =>
    inputs.map((input) => (input as HTMLInputElement).value),
  );
  expect(trackNames, 'Step-grid track did not render').toContain('StepTrack');
  expect(trackNames, 'Piano-roll track did not render').toContain('RollTrack');

  const fatal = pageErrors.filter((m) =>
    /call stack|Maximum call|greater than or equal|last scheduled|createCachedWaveform/i.test(
      m,
    ),
  );
  expect(
    fatal,
    `Renderer crashed on seeded load: ${fatal.join(' | ')}`,
  ).toEqual([]);
});
