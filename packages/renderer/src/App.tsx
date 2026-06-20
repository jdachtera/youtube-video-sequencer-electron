import { css } from '@emotion/css';
import { ApolloProvider } from '@merged/solid-apollo';
import { For, onCleanup, onMount, Show } from 'solid-js';
import { Transport } from 'tone';
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

const engine = new Engine(Transport);

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
    ['trackAdded', 'trackRemoved'],
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
              <SamplerPanel engine={engine} />
              <Show
                when={tracks().length > 0}
                fallback={<EmptyState engine={engine} />}
              >
                <Column
                  flex={1}
                  overflow={'auto'}
                  class={css`
                    zoom: ${zoom()};
                  `}
                >
                  <For each={tracks()}>
                    {(track) => <TrackView track={track} />}
                  </For>
                </Column>
              </Show>
            </Column>
          </Row>
        </Column>
      </ApolloProvider>
    </ThemeProvider>
  );
}
