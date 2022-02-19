import { For } from 'solid-js';
import { ThemeProvider, css } from 'renderer/emotion-solid';
import { Transport } from 'tone';
import { ApolloProvider } from '@merged/solid-apollo';

import { Engine } from './engine/Engine';
import { theme } from './theme';

import { apolloClient } from './apolloClient';
import { createSignalFromEventEmitter } from './createSignalFromEventEmitter';
import { Toolbar } from './Toolbar';
import { GlobalStyles } from './GlobalStyles';
import { DeviceView } from './Device/DeviceView';

const engine = new Engine(Transport);

export function App() {
  const tracks = createSignalFromEventEmitter(
    engine,
    ['trackAdded', 'trackRemoved'],
    (engine) => engine.tracks
  );

  const zoom = createSignalFromEventEmitter(
    engine,
    ['zoomUpdated'],
    (engine) => engine.zoom
  );

  return (
    <ThemeProvider theme={theme}>
      <ApolloProvider client={apolloClient}>
        <GlobalStyles />

        <div
          class={css`
            padding: 3px;
            background-color: #555;
            box-shadow: inset 0 0 2px 1px #222;
            border-radius: 5px;
            display: flex;
            flex: 1;
            flex-direction: column;
            width: 100vw;
            height: 100vh;
          `}
        >
          <Toolbar engine={engine} />

          <div
            classList={{
              [css`
                flex: 1;
                overflow-y: auto;
                width: 100%;
                zoom: ${zoom()};
              `]: true,
            }}
          >
            <For each={tracks()}>
              {(track) => (
                <div
                  classList={{
                    [css`
                      max-width: 100vw;
                      display: flex;
                    `]: true,
                  }}
                >
                  <DeviceView
                    device={track.chain}
                    onRequestRemoveDevice={() => {
                      engine.removeTrack(track);
                    }}
                  />
                </div>
              )}
            </For>
          </div>
        </div>
      </ApolloProvider>
    </ThemeProvider>
  );
}
