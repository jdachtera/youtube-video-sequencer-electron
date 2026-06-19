import { css } from '@emotion/css';
import {
  createResource,
  createSignal,
  ErrorBoundary,
  For,
  onCleanup,
  Show,
  Suspense,
} from 'solid-js';
import { Column } from '../UI/Grid';
import { InputLCD } from '../UI/lcdStyles';
import type { Engine } from '../engine/Engine';
import { notify } from '../notifications';
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

  type Result = NonNullable<ReturnType<typeof results>>[number];

  const [selectedResult, setSelectedResult] = createSignal<Result>();

  // Audio preview via the same yt-dlp path used for downloads (so previewing
  // also warms the on-disk cache). The embedded YouTube <iframe> player can't
  // play in-app — it fails CORS fetching the stream.
  let audioRef: HTMLAudioElement | undefined;
  const [previewUrl, setPreviewUrl] = createSignal<string>();
  const [loadingUrl, setLoadingUrl] = createSignal<string>();

  const setPreviewSource = (objectUrl?: string) => {
    const previous = previewUrl();
    if (previous) URL.revokeObjectURL(previous);
    setPreviewUrl(objectUrl);
  };

  onCleanup(() => setPreviewSource(undefined));

  const preview = async (item: Result) => {
    // Re-selecting the current item toggles playback.
    if (selectedResult() === item && audioRef) {
      if (audioRef.paused) void audioRef.play().catch(() => undefined);
      else audioRef.pause();
      return;
    }

    setSelectedResult(item);
    setPreviewSource(undefined);
    setLoadingUrl(item.url);

    try {
      const buffer = await window.yt.fetchVideo(item.url);
      if (selectedResult() !== item) return; // selection moved on while loading
      setPreviewSource(URL.createObjectURL(new Blob([buffer])));
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'unknown error';
      notify(`Couldn't preview "${item.title}": ${reason}`, 'error');
    } finally {
      setLoadingUrl(undefined);
    }
  };

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
                      onSelect={() => void preview(item)}
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
          <div
            class={css`
              padding: 8px;
              border-top: 1px solid #3a3a3a;
            `}
          >
            <div
              class={css`
                font-size: 11px;
                color: #bbb;
                margin-bottom: 4px;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
              `}
            >
              {loadingUrl() === item.url ? 'Loading preview…' : item.title}
            </div>
            <audio
              ref={audioRef}
              src={previewUrl()}
              autoplay
              controls
              class={css`
                width: 100%;
              `}
            />
          </div>
        )}
      </Show>
    </Column>
  );
};
