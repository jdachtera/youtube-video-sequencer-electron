import { css } from '@emotion/css';
import { ApolloProvider } from '@merged/solid-apollo';
import { For, onCleanup, onMount, Show } from 'solid-js';
import { Transport } from 'tone';
import { DeviceChainView } from './Device/DeviceChainView';
import { SamplerPanel } from './Device/SamplerPanel';
import { TrackView } from './Device/TrackView';
import { Downloads } from './UI/Downloads';
import { EmptyState } from './UI/EmptyState';
import { GlobalStyles } from './UI/GlobalStyles';
import { Column, Row } from './UI/Grid';
import { Toaster } from './UI/Toaster';
import { theme } from './UI/theme';
import { apolloClient } from './apolloClient';
import { updateDownload } from './downloads';
import { ThemeProvider } from './emotion-solid';
import { Engine } from './engine/Engine';
import { createSignalFromEventEmitter } from './engine/EngineBase';
import { notify } from './notifications';
import { AppMenu } from './panels/AppMenu';
import { SidePanel } from './panels/SidePanel';
import { Toolbar } from './panels/Toolbar';

// Replaced at build time by Vite's `define` (vite.config.js); true only when
// VITE_EXPOSE_ENGINE=true, so the branch below is stripped from shipped builds.
declare const __EXPOSE_ENGINE__: boolean;

// Short commit the renderer was built from (Vite `define`); shown in a corner
// so we can tell which deployed version is running.
declare const __BUILD_COMMIT__: string;

const engine = new Engine(Transport);

// Global UI density. The skeuomorphic rack is drawn at large fixed sizes, so by
// default we scale the whole app down a little (consumed by #root's `zoom` in
// GlobalStyles). Tunable via `localStorage.megarack.uiScale` for users who want
// it bigger or smaller; clamped to a sane range.
const DEFAULT_UI_SCALE = 0.85;
const storedUiScale = Number(localStorage.getItem('megarack.uiScale'));
const uiScale =
  Number.isFinite(storedUiScale) && storedUiScale > 0
    ? Math.min(1.5, Math.max(0.5, storedUiScale))
    : DEFAULT_UI_SCALE;
document.documentElement.style.setProperty('--ui-scale', String(uiScale));

// Test hook: expose the engine to the headless audio harness
// (scripts/audiotest.mjs) so it can drive an offline render and assert the
// output isn't silent.
if (__EXPOSE_ENGINE__) {
  (window as unknown as { __engine: Engine }).__engine = engine;
}

// Lowest desktop-shell IPC/contextBridge contract this UI needs. When the UI is
// served remotely (GitHub Pages) and loaded into an older installed shell, warn
// the user instead of silently failing. Bump in lockstep with SHELL_API_VERSION
// (packages/main/src/hostApi.ts) when this UI starts relying on a newer channel.
const REQUIRED_SHELL_API_VERSION = 1;

const checkShellVersion = async () => {
  const getInfo = window.host?.getInfo;
  if (!getInfo) return; // running as a plain website, not inside the shell
  try {
    const info = await getInfo();
    if (info.apiVersion < REQUIRED_SHELL_API_VERSION) {
      notify(
        'The desktop app is out of date — some features may not work. Please update.',
        'error',
      );
    }
  } catch {
    // No host info available; nothing actionable.
  }
};

export function App() {
  const tracks = createSignalFromEventEmitter(
    engine,
    (engine) => engine.tracks,
    ['trackAdded', 'trackRemoved', 'tracksReordered'],
  );

  const zoom = createSignalFromEventEmitter(
    engine,
    (engine) => engine.zoom,
    'zoomUpdated',
  );

  onMount(() => {
    const unsubscribe = window.yt.onDownloadProgress?.(updateDownload);
    if (unsubscribe) onCleanup(unsubscribe);
    void checkShellVersion();
    // Activate MIDI keyboard input (play + record). No-op if Web MIDI is
    // unavailable or access is denied.
    void engine.midiInput.init();
  });

  return (
    <ThemeProvider theme={theme}>
      <ApolloProvider client={apolloClient}>
        <GlobalStyles />
        <Toaster />
        <Downloads />

        <Column
          class={css`
            background-color: #555;
            box-shadow: inset 0 0 2px 1px #222;
            border-radius: 5px;
            width: 100vw;
            height: 100vh;
            position: relative;
          `}
        >
          {/* Renders nothing; owns the native menu + its keyboard shortcuts.
              Mounted before Toolbar so undo/redo history starts capturing
              before Toolbar's localStorage load fires. */}
          <AppMenu engine={engine} />
          <Toolbar engine={engine} />

          <Row overflow={'hidden'} flex={1}>
            <SidePanel engine={engine} />
            <Column overflow={'hidden'} flex={1}>
              {/* The title-bar zoom scales the whole work area — sampler
                  included — so everything sizes together. */}
              <Column
                flex={1}
                overflow={'hidden'}
                class={css`
                  zoom: ${zoom()};
                `}
              >
                <SamplerPanel engine={engine} />
                <Show
                  when={tracks().length > 0}
                  fallback={<EmptyState engine={engine} />}
                >
                  <Column flex={1} overflow={'auto'}>
                    <For each={tracks()}>
                      {(track) => <TrackView track={track} />}
                    </For>
                  </Column>
                </Show>
                {/* Master FX strip: effects on the whole mix, pinned below the
                    tracks. Reuses the per-track device chain UI. */}
                <Show when={tracks().length > 0}>
                  <Row
                    classList={{
                      [css`
                        flex: 0 0 auto;
                        align-items: center;
                        gap: 8px;
                        padding: 4px 8px;
                        background: #2b2b2b;
                        border-top: 1px solid rgba(0, 0, 0, 0.5);
                      `]: true,
                    }}
                  >
                    <span
                      class={css`
                        font-family: 'oswald';
                        font-size: 11px;
                        letter-spacing: 1px;
                        text-transform: uppercase;
                        color: #cfcfcf;
                        white-space: nowrap;
                      `}
                    >
                      Master FX
                    </span>
                    <DeviceChainView
                      deviceChain={engine.masterChain}
                      renderDummy={false}
                    />
                  </Row>
                </Show>
              </Column>
            </Column>
          </Row>

          {/* Build version — which renderer commit is running. Subtle, but
              selectable so it can be copied into a bug report. */}
          <div
            title="Renderer build commit"
            class={css`
              position: absolute;
              right: 6px;
              bottom: 3px;
              z-index: 50;
              font-family: monospace;
              font-size: 10px;
              line-height: 1;
              letter-spacing: 0.5px;
              color: #fff;
              opacity: 0.35;
              user-select: text;
              &:hover {
                opacity: 0.75;
              }
            `}
          >
            {__BUILD_COMMIT__}
          </div>
        </Column>
      </ApolloProvider>
    </ThemeProvider>
  );
}
