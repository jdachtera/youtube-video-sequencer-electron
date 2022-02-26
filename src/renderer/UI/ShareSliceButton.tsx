import { createMutation } from '@merged/solid-apollo';
import Dismiss from 'solid-dismiss';
import { createSignal, Show } from 'solid-js';
import { css } from '../emotion-solid';

import { useIsLoggedIn } from '../auth';

import { Slice } from '../engine/device/Slice';
import { AddSliceDocument } from '../panels/Slice.generated';
import { ButtonWithLabel } from './ButtonWithLabel';
import { createStoreFromEventEmitter } from 'renderer/engine/EngineBase';

export const ShareSliceButton = (props: { slice: Slice }) => {
  const slice = createStoreFromEventEmitter(
    () => props.slice,
    (slice) => slice.serialize(),
    'change'
  );

  const isLoggedIn = useIsLoggedIn();

  const [mutate] = createMutation(AddSliceDocument);

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
              value={slice.name}
              onInput={(event) => {
                props.slice.set({ name: event.currentTarget.value });
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
                if (!slice.name) {
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
                      title: slice.name,
                      sourceUrl: props.slice.sampler.url,
                      start: slice.start,
                      end: slice.end,
                      reverse: slice.reverse,
                      playbackSpeed: slice.playbackRate,
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
