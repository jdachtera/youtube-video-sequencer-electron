import { css } from '@emotion/css';
import { ApolloProvider } from '@merged/solid-apollo';
import { For, Show } from 'solid-js';
import { Transport } from 'tone';
import { SamplerView } from './Device/SamplerView';
import { TrackView } from './Device/TrackView';
import { GlobalStyles } from './UI/GlobalStyles';
import { Column, Row } from './UI/Grid';
import { Toaster } from './UI/Toaster';
import { theme } from './UI/theme';
import { apolloClient } from './apolloClient';
import { ThemeProvider } from './emotion-solid';
import { Engine } from './engine/Engine';
import { createSignalFromEventEmitter } from './engine/EngineBase';
import { SidePanel } from './panels/SidePanel';
import { Toolbar } from './panels/Toolbar';

const engine = new Engine(Transport);

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

  const selectedSampler = createSignalFromEventEmitter(
    engine,
    (engine) => engine.currentSampler,
    'currentSamplerChanged',
  );

  return (
    <ThemeProvider theme={theme}>
      <ApolloProvider client={apolloClient}>
        <GlobalStyles />
        <Toaster />

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
          <Toolbar engine={engine} />

          <Row overflow={'hidden'} flex={1}>
            <SidePanel engine={engine} />
            <Column overflow={'hidden'} flex={1}>
              <Row>
                <Show keyed when={selectedSampler()}>
                  {(sampler) => <SamplerView sampler={sampler} />}
                </Show>
              </Row>
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
            </Column>
          </Row>
        </Column>
      </ApolloProvider>
    </ThemeProvider>
  );
}
