import { createSignal, JSX, Show, splitProps } from 'solid-js';

import { Slice } from '../engine/device/Slice';
import { subdivisions, subdivisionTypes } from '../engine/types';
import { Sequencer } from './Sequencer';

import { SelectWithArrowButtons } from '../UI/SelectWithArrowButtons';
import { NumberInputWithArrowButtons } from '../UI/NumberInputWithArrowButtons';
import { ScreenPrintBackground } from '../UI/ScreenPrintBackground';
import { ButtonWithLabel } from '../UI/ButtonWithLabel';
import { Column, Flex, Row } from '../UI/Grid';
import { css } from '@emotion/css';
import { SequencerMode, sequencerModes } from './SequencerStep';
import {
  FollowupAction,
  followupActionTypes,
  normalizeFollowupActionData,
} from 'renderer/engine/device/Patttern';
import {
  createSignalFromEventEmitter,
  createStoreFromEventEmitter,
} from 'renderer/engine/EngineBase';

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
  } & JSX.IntrinsicElements['div']
) => {
  const [props, divProps] = splitProps(allProps, ['slice']);

  const sliceState = createStoreFromEventEmitter(
    () => props.slice,
    (slice) => ({
      collapsed: slice.collapsed,
      numberOfPatterns: slice.patterns.length,
      autoSelectPattern: slice.autoSelectPattern,
      selectedPatternIndex: slice.autoSelectPattern
        ? slice.currentPatternIndex
        : slice.selectedPatternIndex,
    }),
    [
      'collapsedUpdated',
      'patternAdded',
      'patternRemoved',
      'autoSelectPatternUpdated',
      'selectedPatternIndexUpdated',
    ]
  );

  const selectedPattern = createSignalFromEventEmitter(
    () => props.slice,
    (slice) => slice.patterns[sliceState.selectedPatternIndex],
    ['patternAdded', 'patternRemoved', 'patternUpdated']
  );

  const selectedPatternState = createSignalFromEventEmitter(
    selectedPattern,
    (pattern) => ({
      subdivision: pattern?.subdivision,
      subdivisionType: pattern?.subdivisionType,
      followupAction: pattern?.followupAction,
      steps: pattern?.steps,
    }),
    ['change']
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
      <Column>
        <ScreenPrintBackground
          hidden={sliceState.collapsed}
          background={'rgba(255,255,255,0.2)'}
        >
          <Row
            class={css`
              margin: 10px;
            `}
          >
            <ButtonWithLabel
              label={'Clone'}
              labelOnButton={true}
              onClick={() => {
                props.slice.createPattern(
                  selectedPattern().serialize(),
                  sliceState.selectedPatternIndex + 1
                );
              }}
            />
            <ButtonWithLabel
              label={'Delete'}
              labelOnButton={true}
              onClick={() => {
                selectedPattern().remove();
              }}
            />
            <ButtonWithLabel
              label={'Duplicate'}
              labelOnButton={true}
              onClick={() => {
                props.slice.getPattern()?.set({
                  steps: [
                    ...selectedPatternState().steps,
                    ...selectedPatternState().steps.map((step) => ({
                      ...step,
                    })),
                  ],
                });
              }}
            />

            <NumberInputWithArrowButtons
              label={'Steps'}
              size={4}
              step={1}
              min={1}
              max={1024}
              value={selectedPatternState()?.steps?.length}
              onChange={(length) => {
                selectedPattern().setLength(length);
              }}
            />
            <SelectWithArrowButtons
              label={'Div'}
              size={2}
              options={subdivisions}
              selectedOption={selectedPatternState()?.subdivision ?? 16}
              onChange={(subdivision) => {
                selectedPattern()?.set({ subdivision });
              }}
            />
            <SelectWithArrowButtons
              size={2}
              label={'Type'}
              options={[...subdivisionTypes]}
              selectedOption={
                selectedPatternState()?.subdivisionType ?? 'n' ?? 16
              }
              onChange={(subdivisionType) => {
                selectedPattern()?.set({ subdivisionType });
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
        </ScreenPrintBackground>

        <ScreenPrintBackground
          hidden={sliceState.collapsed}
          background={'rgba(255,255,255,0.2)'}
        >
          <Row
            class={css`
              margin: 10px;
            `}
          >
            <FollowupActionControls
              numberOfPatterns={sliceState.numberOfPatterns}
              followupAction={selectedPatternState().followupAction}
              onChange={(followupAction) => {
                selectedPattern()?.set({
                  followupAction: normalizeFollowupActionData({
                    ...selectedPatternState().followupAction,
                    ...followupAction,
                  }),
                });
              }}
            />
          </Row>
        </ScreenPrintBackground>
      </Column>
      <Show when={selectedPattern()}>
        <ScreenPrintBackground background={'rgba(255,255,255,0.2)'}>
          <Sequencer
            mode={selectedMode()}
            steps={selectedPatternState().steps}
            onChange={(steps) => {
              console.log(steps);
              selectedPattern()?.set({ steps });
            }}
            slice={props.slice}
          />
        </ScreenPrintBackground>
      </Show>
    </Flex>
  );
};

export const FollowupActionControls = (props: {
  followupAction?: FollowupAction;
  onChange: (followupAction?: Partial<FollowupAction>) => void;
  numberOfPatterns: number;
}) => {
  return (
    <>
      <SelectWithArrowButtons
        size={5}
        label={'Follow Action'}
        options={[...followupActionTypes]}
        selectedOption={props.followupAction?.type ?? 'no'}
        onChange={(type) => {
          props.onChange({ type });
        }}
      />

      <Show when={props.followupAction}>
        {(followupAction) => {
          return (
            <>
              <Show when={followupAction.type !== 'no'}>
                <ButtonWithLabel
                  label={'Linked'}
                  labelOnButton
                  activated={followupAction.linked}
                  onClick={() => {
                    props.onChange({
                      linked: !followupAction.linked,
                    });
                  }}
                />
              </Show>
              <Show when={!followupAction.linked && followupAction}>
                {(followupAction) => (
                  <NumberInputWithArrowButtons
                    label={'Time'}
                    size={4}
                    step={1}
                    min={0}
                    max={1024}
                    value={followupAction.triggerTime}
                    onChange={(triggerTime) => {
                      props.onChange({ triggerTime });
                    }}
                  />
                )}
              </Show>
              <Show when={followupAction.linked && followupAction}>
                {(followupAction) => (
                  <NumberInputWithArrowButtons
                    label={'Multiplicator'}
                    size={4}
                    step={1}
                    min={0}
                    max={32}
                    value={followupAction.multiplicator}
                    onChange={(multiplicator) => {
                      props.onChange({ multiplicator });
                    }}
                  />
                )}
              </Show>
              <Show when={followupAction.type === 'jump' && followupAction}>
                {(followupAction) => (
                  <NumberInputWithArrowButtons
                    label={'Target'}
                    size={4}
                    step={1}
                    min={0}
                    max={props.numberOfPatterns - 1}
                    value={followupAction.targetIndex}
                    onChange={(targetIndex) => {
                      props.onChange({ targetIndex });
                    }}
                  />
                )}
              </Show>
            </>
          );
        }}
      </Show>
    </>
  );
};
