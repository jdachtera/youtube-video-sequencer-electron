import { createMutation, gql } from '@merged/solid-apollo';
import Dismiss from 'solid-dismiss';
import { createSignal, onCleanup, onMount, Show, untrack } from 'solid-js';
import { css } from 'solid-styled-components';

import { useIsLoggedIn } from './auth';
import { SliceChain } from './engine/SliceChain';
import { ButtonWithLabel } from './UI';

const useSlice = (chain: SliceChain) => {
  const [slice, setSlice] = createSignal(chain.getSlice());

  const handleChange = () => setSlice(chain.getSlice());

  onMount(() => chain.on('chain-updated', handleChange));
  onCleanup(() => chain.off('chain-updated', handleChange));
  return slice;
};

export const ShareSliceButton = (props: { chain: SliceChain }) => {
  const slice = useSlice(untrack(() => props.chain));
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
      <ButtonWithLabel ref={btnEl} label="Share" />

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
            Name:
            <input
              type="text"
              value={slice().name}
              onInput={(event) => {
                props.chain.setSlice({
                  ...slice(),
                  name: event.currentTarget.value,
                });
              }}
            />
            Tags:
            <input
              type="text"
              value={tagNames().join(',')}
              onInput={(event) =>
                setTagnames(event.currentTarget.value.split(','))
              }
            />
            <button
              onClick={async () => {
                if (!slice().name) {
                  alert('Please enter a name before sharing the slcie');
                  return;
                }

                if (tagNames().length < 2) {
                  alert(
                    'Please enter at least two tags before sharing the slcie'
                  );
                  return;
                }

                await mutate({
                  variables: {
                    data: {
                      title: slice().name,
                      sourceUrl: props.chain.getSampler().url,
                      start: slice().start,
                      end: slice().end,
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
