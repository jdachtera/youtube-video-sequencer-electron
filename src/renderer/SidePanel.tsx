import { css } from '@emotion/css';
import {
  createResource,
  createSignal,
  For,
  Match,
  ResourceReturn,
  Show,
  Suspense,
  Switch,
} from 'solid-js';
import { Engine } from './engine/Engine';
import { Track } from './engine/Track';
import { FindSlicesPanel } from './FindSlicesPanel';
import { Column } from './Grid';
import { ButtonGroup, ButtonWithLabel, InputLCD } from './UI';

export const SidePanel = (props: { engine: Engine }) => {
  const tabs = ['YouTube', 'SliceDB'] as const;

  const [activeTab, setActiveTab] = createSignal<typeof tabs[number]>(tabs[0]);

  return (
    <Column
      classList={{
        [css`
          width: 300px;
          overflow-y: auto;
        `]: true,
      }}
    >
      <ButtonGroup>
        <For each={tabs}>
          {(tab) => (
            <ButtonWithLabel
              label={tab}
              labelOnButton
              activated={tab === activeTab()}
              onClick={() => setActiveTab(tab)}
            />
          )}
        </For>
      </ButtonGroup>
      <Switch>
        <Match when={activeTab() === 'YouTube'}>
          <YoutubeSearch engine={props.engine} />
        </Match>
        <Match when={activeTab() === 'SliceDB'}>
          <FindSlicesPanel engine={props.engine} />
        </Match>
      </Switch>
    </Column>
  );
};

export const YoutubeSearch = (props: { engine: Engine }) => {
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

    console.log(result);

    const videoTracks = result.formats.filter((entry) => entry.hasVideo);

    const sourceFormat = videoTracks
      .sort((a, b) => (a.bitrate! < b.bitrate! ? 1 : -1))
      .shift();

    console.log(sourceFormat);

    return sourceFormat?.url;
  });

  return (
    <Column
      classList={{
        [css`
          flex: 1;
          background-color: gray;
        `]: true,
      }}
    >
      <InputLCD
        value={searchTerm()}
        placeholder="Enter search term"
        onChange={(event) => setSearchTerm(event.currentTarget.value)}
      />
      <Suspense>
        <ul
          class={css`
            flex: 1;
            display: flex;
            overflow: auto;
            flex-direction: column;
          `}
        >
          <For each={results() ?? []}>
            {(item) => (
              <li
                onClick={() => setSelectedResult(item)}
                classList={{
                  [css`
                    display: flex;
                    cursor: pointer;
                  `]: true,
                  [css`
                    background: #363434;
                  `]: selectedResult() === item,
                }}
              >
                <div
                  class={css`
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
      </Suspense>
      <Show when={selectedVideoInfo()}>
        {(item) => (
          <video
            width={300}
            height={(360 / 640) * 300}
            src={item}
            autoplay
            controls
          />
        )}
      </Show>
    </Column>
  );
};
