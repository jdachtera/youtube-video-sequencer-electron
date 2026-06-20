import { css } from '@emotion/css';
import {
  createMemo,
  createResource,
  createSignal,
  ErrorBoundary,
  For,
  Show,
  Suspense,
} from 'solid-js';
import { ButtonWithLabel } from '../UI/ButtonWithLabel';
import { Column, Row } from '../UI/Grid';
import { InputLCD } from '../UI/lcdStyles';
import type { Engine } from '../engine/Engine';
import { notify } from '../notifications';
import { BrowserListItem } from './List';

const messageStyle = css`
  padding: 12px;
  color: #999;
  font-size: 12px;
`;

// Length filters for the result list. `maxSeconds: Infinity` means "don't
// filter". Samplers usually want short loops/breaks, so the presets bias short.
const durationFilters = [
  { label: 'Any', maxSeconds: Infinity },
  { label: '≤1m', maxSeconds: 60 },
  { label: '≤4m', maxSeconds: 240 },
  { label: '≤10m', maxSeconds: 600 },
] as const;

type DurationFilter = typeof durationFilters[number];

// Parse a "M:SS" / "H:MM:SS" duration string into seconds. Returns undefined for
// missing/odd values (e.g. live streams have no length).
const parseDuration = (raw?: string | null): number | undefined => {
  if (!raw) return undefined;
  const parts = raw.split(':').map((part) => parseInt(part, 10));
  if (!parts.length || parts.some((part) => Number.isNaN(part)))
    return undefined;
  return parts.reduce((total, part) => total * 60 + part, 0);
};

const formatDuration = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const pad = (value: number) => value.toString().padStart(2, '0');
  return hours > 0
    ? `${hours}:${pad(minutes)}:${pad(secs)}`
    : `${minutes}:${pad(secs)}`;
};

// A bunch of sample-worthy starting points so the browser doesn't always open
// on the same search. One is picked at random each time the panel mounts.
const defaultSearches = [
  'soul samples',
  'lofi hip hop',
  'jazz piano loop',
  'funk breaks',
  'vintage drum break',
  'boom bap instrumental',
  'rhodes piano loop',
  'gospel chords',
  '70s soul',
  'vinyl crackle drums',
  'ambient pad',
  'guitar loop',
  'vocal chops',
  'trap melody loop',
  'old school funk',
  'cinematic strings',
];

export const YoutubeSearchPanel = (props: { engine: Engine }) => {
  // `term` mirrors the input immediately; `query` is debounced and drives the
  // actual search so typing doesn't fire a request per keystroke.
  const initialTerm =
    defaultSearches[Math.floor(Math.random() * defaultSearches.length)];
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

  // Client-side length filter over whatever the search returned.
  const [durationFilter, setDurationFilter] = createSignal<DurationFilter>(
    durationFilters[0],
  );

  const filteredResults = createMemo(() => {
    const all = results() ?? [];
    const max = durationFilter().maxSeconds;
    if (!Number.isFinite(max)) return all;
    return all.filter((item) => {
      const seconds = parseDuration(item.duration_raw);
      return seconds !== undefined && seconds <= max;
    });
  });

  const [selectedResult, setSelectedResult] = createSignal<Result>();

  // Seekable video preview served by the local streaming server in the main
  // process (the embedded YouTube <iframe> player can't play in-app — it fails
  // CORS fetching the stream).
  let videoRef: HTMLVideoElement | undefined;
  const [previewUrl, setPreviewUrl] = createSignal<string>();
  const [loadingUrl, setLoadingUrl] = createSignal<string>();

  const preview = async (item: Result) => {
    // Re-selecting the current item toggles playback.
    if (selectedResult() === item && videoRef) {
      if (videoRef.paused) void videoRef.play().catch(() => undefined);
      else videoRef.pause();
      return;
    }

    setSelectedResult(item);
    setPreviewUrl(undefined);
    setLoadingUrl(item.url);

    try {
      const localUrl = await window.yt.getPreviewUrl(item.url);
      if (selectedResult() !== item) return; // selection moved on while loading
      setPreviewUrl(localUrl);
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
      <Row
        classList={{
          [css`
            align-items: center;
            gap: 2px;
            padding: 4px 6px 2px;
          `]: true,
        }}
      >
        <span
          class={css`
            font-family: 'oswald';
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: #999;
            margin-right: 4px;
          `}
        >
          Length
        </span>
        <For each={durationFilters}>
          {(filter) => (
            <ButtonWithLabel
              label={filter.label}
              labelOnButton
              activated={durationFilter() === filter}
              onClick={() => setDurationFilter(filter)}
            />
          )}
        </For>
      </Row>
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
              when={filteredResults().length > 0}
              fallback={
                <Show when={query().length}>
                  <div class={messageStyle}>
                    <Show
                      when={(results()?.length ?? 0) > 0}
                      fallback={<>No results for “{query()}”</>}
                    >
                      No results under {durationFilter().label} for “{query()}”
                    </Show>
                  </div>
                </Show>
              }
            >
              <ul>
                <For each={filteredResults()}>
                  {(item) => {
                    const seconds = parseDuration(item.duration_raw);
                    return (
                      <BrowserListItem
                        onSelect={() => void preview(item)}
                        isSelected={selectedResult() === item}
                        name={item.title}
                        thumbnail={item.snippet.thumbnails.url as string}
                        meta={
                          seconds !== undefined
                            ? formatDuration(seconds)
                            : undefined
                        }
                        onAdd={() => {
                          const sampler = props.engine.getOrCreateSampler(
                            item.url,
                          );
                          props.engine.setCurrentSampler(sampler);
                        }}
                      />
                    );
                  }}
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
            <video
              ref={videoRef}
              src={previewUrl()}
              autoplay
              controls
              class={css`
                width: 100%;
                background: #000;
              `}
            />
          </div>
        )}
      </Show>
    </Column>
  );
};
