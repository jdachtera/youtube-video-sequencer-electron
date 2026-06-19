#!/usr/bin/env node
/**
 * Launch the built Electron app and capture a screenshot of its first window.
 *
 * Works both on a normal desktop and in a headless Linux container: when there
 * is no DISPLAY it re-execs itself under Xvfb so Electron has a virtual screen.
 * Electron is driven with Playwright's `_electron` API.
 *
 * Usage:
 *   yarn screenshot                 # build, launch, write ./screenshot.png
 *   yarn screenshot out.png         # custom output path
 *   yarn screenshot --no-build      # skip the build step (use existing dist)
 *
 * Env:
 *   SCREENSHOT_DELAY_MS  ms to wait after load before capturing (default 5000)
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
const outArg = args.find((a) => !a.startsWith('--'));
const outPath = resolve(repo, outArg ?? 'screenshot.png');
const WIDTH = 1400;
const HEIGHT = 900;

const has = (cmd) =>
  spawnSync('sh', ['-c', `command -v ${cmd}`], { stdio: 'ignore' }).status === 0;

// Headless Linux: re-exec under a virtual framebuffer so Electron can open a window.
if (process.platform === 'linux' && !process.env.DISPLAY && !process.env.__SCREENSHOT_XVFB) {
  if (!has('xvfb-run')) {
    console.error(
      '[screenshot] No DISPLAY and xvfb-run is not installed.\n' +
        '             Install it (e.g. `apt-get install -y xvfb`) or run under a display.',
    );
    process.exit(1);
  }
  const r = spawnSync(
    'xvfb-run',
    ['-a', '-s', `-screen 0 ${WIDTH}x${HEIGHT}x24`, 'node', fileURLToPath(import.meta.url), ...args],
    { stdio: 'inherit', cwd: repo, env: { ...process.env, __SCREENSHOT_XVFB: '1' } },
  );
  process.exit(r.status ?? 1);
}

if (!noBuild) {
  console.log('[screenshot] Building app (use --no-build to skip)...');
  const b = spawnSync('yarn', ['build'], { stdio: 'inherit', cwd: repo });
  if (b.status !== 0) process.exit(b.status ?? 1);
}

const electronPath = require('electron');
const { _electron } = require('playwright-core');

const electronArgs = ['.'];
// Required to run Electron as root (CI/containers); harmless otherwise.
if (process.platform === 'linux') {
  electronArgs.push('--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage');
}

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

const delay = Number(process.env.SCREENSHOT_DELAY_MS ?? 5000);
await new Promise((r) => setTimeout(r, delay));

const title = await win.title().catch(() => '(no title)');
await win.screenshot({ path: outPath });
console.log(`[screenshot] window title=${JSON.stringify(title)} -> ${outPath}`);

await app.close();
