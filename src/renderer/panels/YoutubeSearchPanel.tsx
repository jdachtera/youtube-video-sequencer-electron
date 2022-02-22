import { createResource, createSignal, For, Show, Suspense } from 'solid-js';

import { Engine } from 'renderer/engine/Engine';
import { Column } from 'renderer/UI/Grid';
import { InputLCD } from 'renderer/UI/lcdStyles';
import { ButtonWithLabel } from 'renderer/UI/ButtonWithLabel';
import { css } from '@emotion/css';
import { Track } from 'renderer/engine/Track';

export const YoutubeSearchPanel = (props: { engine: Engine }) => {
  const [searchTerm, setSearchTerm] = createSignal('breakbeat');

  const [results] = createResource(searchTerm, () => {
    if (!searchTerm().length) return [];
    return window.yt.search(searchTerm());
  });

  const [selectedResult, setSelectedResult] =
    createSignal<NonNullable<ReturnType<typeof results>>[number]>();

  const [selectedVideoInfo] = createResource(selectedResult, async (item) => {
    if (!item) return;

    const result = await window.yt.getInfo(item.url);

    const videoTracks = result.formats.filter(
      (entry) => entry.hasVideo && entry.hasAudio
    );

    const sourceFormat = videoTracks
      .sort((a, b) => (a.bitrate! < b.bitrate! ? 1 : -1))
      .shift();

    return sourceFormat?.url;
  });

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
                <li
                  onClick={() => setSelectedResult(item)}
                  classList={{
                    [css`
                      display: flex;
                      cursor: pointer;
                      border-bottom: 1px black solid;
                      overflow: hidden;
                      height: 80px;
                    `]: true,
                    [css`
                      background: #363434;
                    `]: selectedResult() === item,
                  }}
                >
                  <div
                    class={css`
                      display: flex;
                      width: 80px;
                      height: 80px;
                      background-size: cover;
                      background-position: 50% 50%;
                    `}
                    style={{
                      'background-image': `url('${
                        item.snippet.thumbnails.url as string
                      }')`,
                    }}
                  ></div>
                  <div
                    class={css`
                      flex: 1;
                      padding: 5px;
                      text-overflow: ellipsis;
                      overflow: hidden;
                    `}
                  >
                    {item.title}
                  </div>
                  <div>
                    <ButtonWithLabel
                      label="+"
                      labelOnButton
                      onClick={() =>
                        props.engine.createTrack(
                          Track.normalizeData({
                            chain: {
                              devices: [{ name: 'Sampler', url: item.url }],
                            },
                          })
                        )
                      }
                    />
                  </div>
                </li>
              )}
            </For>
          </ul>
        </Column>
      </Suspense>
      <Show when={selectedVideoInfo()}>
        {(item) => (
          <video
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
