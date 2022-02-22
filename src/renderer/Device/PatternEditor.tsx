import { createMemo, For, JSX, splitProps } from 'solid-js';

import { SamplerDevice } from '../engine/device/Sampler';
import { Slice } from '../engine/device/Slice';
import { subdivisions, subdivisionTypes } from '../engine/types';
import { Sequencer } from './Sequencer';

import { SelectWithArrowButtons } from '../UI/SelectWithArrowButtons';
import { NumberInputWithArrowButtons } from '../UI/NumberInputWithArrowButtons';
import { ScreenPrintBackground } from '../UI/ScreenPrintBackground';
import { ButtonWithLabel } from '../UI/ButtonWithLabel';
import { Flex, Row } from '../UI/Grid';
import { css } from '@emotion/css';

export const PatternEditor = (
  allProps: {
    sampler: SamplerDevice;
    collapsed: boolean;
  } & JSX.IntrinsicElements['div']
) => {
  const [props, divProps] = splitProps(allProps, ['sampler']);
  const slices = props.sampler.createSignal(
    (sampler) => sampler.slices,
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
    <Flex
      {...divProps}
      classList={{
        [css`
          flex-direction: ${sliceState.collapsed ? 'row' : 'column'};
        `]: true,
      }}
    >
      <Row
        classList={{
          [css`
            margin: 10px;
          `]: !sliceState.collapsed,
        }}
      >
        <ButtonWithLabel
          label={'Duplicate'}
          labelOnButton={true}
          onClick={() =>
            props.slice.updatePattern(props.currentPatternIndex, {
              steps: [
                ...currentPattern().steps,
                ...currentPattern().steps.map((step) => ({ ...step })),
              ],
            })
          }
        />
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
      </Row>
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
    </Flex>
  );
};
