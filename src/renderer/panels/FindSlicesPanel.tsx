import { createQuery } from '@merged/solid-apollo';
import { createMemo, createSignal, For, JSX, splitProps } from 'solid-js';
import { css } from 'renderer/emotion-solid';

import { SamplerDevice } from '../engine/device/Sampler';
import { Slice } from '../engine/device/Slice';
import { Engine } from '../engine/Engine';
import { Track } from '../engine/Track';
import { SlicesDocument, TagsDocument } from './Slice.generated';
import { ButtonWithLabel } from '../UI/ButtonWithLabel';
import { Column } from '../UI/Grid';

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
    display: inline-block;
    cursor: pointer;
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
    <ul {...ulProps}>
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
  const [slicesPage, setSlicesPage] = createSignal(1);
  const tagsData = createQuery(TagsDocument, () => ({
    variables: { page: tagsPage() },
  }));

  const slicesData = createQuery(SlicesDocument, () => ({
    variables: {
      page: slicesPage(),
      tagNames: tagNames().length ? tagNames() : null,
    },
  }));

  return (
    <Column
      class={css`
        flex: 1;
        background-color: gray;
      `}
    >
      Tags:{' '}
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
      <ul
        class={css`
          flex: 1;
          display: flex;
          overflow: auto;
          flex-direction: column;
        `}
      >
        <For each={slicesData()?.slices.items}>
          {(slice) => {
            return (
              <li
                classList={{
                  [css`
                    display: flex;
                    cursor: pointer;
                  `]: true,
                }}
              >
                <div
                  class={css`
                    flex: 1;
                    padding: 5px;
                  `}
                >
                  {slice.title}
                </div>
                <div>
                  <ButtonWithLabel
                    label="+"
                    labelOnButton
                    onClick={async () => {
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
                </div>
              </li>
            );
          }}
        </For>
      </ul>
      <Pagination
        currentPage={slicesPage()}
        onCurrentPageChanged={setSlicesPage}
        numberOfPages={slicesData()?.slices.numberOfPages ?? 0}
      />
    </Column>
  );
};
