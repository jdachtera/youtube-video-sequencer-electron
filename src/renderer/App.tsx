import { For, createSignal } from 'solid-js';
import { ThemeProvider, css } from 'solid-styled-components';
import { Transport } from 'tone';
import { ApolloProvider } from '@merged/solid-apollo';

import { Engine } from './engine/Engine';
import { theme } from './theme';
import { DeviceWrapper } from './UI';

import { apolloClient } from './apolloClient';
import { createSignalFromEventEmitter } from './createSignalFromEventEmitter';
import { Toolbar, ViewMode } from './Toolbar';
import { GlobalStyles } from './GlobalStyles';
import { DeviceView } from './Device/DeviceView';
import { PatternView } from './PatternView';

const engine = new Engine(Transport);

export function App() {
  const tracks = createSignalFromEventEmitter(
    engine,
    ['trackAdded', 'trackRemoved'],
    (engine) => engine.tracks
  );

  const [viewMode, setViewMode] = createSignal<ViewMode>('DEVICE');

  return (
    <ThemeProvider theme={theme}>
      <ApolloProvider client={apolloClient}>
        <GlobalStyles />
        <div class="App">
          <div
            class={css`
              padding: 3px;
              background-color: #555;
              box-shadow: inset 0 0 2px 1px #222;
              border-radius: 5px;
              display: flex;
              flex-direction: column;
            `}
          >
            <Toolbar
              engine={engine}
              viewMode={viewMode()}
              onViewModeChanged={setViewMode}
            />

            <div
              classList={{
                [css`
                  display: none;
                `]: viewMode() !== 'DEVICE',
              }}
            >
              <For each={tracks()}>
                {(track) => (
                  <div>
                    <DeviceView device={track.chain} />
                    <button
                      onClick={() => {
                        engine.removeTrack(track);
                      }}
                    >
                      Remove Track
                    </button>
                  </div>
                )}
              </For>
            </div>

            <div
              classList={{
                [css`
                  display: none;
                `]: viewMode() !== 'PATTERN',
              }}
            >
              <DeviceWrapper background={'#bd945e'}>
                <For each={tracks()} fallback={<div>loading sampler...</div>}>
                  {(track) => <PatternView device={track.chain} />}
                </For>
              </DeviceWrapper>
            </div>
          </div>
        </div>
      </ApolloProvider>
    </ThemeProvider>
  );
}
