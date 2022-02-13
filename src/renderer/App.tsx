import { For, ErrorBoundary, createSignal, createEffect } from 'solid-js';
import { ThemeProvider, css } from 'solid-styled-components';
import { Transport } from 'tone';
import { ApolloProvider } from '@merged/solid-apollo';

import { Engine } from './engine/Engine';
import { SamplerView } from './SamplerView';
import { theme } from './theme';
import { Device } from './UI';

import { apolloClient } from './apolloClient';
import { createSignalFromEventEmitter } from './createSignalFromEventEmitter';
import { PatternEditor } from './PatternEditor';
import { Toolbar, ViewMode } from './Toolbar';
import { GlobalStyles } from './GlobalStyles';

const engine = new Engine(Transport);

export function App() {
  const samplers = createSignalFromEventEmitter(
    engine,
    ['sampler-added', 'sampler-removed'],
    (engine) => engine.getSamplers()
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
              <For each={samplers()}>
                {(sampler) => <SamplerView sampler={sampler} />}
              </For>
            </div>

            <div
              classList={{
                [css`
                  display: none;
                `]: viewMode() !== 'PATTERN',
              }}
            >
              <Device background={'#bd945e'}>
                <div>
                  <For
                    each={samplers()}
                    fallback={<div>loading sampler...</div>}
                  >
                    {(sampler) => <PatternEditor sampler={sampler} />}
                  </For>
                </div>
              </Device>
            </div>
          </div>
        </div>
      </ApolloProvider>
    </ThemeProvider>
  );
}
