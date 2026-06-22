import { css } from '@emotion/css';
import type { SequencerDevice } from 'engine/device/Sequencer';
import type { JSX } from 'solid-js';
import { createSignal, Show, splitProps } from 'solid-js';
import { ButtonWithLabel } from '../UI/ButtonWithLabel';
import { Column, Flex, Row } from '../UI/Grid';
import { NumberInputWithArrowButtons } from '../UI/NumberInputWithArrowButtons';
import { ScreenPrintBackground } from '../UI/ScreenPrintBackground';
import { SelectWithArrowButtons } from '../UI/SelectWithArrowButtons';
import {
  createSignalFromEventEmitter,
  createStoreFromEventEmitter,
} from '../engine/EngineBase';
import type { FollowupAction } from '../engine/device/Patttern';
import {
  followupActionTypes,
  normalizeFollowupActionData,
} from '../engine/device/Patttern';
import { randomMusicalNotes, randomMusicalSteps } from '../engine/randomize';
import { subdivisions, subdivisionTypes } from '../engine/types';
import { PianoRollView } from './PianoRollView';
import { Sequencer } from './Sequencer';
import type { SequencerMode } from './SequencerStep';
import { sequencerModes } from './SequencerStep';

const sequencerModeLabels: Record<typeof sequencerModes[number], string> = {
  play: '▶',
  pitch: '♪',
  playbackRate: '↠',
  volume: '📢',
  gateSeconds: '⏱',
  reverse: '↶',
};

// Less-used pattern actions (clone/delete/duplicate/random/clear/follow-action)
// live in a "⋯" overflow popover so a track row stays short.
const overflowContainer = css`
  position: relative;
  display: flex;
  align-items: flex-end;
`;

const overflowMenu = css`
  position: absolute;
  top: 100%;
  right: 0;
  z-index: 30;
  margin-top: 2px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 6px;
  border-radius: 6px;
  background: #2b2b2b;
  border: 1px solid rgba(0, 0, 0, 0.5);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.45);
`;

const overflowRow = css`
  display: flex;
  flex-wrap: wrap;
  gap: 3px;
  align-items: flex-end;
`;

