import { createMemo, createSignal, For, JSX, splitProps } from 'solid-js';

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
import { SequencerMode, sequencerModes } from './SequencerStep';

const sequencerModeLabels = {
  play: '▶',
  pitch: '♪',
  playbackRate: '↠',
  volume: '📢',
  reverse: '↶',
};

export const PatternEditor = (
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

  const [selectedMode, setSelectedMode] = createSignal<SequencerMode>('play');

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
          label={'Clone'}
          labelOnButton={true}
          onClick={() =>
            props.slice.set({
              patterns: [
                ...patterns().slice(0, props.currentPatternIndex + 1),
                {
                  ...currentPattern(),
                  steps: currentPattern().steps.map((step) => ({ ...step })),
                },
                ...patterns().slice(props.currentPatternIndex + 2),
              ],
              currentPatternIndex: sliceState.currentPatternIndex + 1,
            })
          }
        />
        <ButtonWithLabel
          label={'Delete'}
          labelOnButton={true}
          onClick={() =>
            props.slice.set({
              currentPatternIndex: Math.max(
                sliceState.currentPatternIndex - 1,
                0
              ),
              patterns: [
                ...patterns().slice(0, props.currentPatternIndex),
                ...patterns().slice(props.currentPatternIndex + 1),
              ],
            })
          }
        />
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
          label={'Pattern'}
          size={2}
          step={1}
          min={0}
          max={patterns().length + 1}
          value={props.currentPatternIndex}
          onChange={(currentPatternIndex) => {
            props.slice.set({ currentPatternIndex });
          }}
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
        <SelectWithArrowButtons
          size={1}
          options={sequencerModes}
          selectedOption={selectedMode()}
          optionLabel={(mode) => sequencerModeLabels[mode]}
          onChange={setSelectedMode}
        />
      </Row>
      <ScreenPrintBackground background={'rgba(255,255,255,0.2)'}>
        <Sequencer
          mode={selectedMode()}
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
