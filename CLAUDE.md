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
```

The Release CI (`.github/workflows/release.yml`) runs `pnpm install --frozen-lockfile`
then `pnpm build`, so keep `pnpm-lock.yaml` in sync and the build green.

## Toolchain notes / gotchas

- **Vite 4 + rollup 3** are required: older `youtubei.js` used
  `import ... assert { type: 'json' }` (import assertions), which the older
  vite 3 / rollup 2 parser could not handle. `youtubei.js` is pinned to **v17**
  (v13 crashed on YouTube's current signature deciphering); its bundled `.d.ts`
  use TS 5.0 `export type *`, so all three packages set `skipLibCheck`.
- **Audio download goes through `yt-dlp`, not `youtubei.js`.** Modern YouTube
  withholds stream URLs from JS extractors (SABR streaming + bot checks), so
  `youtubei.js` is metadata-only. `packages/main/src/youtubeDownload.ts` runs
  the `yt-dlp` binary in the **main process** (binary auto-downloaded to
  `userData/bin` on first use via Electron's `net`) behind the `yt:download`
  IPC channel; `preload`'s `fetchVideo` invokes it. Keep node-only download code
  out of `preload/src/youtube.ts` — that module is also bundled into the
  renderer (the `index.tsx` web fallback), which can't import `electron`.
- **SolidJS JSX compiler must match the runtime.** `solid-js` is pinned to
  **1.6.3**, so `babel-preset-solid` is pinned to **1.6.16** via the
  `resolutions` field in `package.json`. Newer `babel-preset-solid` emits
  `setStyleProperty`, which solid-js 1.6 does not export — bumping one without
  the other breaks `build:renderer`. Keep `solid-js`, `vite-plugin-solid`
  (2.6.1, peer-compatible with solid 1.6), and the `babel-preset-solid`
  resolution moving together.
- The Electron **GUI won't launch via `pnpm start`** in headless/root
  containers (`Running as root without --no-sandbox`). To actually see the UI
  there, use **`pnpm screenshot`** — it builds, launches the app under Xvfb
  with `--no-sandbox`, drives it with `playwright-core`, and writes a PNG.
  (Outbound HTTPS may be blocked by the sandbox network policy, so the YouTube
  panel can render empty — that's environmental, not a bug.)
