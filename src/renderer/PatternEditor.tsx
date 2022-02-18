import { createMemo, For, untrack, JSX, splitProps } from 'solid-js';

import {
  createSignalFromEventEmitter,
  createStoreFromEventEmitter,
} from './createSignalFromEventEmitter';
import { SamplerDevice } from './engine/device/Sampler';
import { Pattern, Slice } from './engine/device/Slice';
import { subdivisions, subdivisionTypes } from './engine/types';
import { Sequencer } from './Device/Sequencer';

import { ScreenPrintBackground } from './UI';
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
      <input
        type="number"
        step={1}
        min={1}
        max={1024}
        value={currentPattern()?.steps?.length}
        onChange={(event) => {
          props.slice.updatePatternLength(
            props.currentPatternIndex,
            event.currentTarget.valueAsNumber
          );
        }}
      />
      <select
        value={currentPattern()?.subdivision ?? 16}
        onChange={(event) => {
          props.slice.updatePattern(props.currentPatternIndex, {
            subdivision: +event.currentTarget.value,
          });
        }}
      >
        <For each={subdivisions}>
          {(subdivision) => <option value={subdivision}>{subdivision}</option>}
        </For>
      </select>
      <select
        value={currentPattern()?.subdivisionType ?? 'n'}
        onChange={(event) => {
          props.slice.updatePattern(props.currentPatternIndex, {
            subdivisionType: event.currentTarget
              .value as Pattern['subdivisionType'],
          });
        }}
      >
        <For each={subdivisionTypes}>
          {(subdivisionType) => (
            <option value={subdivisionType}>{subdivisionType}</option>
          )}
        </For>
      </select>

      <ScreenPrintBackground background={sliceState.color}>
        <Sequencer
          steps={currentPattern().steps}
          onChange={(steps) => {
            props.slice.updatePattern(props.currentPatternIndex, {
              steps,
            });
          }}
          slice={props.slice}
        />{' '}
      </ScreenPrintBackground>
    </Row>
  );
};