export const PatternEditor = (
  allProps: {
    sequencer: SequencerDevice;
  } & JSX.IntrinsicElements['div'],
) => {
  const [props, divProps] = splitProps(allProps, ['sequencer']);

  const sequencerState = createStoreFromEventEmitter(
    () => props.sequencer,
    (sequencer) => ({
      collapsed: sequencer.collapsed,
      numberOfPatterns: sequencer.patterns.length,
      autoSelectPattern: sequencer.autoSelectPattern,
      selectedPatternIndex: sequencer.autoSelectPattern
        ? sequencer.currentPatternIndex
        : sequencer.selectedPatternIndex,
    }),
    [
      'collapsedUpdated',
      'patternAdded',
      'patternRemoved',
      'autoSelectPatternUpdated',
      'selectedPatternIndexUpdated',
    ],
  );

  const selectedPattern = createSignalFromEventEmitter(
    () => props.sequencer,
    (slice) => slice.patterns[sequencerState.selectedPatternIndex],
    ['patternAdded', 'patternRemoved', 'patternUpdated'],
  );

  const selectedPatternState = createSignalFromEventEmitter(
    selectedPattern,
    (pattern) => ({
      subdivision: pattern?.subdivision,
      subdivisionType: pattern?.subdivisionType,
      followupAction: pattern?.followupAction,
      steps: pattern?.steps,
      mode: pattern?.mode ?? 'steps',
      duration: pattern?.duration ?? 0,
      ppq: pattern?.ppq ?? 192,
      loopStart: pattern?.loopStart ?? 0,
      timeSignatureNumerator: pattern?.timeSignatureNumerator ?? 4,
      timeSignatureDenominator: pattern?.timeSignatureDenominator ?? 4,
    }),
    ['change'],
  );

  // Ticks in one bar at the pattern's time signature.
  const ticksPerBar = () =>
    (selectedPatternState().timeSignatureNumerator *
      (selectedPatternState().ppq || 192) *
      4) /
      (selectedPatternState().timeSignatureDenominator || 4) || 192 * 4;

  // Clip length in bars for piano-roll mode (the loop length), derived from the
  // pattern's tick duration.
  const lengthInBars = () =>
    Math.max(1, Math.round(selectedPatternState().duration / ticksPerBar()));

  const [selectedMode, setSelectedMode] = createSignal<SequencerMode>('play');
  const [showOverflow, setShowOverflow] = createSignal(false);

  return (
    <Flex
      {...divProps}
      classList={{
        [css`
          flex-direction: ${sequencerState.collapsed ? 'row' : 'column'};
        `]: true,
      }}
    >
      <Column>
        <ScreenPrintBackground
          hidden={sequencerState.collapsed}
          background={'rgba(255,255,255,0.2)'}
        >
          <Row
            class={css`
              margin: 3px 8px;
              flex-wrap: wrap;
              align-items: flex-end;
              gap: 2px;
            `}
          >
            <Show when={selectedPatternState().mode !== 'pianoroll'}>
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
              <ButtonWithLabel
                label="‹"
                labelOnButton={true}
                onClick={() => selectedPattern()?.rotate(-1)}
              />
              <ButtonWithLabel
                label="›"
                labelOnButton={true}
                onClick={() => selectedPattern()?.rotate(1)}
              />
            </Show>
            <Show when={selectedPatternState().mode === 'pianoroll'}>
              <NumberInputWithArrowButtons
                label={'Bars'}
                size={3}
                step={1}
                min={1}
                max={64}
                value={lengthInBars()}
                onChange={(bars) => {
                  selectedPattern()?.set({
                    duration: Math.max(1, Math.round(bars)) * ticksPerBar(),
                  });
                }}
              />
              <span
                class={css`
                  display: flex;
                  align-items: flex-end;
                  gap: 2px;
                `}
              >
                <NumberInputWithArrowButtons
                  label={'Sig'}
                  size={2}
                  step={1}
                  min={1}
                  max={32}
                  value={selectedPatternState().timeSignatureNumerator}
                  onChange={(timeSignatureNumerator) => {
                    selectedPattern()?.set({
                      timeSignatureNumerator: Math.max(
                        1,
                        Math.round(timeSignatureNumerator),
                      ),
                    });
                  }}
                />
                <span
                  class={css`
                    padding-bottom: 3px;
                  `}
                >
                  /
                </span>
                <SelectWithArrowButtons
                  size={2}
                  options={[1, 2, 4, 8, 16]}
                  selectedOption={
                    selectedPatternState().timeSignatureDenominator
                  }
                  onChange={(timeSignatureDenominator) => {
                    selectedPattern()?.set({ timeSignatureDenominator });
                  }}
                />
              </span>
            </Show>
            <ButtonWithLabel
              label={
                selectedPatternState().mode === 'pianoroll'
                  ? '▦ Steps'
                  : '♪ Piano'
              }
              labelOnButton={true}
              activated={selectedPatternState().mode === 'pianoroll'}
              onClick={() => {
                selectedPattern()?.set({
                  mode:
                    selectedPatternState().mode === 'pianoroll'
                      ? 'steps'
                      : 'pianoroll',
                });
              }}
            />
            <div class={overflowContainer}>
              <ButtonWithLabel
                label="⋯"
                labelOnButton={true}
                title="More pattern actions"
                activated={showOverflow()}
                onClick={() => setShowOverflow((open) => !open)}
              />
              <Show when={showOverflow()}>
                <div class={overflowMenu}>
                  <div class={overflowRow}>
                    <ButtonWithLabel
                      label={'Clone'}
                      labelOnButton={true}
                      onClick={() => {
                        props.sequencer.createPattern(
                          selectedPattern().serialize(),
                          sequencerState.selectedPatternIndex + 1,
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
                      onClick={() => selectedPattern()?.duplicate()}
                    />
                    <ButtonWithLabel
                      label="🎲 Random"
                      labelOnButton={true}
                      onClick={() => {
                        const pattern = selectedPattern();
                        if (!pattern) return;
                        if (pattern.mode === 'pianoroll') {
                          pattern.set({
                            notes: randomMusicalNotes({
                              ppq: pattern.ppq,
                              bars: 2,
                            }),
                          });
                        } else {
                          // Generate a grid pattern, then project it onto notes
                          // (the single source of truth).
                          pattern.set({
                            notes: pattern.stepsToNotes(
                              randomMusicalSteps(pattern.slotCount() || 16),
                            ),
                          });
                        }
                      }}
                    />
                    <ButtonWithLabel
                      label="Clear"
                      labelOnButton={true}
                      onClick={() => {
                        // Notes are the single source of truth; clearing them
                        // empties both the grid and the roll.
                        selectedPattern()?.set({ notes: [] });
                      }}
                    />
                  </div>
                  <div class={overflowRow}>
                    <FollowupActionControls
                      numberOfPatterns={sequencerState.numberOfPatterns}
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
                  </div>
                </div>
              </Show>
            </div>
          </Row>
        </ScreenPrintBackground>
      </Column>
      <Show when={selectedPattern()}>
        <ScreenPrintBackground background={'rgba(255,255,255,0.2)'}>
          <Show
            when={selectedPatternState().mode === 'pianoroll'}
            fallback={
              <Sequencer
                mode={selectedMode()}
                steps={selectedPatternState().steps}
                onStepChange={(index, newStep) => {
                  selectedPattern()?.setStep(index, newStep);
                }}
                sequencer={props.sequencer}
              />
            }
          >
            <Show keyed when={selectedPattern()}>
              {(pattern) => (
                // Re-mount when the clip length or time signature changes so the
                // roll's visible duration + bar grid follow the controls.
                <Show
                  keyed
                  when={`${selectedPatternState().duration}:${
                    selectedPatternState().timeSignatureNumerator
                  }/${selectedPatternState().timeSignatureDenominator}`}
                >
                  {() => <PianoRollView pattern={pattern} />}
                </Show>
              )}
            </Show>
          </Show>
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

      <Show keyed when={props.followupAction}>
        {(followupAction) => {
          return (
            <>
              <Show keyed when={followupAction.type !== 'no'}>
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
              <Show keyed when={!followupAction.linked && followupAction}>
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
              <Show keyed when={followupAction.linked && followupAction}>
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
              <Show
                keyed
                when={followupAction.type === 'jump' && followupAction}
              >
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
