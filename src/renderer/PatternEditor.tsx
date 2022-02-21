import { createMemo, For, JSX, splitProps } from 'solid-js';

import { SamplerDevice } from './engine/device/Sampler';
import { Slice } from './engine/device/Slice';
import { subdivisions, subdivisionTypes } from './engine/types';
import { Sequencer } from './Device/Sequencer';

import {
  NumberInputWithArrowButtons,
  ScreenPrintBackground,
  SelectWithArrowButtons,
} from './UI';
import { Row } from './Grid';

export const PatternEditor = (
  allProps: {
    sampler: SamplerDevice;
    collapsed: boolean;
  } & JSX.IntrinsicElements['div']
) => {
  const [props, divProps] = splitProps(allProps, ['sampler']);
  const slices = props.sampler.createSignal(
    (sampler) => sampler.getSlices(),
    ['sliceAdded', 'sliceRemoved']
  );

  const currentPatternIndex = props.sampler.engine.createSignal(
    (engine) => engine.currentPatternIndex,
    ['currentPatternIndexUpdated']
  );

  return (
    <div {...divProps}>
      <For each={slices()} fallback={<div>loading slices..</div>}>
        {(slice) => (
          <SlicePattern
            slice={slice}
            currentPatternIndex={currentPatternIndex()}
          />
        )}
      </For>
    </div>
  );
};

export const SlicePattern = (
  allProps: {
    slice: Slice;
    currentPatternIndex: number;
  } & JSX.IntrinsicElements['div']
) => {
  const [props, divProps] = splitProps(allProps, [
    'slice',
    'currentPatternIndex',
  ]);
  const sliceState = props.slice.createStore(
    (slice) => slice.serialize(),
    'change'
  );

  const patterns = props.slice.createSignal(
    (slice) => slice.patterns,
    'patternsUpdated'
  );

  const currentPattern = createMemo(
    () => patterns()[props.currentPatternIndex]
  );

  return (
    <Row {...divProps}>
      <NumberInputWithArrowButtons
        label={'Steps'}
        size={4}
        step={1}
        min={1}
        max={1024}
        value={currentPattern()?.steps?.length}
        onChange={(length) => {
          props.slice.updatePatternLength(props.currentPatternIndex, length);
        }}
      />
      <SelectWithArrowButtons
        label={'Div'}
        size={2}
        options={subdivisions}
        selectedOption={currentPattern()?.subdivision ?? 16}
        onChange={(subdivision) => {
          props.slice.updatePattern(props.currentPatternIndex, {
            subdivision,
          });
        }}
      />
      <SelectWithArrowButtons
        size={2}
        label={'Type'}
        options={[...subdivisionTypes]}
        selectedOption={currentPattern()?.subdivisionType ?? 'n' ?? 16}
        onChange={(subdivisionType) => {
          props.slice.updatePattern(props.currentPatternIndex, {
            subdivisionType,
          });
        }}
      />
      <ScreenPrintBackground background={'rgba(255,255,255,0.2)'}>
        <Sequencer
          steps={currentPattern().steps}
          onChange={(steps) => {
            props.slice.updatePattern(props.currentPatternIndex, {
              steps,
            });
          }}
          slice={props.slice}
        />
      </ScreenPrintBackground>
    </Row>
  );
};
