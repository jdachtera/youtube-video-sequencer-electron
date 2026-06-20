#!/usr/bin/env node
/**
 * Run a command, wrapping it in a virtual framebuffer (Xvfb) on headless Linux
 * so GUI apps (Electron, and Playwright driving it) have a display.
 *
 * On a normal desktop (macOS/Windows, or Linux with $DISPLAY) the command runs
 * as-is. Used by the e2e test script: `node scripts/with-display.mjs vitest run`.
 */
import { spawnSync } from 'node:child_process';

const [cmd, ...args] = process.argv.slice(2);
if (!cmd) {
  console.error('usage: with-display <command> [args...]');
  process.exit(2);
}

const has = (c) =>
  spawnSync('sh', ['-c', `command -v ${c}`], { stdio: 'ignore' }).status === 0;

const headlessLinux = process.platform === 'linux' && !process.env.DISPLAY;

let runCmd = cmd;
let runArgs = args;
if (headlessLinux) {
  if (!has('xvfb-run')) {
    console.error(
      '[with-display] Headless Linux but xvfb-run is missing. Install it ' +
        '(`apt-get install -y xvfb`) or set DISPLAY.',
    );
    process.exit(1);
  }
  runCmd = 'xvfb-run';
  runArgs = ['-a', '-s', '-screen 0 1400x900x24', cmd, ...args];
}

const r = spawnSync(runCmd, runArgs, { stdio: 'inherit' });
if (r.error) {
  console.error('[with-display]', r.error.message);
  process.exit(1);
}
process.exit(r.status ?? 1);
