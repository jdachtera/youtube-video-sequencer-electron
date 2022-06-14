import { createResource, createSignal, For, Show, Suspense } from 'solid-js';
import { Column } from '../UI/Grid';
import { InputLCD } from '../UI/lcdStyles';
import type { Engine } from '../engine/Engine';
import { BrowserListItem } from './List';

export const YoutubeSearchPanel = (props: { engine: Engine }) => {
  const [searchTerm, setSearchTerm] = createSignal('breakbeat');

  const [results] = createResource(
    () => searchTerm(),
    (searchTerm) => {
      if (!searchTerm.length) return [];
      return window.yt.search(searchTerm);
    },
  );

  const [selectedResult, setSelectedResult] =
    createSignal<NonNullable<ReturnType<typeof results>>[number]>();

  const [selectedVideoInfo] = createResource(selectedResult, async (item) => {
    if (!item) return;

    const result = await window.yt.getInfo(item.url);

    const videoTracks = result.formats.filter(
      (entry) => entry.hasVideo && entry.hasAudio,
    );

    const sourceFormat = videoTracks
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      .sort((a, b) => (a.bitrate! < b.bitrate! ? 1 : -1))
      .shift();

    return sourceFormat?.url;
  });

  let playerRef: HTMLVideoElement | undefined;

  return (
    <Column flex={1} overflow={'hidden'}>
      <InputLCD
        value={searchTerm()}
        placeholder="Enter search term"
        onChange={(event) => setSearchTerm(event.currentTarget.value)}
      />
      <Suspense>
        <Column flex={1} overflowY={'auto'} overflowX={'hidden'}>
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
                    const sampler = props.engine.getOrCreateSampler(item.url);
                    props.engine.setCurrentSampler(sampler);
                  }}
                />
              )}
            </For>
          </ul>
        </Column>
      </Suspense>
      <Show when={selectedVideoInfo()}>
        {(item) => (
          <video
            ref={playerRef}
            muted={false}
            width={'100%'}
            height={(360 / 640) * 300}
            src={item}
            autoplay
            preload="metadata"
            controls
          />
        )}
      </Show>
    </Column>
  );
};
