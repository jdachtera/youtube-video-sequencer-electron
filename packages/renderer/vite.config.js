/* eslint-env node */

import { builtinModules } from 'module';
import { join } from 'path';
import solidPlugin from 'vite-plugin-solid';
import { chrome } from '../../.electron-vendors.cache.json';

const whitelistedBuiltinModules = ['events'];

const PACKAGE_ROOT = __dirname;

// The renderer is built twice from this config:
//  - For Electron, which runs inside the bundled Chromium (pinned via
//    .electron-vendors.cache.json), so it can target that exact version.
//  - For the GitHub Pages web preview, where the same bundle must run in
//    ordinary visitor browsers. The Pages workflow sets PAGES_BUILD=true so the
//    web build targets a broad evergreen baseline instead.
//
// Targeting the bleeding-edge Electron Chromium also makes esbuild emit syntax
// that Rollup's build-import-analysis parser can reject in CI ("Parse error"),
// so the broader web target keeps the Pages build green as well.
const buildTarget = process.env.PAGES_BUILD
  ? ['chrome111', 'edge111', 'firefox111', 'safari16']
  : `chrome${chrome}`;

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
    'process.versions.node': '"24.0.0"',
    // Follow the build mode. Production builds (the Pages deploy and `compile`,
    // which set MODE=production) ship the production paths of bundled libraries
    // — emotion, Apollo, etc. run far slower in their development builds, which
    // this app feels because it creates emotion styles all over the render tree.
    // Dev/watch keeps 'development' for better diagnostics.
    'process.env.NODE_ENV':
      process.env.MODE === 'production' ? '"production"' : '"development"',
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
    target: buildTarget,
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
    reportCompressedSize: false,
  },
  test: {
    environment: 'happy-dom',
  },
};

export default config;
