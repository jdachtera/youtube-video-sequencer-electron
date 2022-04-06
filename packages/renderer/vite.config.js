/* eslint-env node */

import { chrome } from '../../.electron-vendors.cache.json';
import { join } from 'path';
import { builtinModules } from 'module';

const whitelistedBuiltinModules = ['events'];

const PACKAGE_ROOT = __dirname;

import solidPlugin from 'vite-plugin-solid';

/**
 * @type {import('vite').UserConfig}
 * @see https://vitejs.dev/config/
 */
const config = {
  mode: process.env.MODE,
  root: PACKAGE_ROOT,
  resolve: {
    alias: {
      '/@/': join(PACKAGE_ROOT, 'src') + '/',
      stream: 'stream-browserify',
      vm: 'vm-browserify',
      dns: '@i2labs/dns',
      timers: 'timers-browserify',

      //http: 'http-browserify',
      // https: 'https-browserify',
      miniget: `${join(PACKAGE_ROOT, 'src')}/miniget.ts`,
    },
  },
  define: {
    'process.versions.node': '"16.0.0"',
    'process.env.NODE_ENV': '"development"',
    'process.nextTick': 'requestAnimationFrame',
  },
  plugins: [solidPlugin()],
  base: '',
  server: {
    fs: {
      strict: true,
    },
  },
  build: {
    sourcemap: true,
    target: `chrome${chrome}`,
    outDir: 'dist',
    assetsDir: '.',
    rollupOptions: {
      input: join(PACKAGE_ROOT, 'index.html'),
      external: [
        ...builtinModules
          .filter((p) => !whitelistedBuiltinModules.includes(p))
          .flatMap((p) => [p, `node:${p}`]),
      ],
    },
    emptyOutDir: true,
    brotliSize: false,
  },
  test: {
    environment: 'happy-dom',
  },
};

export default config;
