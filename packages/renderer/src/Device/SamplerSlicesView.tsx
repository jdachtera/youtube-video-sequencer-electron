import { css } from '@emotion/css';
import { For } from 'solid-js';
import { createSignalFromEventEmitter } from '../engine/EngineBase';
import type { SamplerDevice } from '../engine/device/Sampler';
import type { Slice } from '../engine/device/Slice';
import { SamplerSliceView } from './SamplerSliceView';

export const SamplerSlicesView = (props: {
  sampler: SamplerDevice;
  onClickSlice?: (slice: Slice) => void;
}) => {
  const slices = createSignalFromEventEmitter(
    () => props.sampler,
    (sampler) => sampler.slices,
    ['sliceAdded', 'sliceRemoved', 'sliceUpdated'],
  );

  const selectedSlice = createSignalFromEventEmitter(
    () => props.sampler,
    (sampler) => sampler.selectedSlice,
    'sliceSelected',
  );

  return (
    <div
      style={{
        'border-bottom': '1px solid #222',
        'box-shadow': '0px 0px 3px #222',
        flex: '1',
      }}
    >
      <ol
        class={css`
          font-size: 10px;
          box-shadow: inset 0px 0px 8px black;
          border-radius: 5px;
          background-color: #111;
        `}
      >
        <For each={slices()}>
          {(slice) => (
            <SamplerSliceView
              slice={slice}
              isSelected={slice === selectedSlice()}
              onClickSlice={(slice: Slice) => props.sampler.selectSlice(slice)}
              onRemoveSlice={(slice: Slice) => {
                if (!confirm('Do you wish to remove this Slice?')) return;
                props.sampler.removeSlice(slice);
              }}
            />
          )}
        </For>
      </ol>
    </div>
  );
};
