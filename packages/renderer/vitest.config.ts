import solidPlugin from 'vite-plugin-solid';
import { defineConfig } from 'vitest/config';

/**
 * Test-only config for renderer unit tests.
 *
 * Kept separate from vite.config.js on purpose: the build config defines
 * browser-only globals (e.g. `process.nextTick` -> `requestAnimationFrame`)
 * that crash the Node/happy-dom test runtime. Here we only need the SolidJS
 * JSX transform and a DOM environment.
 */
export default defineConfig({
  plugins: [solidPlugin()],
  resolve: {
    conditions: ['development', 'browser'],
    alias: {
      stream: 'stream-browserify',
      vm: 'vm-browserify',
      dns: '@i2labs/dns',
      timers: 'timers-browserify',
    },
  },
  test: {
    environment: 'happy-dom',
    globals: true,
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
  },
});
