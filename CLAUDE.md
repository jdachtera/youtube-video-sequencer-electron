# CLAUDE.md

Guidance for agents working in this repository.

## What this is

A YouTube video **sequencer** desktop app built on the `vite-electron-builder`
boilerplate. UI is **SolidJS**; bundling is **Vite**; packaging is
**electron-builder**. Audio is handled with **Tone.js**; data layer uses Apollo
Client + GraphQL and IndexedDB (`idb`). YouTube **search + metadata** come from
`youtubei.js`; **audio download** is delegated to the **`yt-dlp`** binary.

## Package manager

This is a **pnpm** project (pnpm 9.x) — pinned via the `packageManager` field and
`pnpm-lock.yaml`. Use `pnpm`, not `npm` or `yarn`. Do not commit a
`package-lock.json` or `yarn.lock`. `.npmrc` sets `node-linker=hoisted` so
node_modules stays flat for Electron / electron-builder. Dependency version pins
go in `pnpm.overrides` (not yarn's `resolutions`). On Claude Code on the web, the
SessionStart hook (`.claude/hooks/session-start.sh`) runs `pnpm install`
automatically; pnpm is provided via corepack.

## Project layout

Monorepo-style; each package builds independently:

- `packages/main` — Electron main process (built as CJS library).
- `packages/preload` — preload bridge; exposes Node/Electron APIs to the
  renderer via `exposedVars.ts`. Bundles `youtubei.js`.
- `packages/renderer` — the SolidJS web app (the actual UI).

Renderer cannot use Node APIs directly — expose them through `preload` and type
them in `packages/preload/contracts.d.ts` / `exposedVars.ts`.

## Common commands

```bash
pnpm install        # install deps
pnpm start          # dev: vite watch + launches Electron (needs a display/GUI)
pnpm build          # build all three packages (build:main, :preload, :renderer)
pnpm typecheck      # tsc --noEmit across all packages
pnpm lint           # eslint (gates on errors; warnings are tolerated)
pnpm test           # unit tests (vitest, passWithNoTests) + e2e build
pnpm compile        # production build + electron-builder --dir (local debug build)
pnpm integration-test  # headless audio + MIDI + scheduling harness (see Testing)
```

The Release CI (`.github/workflows/release.yml`) runs `pnpm install --frozen-lockfile`
then `pnpm build`, so keep `pnpm-lock.yaml` in sync and the build green.

## Testing

- **`pnpm integration-test`** (`scripts/integration-test.mjs`) is the end-to-end
  audio harness: it builds with `VITE_EXPOSE_ENGINE` (exposes `window.__engine`),
  launches the app under Xvfb, injects a synth sine into the samplers, and
  asserts on what comes out of the master bus (sound, pitch, automation, mocked
  Web MIDI, scheduling, track/device reorder, metronome + count-in, slice
  audition, master FX). Fully offline. Audio analysis uses a **live**
  `AnalyserNode` + the master `Meter`, **not** `engine.renderToBuffer` — the
  offline render rebuilds from `serialize()` and can't see the injected buffers,
  so anything that needs to _hear_ injected audio must use the live context.
  It's wired into CI as **`.github/workflows/integration-test.yml`** but
  **manual-only** (`workflow_dispatch`) to save Actions minutes — run it locally
  or dispatch it from the Actions tab.
- `pnpm test:renderer` runs the vitest unit tests (pure logic — pattern ops,
  randomize, tap tempo). `pnpm test:e2e` builds + runs the Playwright UI specs.

## Toolchain notes / gotchas

- **Electron is pinned to 42** (Node 24 / Chromium 148). `.electron-vendors.cache.json`
  feeds the vite build targets and `.browserslistrc`; regenerate both with
  `node scripts/update-electron-vendors.js` after an Electron bump. Because the
  Solid babel transform resolves `.browserslistrc`, `caniuse-lite` must be new
  enough to know the Chromium version — it's pinned via `pnpm.overrides` for that
  reason. `mainWindow.ts` sets `sandbox: false` so the preload keeps Node access.
- **macOS packaging is unsigned** (`mac.identity: null` in
  `.electron-builder.config.js`). `pnpm compile` (or `electron-builder --mac`)
  builds a `.app`/`.dmg`/`.zip` for arm64 + x64; first launch needs right-click →
  Open to clear Gatekeeper. Distribution needs an Apple Developer ID + notarization.
  electron-builder must run on macOS to produce Mac artifacts.

- **The `solid-pianoroll` / `solid-waveform` git deps build differently on
  install.** `solid-pianoroll` builds on install via its own `prepare: tsup`
  (works). `solid-waveform` ships a **committed prebuilt `dist` with no
  `prepare`** — do NOT re-add a build-on-install script: `rollup-preset-solid`'s
  per-file `source` target intermittently drops a module in CI (e.g.
  `createCachedWaveformPeaks`), producing an incomplete `dist/source` that breaks
  the renderer build (`Could not resolve ./createCachedWaveformPeaks`). When you
  change `solid-waveform`'s source, rebuild it (`rollup -c`) and commit its
  `dist`. Both are consumed from the `claude/funny-cerf-wbzop2` branch; after
  pushing a lib change, run `pnpm update <pkg>` in the app to bump the pinned
  commit, and verify `pnpm build:renderer`.

- **Build toolchain is Vite 6 / Rollup 4 / esbuild 0.25 / Vitest 3.** This
  matters for `youtubei.js`: v17 imports its `package.json` with the newer
  `with { type: 'json' }` import-attributes syntax, which esbuild ≤ 0.18 (Vite 4)
  could not parse — so `pnpm start`'s dev path failed. Vite 6's esbuild parses
  `with` natively, so no dependency patch is needed. `youtubei.js` is pinned to
  **v17** (v13 crashed on YouTube's current signature deciphering); its bundled
  `.d.ts` use TS 5.0 `export type *`, so all three packages set `skipLibCheck`.
- **`solid-js` stays pinned at 1.6.3.** `vite-plugin-solid` (2.11) peer-wants
  solid ≥ 1.7, but the `babel-preset-solid` 1.6.16 `pnpm.overrides` pin controls
  the actual transform, so the build stays solid-1.6-compatible (the peer warning
  is advisory). Don't bump `solid-js` without moving `babel-preset-solid` with it.
- **Audio download goes through `yt-dlp`, not `youtubei.js`.** Modern YouTube
  withholds stream URLs from JS extractors (SABR streaming + bot checks), so
  `youtubei.js` is metadata-only. `packages/main/src/youtubeDownload.ts` runs
  the `yt-dlp` binary in the **main process** (binary auto-downloaded to
  `userData/bin` on first use via Electron's `net`) behind the `yt:download`
  IPC channel; `preload`'s `fetchVideo` invokes it. Keep node-only download code
  out of `preload/src/youtube.ts` — that module is also bundled into the
  renderer (the `index.tsx` web fallback), which can't import `electron`.
- **SolidJS JSX compiler must match the runtime.** `solid-js` is pinned to
  **1.6.3**, so `babel-preset-solid` is pinned to **1.6.16** via `pnpm.overrides`.
  Newer `babel-preset-solid` emits `setStyleProperty`, which solid-js 1.6 does
  not export — bumping one without the other breaks `build:renderer`. The
  override holds `babel-preset-solid` at 1.6.16 even though `vite-plugin-solid`
  (2.11) would otherwise pull a newer one; keep `solid-js` and the
  `babel-preset-solid` override moving together.
- The Electron **GUI won't launch via `pnpm start`** in headless/root
  containers (`Running as root without --no-sandbox`). To actually see the UI
  there, use **`pnpm screenshot`** — it builds, launches the app under Xvfb
  with `--no-sandbox`, drives it with `playwright-core`, and writes a PNG.
  (Outbound HTTPS may be blocked by the sandbox network policy, so the YouTube
  panel can render empty — that's environmental, not a bug.)
