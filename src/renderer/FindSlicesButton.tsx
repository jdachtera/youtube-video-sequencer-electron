import { createQuery } from '@merged/solid-apollo';
import Dismiss from 'solid-dismiss';
import { createMemo, createSignal, For, JSX, splitProps } from 'solid-js';
import { css } from 'solid-styled-components';
import { Sampler, SerializedSampler } from './engine/device/Sampler';

import { Engine } from './engine/Engine';
import { normalizeSliceData } from './engine/normalizeData';
import { SlicesDocument, TagsDocument } from './Slice.generated';

import { ButtonWithLabel } from './UI';

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

export const FindSlicesButton = (props: { engine: Engine }) => {
  const [open, setOpen] = createSignal(false);
  const [tagNames, setTagnames] = createSignal<string[]>([]);

  const [tagsPage, setTagsPage] = createSignal(1);
  const [slicesPage, setSlicesPage] = createSignal(1);
  const tagsData = createQuery(TagsDocument, () => ({
    skip: !open(),
    variables: { page: tagsPage() },
  }));

  const slicesData = createQuery(SlicesDocument, () => ({
    skip: !open(),
    variables: {
      page: slicesPage(),
      tagNames: tagNames().length ? tagNames() : null,
    },
  }));

  let btnEl;

  return (
    <div style="position: relative;">
      <ButtonWithLabel ref={btnEl} label="Find Slice" />

      <Dismiss menuButton={btnEl} open={open} setOpen={setOpen} cursorKeys>
        <div
          class={css`
            background: rgba(255, 255, 255, 0.8);
            border-radius: 5px;
            border: 1px black solid;
            padding: 10px;
            position: absolute;
            z-index: 1000;
            box-shadow: 4px 4px 8px 4px rgba(0, 0, 0, 0.4);
            color: black;
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
                        background-color: gray;
                        border-radius: 2px;
                        cursor: pointer;
                      `]: true,
                      [css`
                        background-color: darkgray;
                      `]: tagNames().includes(tag.name),
                    }}
                    onClick={() => {
                      if (tagNames().includes(tag.name)) {
                        setTagnames(
                          tagNames().filter((name) => name !== tag.name)
                        );
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
          <ul>
            <For each={slicesData()?.slices.items}>
              {(slice) => {
                return (
                  <li>
                    <button
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
                                  device instanceof Sampler &&
                                  device.url === sourceUrl
                              )
                          ) ??
                          props.engine.createTrack({
                            chain: {
                              name: 'DeviceChain',
                              volume: 1,
                              inputGain: 1,
                              devices: [
                                {
                                  name: 'Sampler',
                                  url: sourceUrl,
                                  zoom: 1,
                                  inputGain: 1,
                                  volume: 1,
                                  slices: [],
                                },
                              ],
                            },
                          });

                        const sampler = track.chain.findDevice(
                          (device): device is Sampler =>
                            device instanceof Sampler
                        ) as Sampler;

                        await sampler.hasLoaded();

                        sampler.createSlice(
                          normalizeSliceData({
                            id,
                            name: title,
                            start,
                            end,
                            playbackSpeed,
                            reverse,
                          })
                        );
                        setOpen(false);
                      }}
                    >
                      Add "{slice.title}" to project
                    </button>
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
        </div>
      </Dismiss>
    </div>
  );
};
