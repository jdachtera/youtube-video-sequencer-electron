/* eslint-env node */

import { execSync } from 'child_process';
import { builtinModules } from 'module';
import { join } from 'path';
import solidPlugin from 'vite-plugin-solid';

const whitelistedBuiltinModules = ['events'];

const PACKAGE_ROOT = __dirname;

// Short commit the renderer was built from, surfaced in the UI so we can tell
// which version is running (the shipped app loads the renderer from GitHub
// Pages, which can update independently of the Electron shell). Prefer git;
// fall back to CI's GITHUB_SHA, then 'dev' for local-without-git.
const BUILD_COMMIT = (() => {
  try {
    return execSync('git rev-parse --short HEAD', {
      cwd: PACKAGE_ROOT,
      stdio: ['ignore', 'pipe', 'ignore'],
    })
      .toString()
      .trim();
  } catch {
    return (process.env.GITHUB_SHA || '').slice(0, 7) || 'dev';
  }
})();

// Target a broad evergreen baseline for ALL builds (Electron + Pages). Electron
// 148 runs this fine, while targeting the exact bleeding-edge Chromium made
// esbuild emit syntax that Rollup's build-import-analysis parser rejects
// ("Parse error @ index-*.js") — which broke the Pages deploy *and* local
// production builds (screenshot / compile / audiotest). The browserslist /
// Solid babel transform still keys off .electron-vendors.cache.json separately.
const buildTarget = ['chrome111', 'edge111', 'firefox111', 'safari16'];

/**
 * @type {import('vite').UserConfig}
 * @see https://vitejs.dev/config/
 */
const config = {
  mode: process.env.MODE,
  root: PACKAGE_ROOT,
  resolve: {
    // Linked workspace deps (e.g. solid-pianoroll via `link:`) ship their own
    // nested solid-js; force a single Solid instance so context/reactivity work
    // across the app and the linked library.
    dedupe: ['solid-js', 'solid-js/web', 'solid-js/store'],
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
    // Build-time flag: when true the app exposes window.__engine for the
    // headless audio test harness (scripts/audiotest.mjs). False in shipped
    // builds, so the dead branch is stripped.
    __EXPOSE_ENGINE__: JSON.stringify(
      process.env.VITE_EXPOSE_ENGINE === 'true',
    ),
    __BUILD_COMMIT__: JSON.stringify(BUILD_COMMIT),
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
