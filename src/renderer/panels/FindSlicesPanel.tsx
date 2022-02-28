import { createQuery } from '@merged/solid-apollo';
import {
  createMemo,
  createResource,
  createSignal,
  For,
  JSX,
  Show,
  splitProps,
} from 'solid-js';
import { css } from '../emotion-solid';

import { SamplerDevice } from '../engine/device/Sampler';
import { Slice } from '../engine/device/Slice';
import { Engine } from '../engine/Engine';
import { Track } from '../engine/Track';
import { SlicesDocument, TagsDocument } from './Slice.generated';

import { Column } from '../UI/Grid';
import { BrowserListItem } from './List';
import { fetchSliceUrlInfo } from 'renderer/engine/helpers';

export const Pagination = (
  allProps: {
    numberOfPages: number;
    currentPage: number;
    onCurrentPageChanged: (currentPage: number) => void;
  } & JSX.IntrinsicElements['ul']
) => {
  const [props, ulProps] = splitProps(allProps, [
    'numberOfPages',
    'currentPage',
    'onCurrentPageChanged',
  ]);

  const pageButtonStyles = css`
    cursor: pointer;
    list-style: none;
  `;

  const pages = createMemo(() =>
    Array.from({ length: props.numberOfPages }).map((_, index) => index + 1)
  );

  const setCurrentPageClamped = (page: number) => {
    props.onCurrentPageChanged(
      Math.max(Math.min(page, props.numberOfPages), 0)
    );
  };

  return (
    <ul
      hidden={pages().length < 2}
      {...ulProps}
      class={css`
        display: flex;
        align-items: center;
        justify-content: center;
      `}
    >
      <div
        class={pageButtonStyles}
        onClick={() => setCurrentPageClamped(props.currentPage - 1)}
      >
        {'<'}
      </div>
      <For each={pages()}>
        {(page) => {
          return (
            <li
              class={pageButtonStyles}
              onClick={() => props.onCurrentPageChanged(page)}
            >
              {page}
            </li>
          );
        }}
      </For>
      <a
        class={pageButtonStyles}
        onClick={() => setCurrentPageClamped(props.currentPage + 1)}
      >
        {'>'}
      </a>
    </ul>
  );
};

export const FindSlicesPanel = (props: { engine: Engine }) => {
  const [tagNames, setTagnames] = createSignal<string[]>([]);

  const [tagsPage, setTagsPage] = createSignal(1);
  const tagsData = createQuery(TagsDocument, () => ({
    variables: { page: tagsPage() },
  }));
  type Slice = NonNullable<
    ReturnType<ReturnType<typeof fetchPage>>
  >['slices']['items'][number];

  const [selectedResult, setSelectedResult] = createSignal<Slice>();

  const [sourceInfo] = createResource(
    () => selectedResult(),
    (result) => {
      return fetchSliceUrlInfo(result.sourceUrl);
    }
  );

  const fetchPage = (page: number) => {
    console.log(page);
    return createQuery(SlicesDocument, () => ({
      variables: {
        page,
        tagNames: tagNames().length ? tagNames() : null,
      },
    }));
  };

  const fetchNextPage = () => {
    setResultPages([...resultPages(), fetchPage(resultPages().length + 1)]);
  };

  const [resultPages, setResultPages] = createSignal<
    ReturnType<typeof fetchPage>[]
  >([]);

  fetchNextPage();

  let playerRef: HTMLAudioElement | undefined;

  return (
    <Column overflow={'hidden'} flex={1}>
      <ul>
        <For each={tagsData()?.tags.items}>
          {(tag) => {
            return (
              <li
                classList={{
                  [css`
                    display: inline-block;
                    padding: 3px;
                    margin: 3px;

                    border-radius: 2px;
                    cursor: pointer;
                  `]: true,
                  [css`
                    background-color: darkgray;
                  `]: tagNames().includes(tag.name),
                }}
                onClick={() => {
                  if (tagNames().includes(tag.name)) {
                    setTagnames(tagNames().filter((name) => name !== tag.name));
                  } else {
                    setTagnames([...tagNames(), tag.name]);
                  }
                }}
              >
                {tag.name}
              </li>
            );
          }}
        </For>
      </ul>
      <Pagination
        currentPage={tagsPage()}
        onCurrentPageChanged={setTagsPage}
        numberOfPages={tagsData()?.tags.numberOfPages ?? 0}
      />
      <Column
        flex={1}
        overflowY={'auto'}
        overflowX={'hidden'}
        class={css`
          margin-top: 10px;
        `}
        onScroll={(event) => {
          const { scrollTop, scrollHeight, clientHeight } = event.currentTarget;

          const percentScrolled = scrollTop / (scrollHeight - clientHeight);
          const numberOfPages = resultPages().length;

          const lastPage = resultPages()[numberOfPages - 1];

          if (percentScrolled > 1 - 0.5 / numberOfPages && lastPage?.()) {
            fetchNextPage();
          }
        }}
      >
        <ul
          class={css`
            flex: 1;
            display: flex;
            overflow: auto;
            flex-direction: column;
          `}
        >
          <For each={resultPages()}>
            {(slicesData) => (
              <For each={slicesData()?.slices.items}>
                {(slice) => {
                  return (
                    <BrowserListItem
                      name={slice.title}
                      thumbnail={''}
                      isSelected={slice === selectedResult()}
                      onSelect={() => {
                        if (selectedResult() === slice) {
                          if (playerRef?.paused) {
                            playerRef?.play();
                          } else {
                            playerRef?.pause();
                          }
                        }
                        setSelectedResult(slice);
                      }}
                      onAdd={async () => {
                        const {
                          sourceUrl,
                          id,
                          start,
                          end,
                          title,
                          playbackSpeed,
                          reverse,
                        } = slice;
                        const track =
                          props.engine.findTrack(
                            (track) =>
                              !!track.chain.findDevice(
                                (device) =>
                                  device instanceof SamplerDevice &&
                                  device.url === sourceUrl
                              )
                          ) ??
                          props.engine.createTrack(
                            Track.normalizeData({
                              chain: {
                                name: 'DeviceChain',
                                devices: [{ name: 'Sampler', url: sourceUrl }],
                              },
                            })
                          );

                        const sampler = track.chain.findDevice(
                          (device): device is SamplerDevice =>
                            device instanceof SamplerDevice
                        ) as SamplerDevice;

                        await sampler.hasLoaded();

                        sampler.createSlice(
                          Slice.normalizeData({
                            id,
                            name: title,
                            start,
                            end,
                            playbackRate: playbackSpeed,
                            reverse,
                          })
                        );
                      }}
                    />
                  );
                }}
              </For>
            )}
          </For>
        </ul>
      </Column>

      <Show when={sourceInfo()}>
        {(item) => (
          <audio
            ref={playerRef}
            muted={false}
            autoplay
            preload="metadata"
            controls
          >
            <source
              src={`${item.sourceUrl}#t=${selectedResult()?.start ?? 0},${
                selectedResult()?.end ?? 0
              }`}
            ></source>
          </audio>
        )}
      </Show>
    </Column>
  );
};
