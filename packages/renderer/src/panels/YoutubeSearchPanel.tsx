import { css } from '@emotion/css';
import {
  createResource,
  createSignal,
  ErrorBoundary,
  For,
  Show,
  Suspense,
} from 'solid-js';
import { Column } from '../UI/Grid';
import { InputLCD } from '../UI/lcdStyles';
import type { Engine } from '../engine/Engine';
import { BrowserListItem } from './List';

const messageStyle = css`
  padding: 12px;
  color: #999;
  font-size: 12px;
`;

export const YoutubeSearchPanel = (props: { engine: Engine }) => {
  // `term` mirrors the input immediately; `query` is debounced and drives the
  // actual search so typing doesn't fire a request per keystroke.
  const initialTerm = 'Short Beat';
  const [term, setTerm] = createSignal(initialTerm);
  const [query, setQuery] = createSignal(initialTerm);

  let debounceTimer: ReturnType<typeof setTimeout> | undefined;
  const onInput = (value: string) => {
    setTerm(value);
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => setQuery(value), 300);
  };

  const [results] = createResource(
    () => query(),
    (searchTerm) => {
      if (!searchTerm.length) return [];
      return window.yt.search(searchTerm);
    },
  );

  const [selectedResult, setSelectedResult] =
    createSignal<NonNullable<ReturnType<typeof results>>[number]>();

  let playerRef: HTMLVideoElement | undefined;

  return (
    <Column flex={1} overflow={'hidden'}>
      <InputLCD
        value={term()}
        placeholder="Enter search term"
        onInput={(event) => onInput(event.currentTarget.value)}
      />
      <ErrorBoundary
        fallback={(error: unknown) => (
          <div class={messageStyle}>
            Search failed:{' '}
            {error instanceof Error ? error.message : 'unknown error'}
          </div>
        )}
      >
        <Suspense fallback={<div class={messageStyle}>Searching…</div>}>
          <Column flex={1} overflowY={'auto'} overflowX={'hidden'}>
            <Show
              when={(results()?.length ?? 0) > 0}
              fallback={
                <Show when={query().length}>
                  <div class={messageStyle}>No results for “{query()}”</div>
                </Show>
              }
            >
              <ul>
                <For each={results() ?? []}>
                  {(item) => (
                    <BrowserListItem
                      onSelect={() => {
                        if (selectedResult() === item) {
                          if (playerRef?.paused) {
                            playerRef?.play();
                          } else {
                            playerRef?.pause();
                          }
                        }
                        setSelectedResult(item);
                      }}
                      isSelected={selectedResult() === item}
                      name={item.title}
                      thumbnail={item.snippet.thumbnails.url as string}
                      onAdd={() => {
                        const sampler = props.engine.getOrCreateSampler(
                          item.url,
                        );
                        props.engine.setCurrentSampler(sampler);
                      }}
                    />
                  )}
                </For>
              </ul>
            </Show>
          </Column>
        </Suspense>
      </ErrorBoundary>
      <Show keyed when={selectedResult()}>
        {(item) => (
          <iframe
            height={(360 / 640) * 300}
            src={`https://www.youtube.com/embed/${item.id.videoId}?autoplay=1&origin=${location.origin}&vq=tiny`}
          />
        )}
      </Show>
    </Column>
  );
};
