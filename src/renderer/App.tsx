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
import { Column, Row } from './Grid';
import { SidePanel } from './SidePanel';

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

        <Column
          classList={{
            [css`
              background-color: #555;
              box-shadow: inset 0 0 2px 1px #222;
              border-radius: 5px;
              width: 100vw;
              height: 100vh;
              position: relative;
            `]: true,
          }}
        >
          <Toolbar engine={engine} />

          <Row
            classList={{
              [css`
                flex: 1;
                overflow: hidden;
              `]: true,
            }}
          >
            <SidePanel engine={engine} />
            <Column
              classList={{
                [css`
                  flex: 1;
                  overflow: auto;
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
            </Column>
          </Row>
        </Column>
      </ApolloProvider>
    </ThemeProvider>
  );
}
