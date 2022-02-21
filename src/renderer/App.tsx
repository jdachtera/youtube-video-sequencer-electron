import { For } from 'solid-js';
import { ThemeProvider, css } from 'renderer/emotion-solid';
import { Transport } from 'tone';
import { ApolloProvider } from '@merged/solid-apollo';

import { Engine } from './engine/Engine';
import { theme } from './theme';

import { apolloClient } from './apolloClient';

import { Toolbar } from './Toolbar';
import { GlobalStyles } from './GlobalStyles';
import { DeviceChainView } from './Device/DeviceChainView';

const engine = new Engine(Transport);

export function App() {
  const tracks = engine.createSignal(
    (engine) => engine.tracks,
    ['trackAdded', 'trackRemoved']
  );

  const zoom = engine.createSignal((engine) => engine.zoom, 'zoomUpdated');

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
                display: flex;
                flex-direction: column;
                zoom: ${zoom()};
              `]: true,
            }}
          >
            <For each={tracks()}>
              {(track) => (
                <div
                  classList={{
                    [css`
                      flex-direction: column;
                      display: flex;
                    `]: true,
                  }}
                >
                  <DeviceChainView
                    deviceChain={track.chain}
                    renderDummy={false}
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
