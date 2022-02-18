import { createMemo, For, untrack, JSX, splitProps } from 'solid-js';

import {
  createSignalFromEventEmitter,
  createStoreFromEventEmitter,
} from './createSignalFromEventEmitter';
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
  allProps: { sampler: SamplerDevice } & JSX.IntrinsicElements['div']
) => {
  const [props, divProps] = splitProps(allProps, ['sampler']);
  const slices = createSignalFromEventEmitter(
    untrack(() => props.sampler),
    ['sliceAdded', 'sliceRemoved'],
    (sampler) => sampler.getSlices()
  );

  const currentPatternIndex = createSignalFromEventEmitter(
    untrack(() => props.sampler.engine),
    ['currentPatternIndexUpdated'],
    (engine) => engine.currentPatternIndex
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
  const sliceState = createStoreFromEventEmitter(
    untrack(() => props.slice),
    ['change'],
    (slice) => slice.serialize()
  );

  const patterns = createSignalFromEventEmitter(
    () => props.slice,
    'patternsUpdated',
    (slice) => slice.patterns
  );

  const currentPattern = createMemo(
    () => patterns()[props.currentPatternIndex]
  );

  return (
    <Row {...divProps}>
      <NumberInputWithArrowButtons
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
        size={2}
        label={(subdivision) => subdivision.toString()}
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
        label={(subdivisionType) => subdivisionType}
        options={[...subdivisionTypes]}
        selectedOption={currentPattern()?.subdivisionType ?? 'n' ?? 16}
        onChange={(subdivisionType) => {
          props.slice.updatePattern(props.currentPatternIndex, {
            subdivisionType,
          });
        }}
      />
      <ScreenPrintBackground background={sliceState.color}>
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
