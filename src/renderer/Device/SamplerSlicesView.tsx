import { css } from 'renderer/emotion-solid';
import { SamplerDevice } from 'renderer/engine/device/Sampler';
import { Slice } from 'renderer/engine/device/Slice';
import { For } from 'solid-js';
import { SamplerSliceView } from './SamplerSliceView';

export const SamplerSlicesView = (props: {
  sampler: SamplerDevice;
  onClickSlice?: (slice: Slice) => void;
}) => {
  const slices = props.sampler.createSignal(
    (sampler) => sampler.slices,
    ['sliceAdded', 'sliceRemoved', 'sliceUpdated']
  );

  const selectedSlice = props.sampler.createSignal(
    (sampler) => sampler.selectedSlice,
    'sliceSelected'
  );

  const currentPatternIndex = props.sampler.engine.createSignal(
    (engine) => engine.currentPatternIndex,
    'currentPatternIndexUpdated'
  );

  return (
    <div
      style={{
        borderBottom: '1px solid #222',
        boxShadow: '0px 0px 3px #222',
        flex: 1,
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
              currentPatternIndex={currentPatternIndex()}
              onClickSlice={(slice: Slice) => props.sampler.selectSlice(slice)}
              onRemoveSlice={(slice: Slice) => props.sampler.removeSlice(slice)}
            />
          )}
        </For>
      </ol>
    </div>
  );
};
