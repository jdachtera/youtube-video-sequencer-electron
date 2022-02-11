import { createMutation, gql } from '@merged/solid-apollo';
import Dismiss from 'solid-dismiss';
import { createSignal, Show } from 'solid-js';
import { css } from 'solid-styled-components';

import { useIsLoggedIn } from './auth';
import { SliceChain } from './engine/SliceChain';
import { ButtonWithLabel } from './UI';

export const ShareSliceButton = (props: { chain: SliceChain }) => {
  const isLoggedIn = useIsLoggedIn();
  const [mutate] = createMutation(gql`
    mutation AddSlice($data: CreateSliceInput!) {
      createSlice(data: $data) {
        id
        creator {
          id
        }

        title
        sourceUrl
        start
        end
        tags {
          name
        }
      }
    }
  `);

  const [open, setOpen] = createSignal(false);
  const [tagNames, setTagnames] = createSignal<string[]>([]);
  let btnEl;

  return (
    <div style="position: relative;">
      <ButtonWithLabel ref={btnEl} label="Share">
        Button
      </ButtonWithLabel>

      <Show when={isLoggedIn()}>
        <Dismiss menuButton={btnEl} open={open} setOpen={setOpen} cursorKeys>
          <div
            class={css`
              background: rgba(255, 255, 255, 0.8);
              border-radius: 5px;
              border: 1px black solid;
              padding: 10px;
              position: absolute;
              z-index: 10;
              box-shadow: 4px 4px 8px 4px rgba(0, 0, 0, 0.4);
              color: black;
            `}
          >
            Tags:{' '}
            <input
              type="text"
              value={tagNames().join(',')}
              onInput={(event) =>
                setTagnames(event.currentTarget.value.split(','))
              }
            />
            <button
              onClick={async () => {
                const slice = props.chain.getSlice();
                await mutate({
                  variables: {
                    data: {
                      title: slice.name,
                      sourceUrl: props.chain.getSampler().url,
                      start: slice.start,
                      end: slice.end,
                      tagNames: tagNames(),
                    },
                  },
                });

                setOpen(false);
              }}
            >
              Upload to Slice Cloud
            </button>
          </div>
        </Dismiss>
      </Show>
    </div>
  );
};
