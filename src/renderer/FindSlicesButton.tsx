import { createQuery, gql } from '@merged/solid-apollo';
import Dismiss from 'solid-dismiss';
import { createSignal, For } from 'solid-js';
import { css } from 'solid-styled-components';

import { Engine } from './engine/Engine';

import { ButtonWithLabel } from './UI';

type PaginatedList<T> = {
  page: number;
  numberOfPages: number;
  totalNumberOfItems: number;
  itemsPerPage: number;
  items: T[];
};

export const FindSlicesButton = (props: { engine: Engine }) => {
  const [open, setOpen] = createSignal(false);
  const [tagNames, setTagnames] = createSignal<string[]>([]);

  const [tagsPage, setTagsPage] = createSignal(1);
  const [slicesPage, setSlicesPage] = createSignal(1);
  const tagsData = createQuery<{ tags: PaginatedList<{ name: string }> }>(
    gql`
      query Tags($page: Int!) {
        tags(page: $page) {
          page
          numberOfPages
          totalNumberOfItems
          itemsPerPage
          items {
            name
          }
        }
      }
    `,
    () => ({ skip: !open(), variables: { page: tagsPage() } })
  );

  const slicesData = createQuery<{
    slices: PaginatedList<{
      id: string;
      title: string;
      sourceUrl: string;
      start: number;
      end: number;
    }>;
  }>(
    gql`
      query Slices($page: Int!, $tagNames: [String!]) {
        slices(page: $page, tags: $tagNames) {
          page
          numberOfPages
          totalNumberOfItems
          itemsPerPage
          items {
            id
            title
            sourceUrl
            start
          }
        }
      }
    `,
    () => ({
      skip: !open(),
      variables: {
        page: slicesPage(),
        tagNames: tagNames().length ? tagNames() : null,
      },
    })
  );

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
                        const { sourceUrl, id, start, end, title } = slice;
                        const sampler =
                          props.engine.getSampler(sourceUrl) ??
                          props.engine.createSampler({
                            url: sourceUrl,
                            zoom: 1,
                            slices: [],
                          });

                        await sampler.hasLoaded();

                        sampler.createChain({
                          id,
                          name: title,
                          start,
                          end,
                          collapsed: false,
                          color: 'red',
                          patterns: [],
                          playbackSpeed: 1,
                          reverse: false,
                          solo: false,
                          volume: 1,
                        });
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
        </div>
      </Dismiss>
    </div>
  );
};
