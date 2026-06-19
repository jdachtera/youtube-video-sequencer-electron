# CLAUDE.md

Guidance for agents working in this repository.

## What this is

A YouTube video **sequencer** desktop app built on the `vite-electron-builder`
boilerplate. UI is **SolidJS**; bundling is **Vite**; packaging is
**electron-builder**. Audio is handled with **Tone.js**; data layer uses Apollo
Client + GraphQL and IndexedDB (`idb`); YouTube access via `youtubei.js`.

## Package manager

This is a **yarn (Classic, 1.22.x)** project — pinned via the `packageManager`
field and `yarn.lock`. Use `yarn`, not `npm`. Do not commit a `package-lock.json`.
On Claude Code on the web, the SessionStart hook (`.claude/hooks/session-start.sh`)
runs `yarn install` automatically.

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
yarn install        # install deps
yarn start          # dev: vite watch + launches Electron (needs a display/GUI)
yarn build          # build all three packages (build:main, :preload, :renderer)
yarn typecheck      # tsc --noEmit across all packages
yarn lint           # eslint (gates on errors; warnings are tolerated)
yarn test           # unit tests (vitest, passWithNoTests) + e2e build
yarn compile        # production build + electron-builder --dir (local debug build)
```

The Release CI (`.github/workflows/release.yml`) runs `yarn install --frozen-lockfile`
then `yarn build`, so keep `yarn.lock` in sync and the build green.

## Toolchain notes / gotchas

- **Vite 4 + rollup 3** are required: `youtubei.js` v13 uses
  `import ... assert { type: 'json' }` (import assertions), which the older
  vite 3 / rollup 2 parser could not handle.
- **SolidJS JSX compiler must match the runtime.** `solid-js` is pinned to
  **1.6.3**, so `babel-preset-solid` is pinned to **1.6.16** via the
  `resolutions` field in `package.json`. Newer `babel-preset-solid` emits
  `setStyleProperty`, which solid-js 1.6 does not export — bumping one without
  the other breaks `build:renderer`. Keep `solid-js`, `vite-plugin-solid`
  (2.6.1, peer-compatible with solid 1.6), and the `babel-preset-solid`
  resolution moving together.
- The Electron **GUI cannot run** in headless/root containers
  (`Running as root without --no-sandbox`); rely on `yarn build` to validate
  changes there, not `yarn start`.
