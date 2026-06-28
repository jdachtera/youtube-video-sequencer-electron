import { css } from '@emotion/css';
import type { SequencerDevice } from 'engine/device/Sequencer';
import { lighten } from 'polished';
import type { JSX } from 'solid-js';
import {
  onCleanup,
  createSignal,
  Index,
  mergeProps,
  splitProps,
  Show,
  createEffect,
  For,
} from 'solid-js';
import type { DeepReadonly } from 'solid-js/store';
import { ButtonWithLabel } from '../UI/ButtonWithLabel';
import { Row } from '../UI/Grid';
import { NumberInputWithArrowButtons } from '../UI/NumberInputWithArrowButtons';
import { ScreenPrintBackground } from '../UI/ScreenPrintBackground';
import {
  createSignalFromEventEmitter,
  createStoreFromEventEmitter,
} from '../engine/EngineBase';
import type { Step } from '../engine/device/Patttern';
import type { SequencerMode } from './SequencerStep';
import { SequencerStep } from './SequencerStep';

const colors808Knobs = ['#ffffff', '#f1f827', '#f8a125', '#e72e2e'];

const getColor = (index: number) =>
  colors808Knobs[Math.floor((index % 16) / 4)];

export const Sequencer = (
  propsWithoutDefaults: Omit<JSX.IntrinsicElements['ul'], 'onChange'> & {
    steps: DeepReadonly<Step[]>;
    sequencer: SequencerDevice;
    mode: SequencerMode;
    onStepChange: (index: number, step: Step) => void;
  },
) => {
  const [ownProps, ulProps] = splitProps(propsWithoutDefaults, [
    'steps',
    'sequencer',
    'onStepChange',
    'mode',
  ]);
  const props = mergeProps(
    { onToggleStep: (step: Step): boolean => !step.play },
    ownProps,
  );

  const [page, setPage] = createSignal(1);

  const [autoPage, setAutoPage] = createSignal(true);
  const collapsed = createSignalFromEventEmitter(
    () => props.sequencer,
    (slice) => slice.collapsed,
    ['collapsedUpdated'],
  );

  const [currentStep, setCurrentStep] = createSignal<Step>();
  const handleSequenceEvent = (_: unknown, step: Step) => {
    setCurrentStep(step);
  };
  createEffect(() => {
    props.sequencer.off('sequenceEvent', handleSequenceEvent);
    props.sequencer.on('sequenceEvent', handleSequenceEvent);
  });

  onCleanup(() => {
    props.sequencer.off('sequenceEvent', handleSequenceEvent);
  });

  createEffect(() => {
    if (autoPage() && collapsed()) {
      const step = currentStep();
      if (step) {
        setPage(Math.floor(props.steps.indexOf(step) / 16) + 1);
      }
    }
  });

  const [selectedStep, setSelectedStep] = createSignal<Step>();

  const handleStepChanged = (step: Step, newStep: Step) => {
    const stepIndex = props.steps.indexOf(step);
    if (stepIndex < 0) return;
    setSelectedStep(newStep);
    // The grid is a quantized view of the pattern's notes; report the edited
    // cell so the pattern can mutate the underlying note (add/remove/update).
    props.onStepChange(stepIndex, newStep);
  };

  return (
    <Row>
      <PatternSelector sequencer={props.sequencer} />

      <Show when={collapsed()}>
        <ButtonWithLabel
          label="Auto"
          labelOnButton
          activated={autoPage()}
          onClick={() => setAutoPage(!autoPage())}
        />
        <NumberInputWithArrowButtons
          label={'Page'}
          size={2}
          min={1}
          max={Math.ceil(props.steps.length / 16)}
          value={page()}
          onChange={(page) => setPage(page)}
        />
      </Show>

      <ul
        {...ulProps}
        classList={{
          ...ulProps.classList,
          [css`
            border-radius: 4px;
            padding: 4px 8px;
            width: ${31 * 16}px;
            background: none;
            /* Collapse inline-block line-box whitespace so a single row of
               steps is only as tall as the steps themselves. */
            font-size: 0;
            line-height: 0;
          `]: true,
        }}
      >
        <Index each={props.steps}>
          {(step, index) => {
            return (
              <SequencerStep
                mode={props.mode}
                hidden={
                  !(
                    !collapsed() ||
                    (index < page() * 16 && index >= page() * 16 - 16)
                  )
                }
                color={getColor(index)}
                onChange={handleStepChanged}
                step={step()}
                isSelected={step() === selectedStep()}
                isCurrent={step() === currentStep()}
              />
            );
          }}
        </Index>
        <Show
          when={
            props.steps.length % 16 !== 0 &&
            (!collapsed() || page() === Math.ceil(props.steps.length / 16))
          }
        >
          <Index each={Array.from({ length: 16 - (props.steps.length % 16) })}>
            {(_, index) => {
              return (
                <SequencerStep
                  mode={props.mode}
                  class={css`
                    opacity: 0.4;
                  `}
                  color={getColor((props.steps.length % 16) + index)}
                />
              );
            }}
          </Index>
        </Show>
      </ul>
    </Row>
  );
};

const PatternSelector = (props: { sequencer: SequencerDevice }) => {
  const sliceState = createStoreFromEventEmitter(
    () => props.sequencer,
    (slice) => ({
      collapsed: slice.collapsed,
      patterns: slice.patterns,
      autoSelectPattern: slice.autoSelectPattern,
      currentPatternIndex: slice.currentPatternIndex,
      selectedPatternIndex: slice.selectedPatternIndex,
      cuedPatternIndex: slice.cuedPatternIndex,
    }),
    [
      'collapsedUpdated',
      'patternAdded',
      'patternRemoved',
      'autoSelectPatternUpdated',
      'currentPatternIndexUpdated',
      'selectedPatternIndexUpdated',
      'cuedPatternIndexUpdated',
    ],
  );

  return (
    <ScreenPrintBackground
      hidden={sliceState.collapsed}
      background={'rgba(255,255,255,0.2)'}
    >
      <Row
        class={css`
          margin-top: 10px;
        `}
      >
        <ul
          class={css`
            display: flex;
            flex-direction: column;
            list-style: none;
            flex: 1;
          `}
        >
          <For each={sliceState.patterns}>
            {(pattern, index) => {
              const patternState = createStoreFromEventEmitter(
                () => pattern,
                (pattern) => ({ color: pattern.color, name: pattern.name }),
                ['colorUpdated', 'nameUpdated'],
              );

              return (
                <li
                  classList={{
                    [css`
                      border: 1px black solid;
                      display: flex;
                      background-color: ${patternState.color};
                      cursor: pointer;
                    `]: true,
                    [css`
                      background-color: ${lighten(0.2, patternState.color)};
                    `]: index() === sliceState.selectedPatternIndex,
                  }}
                >
                  <ButtonWithLabel
                    label={'▶'}
                    blinkInterval={
                      index() === sliceState.cuedPatternIndex &&
                      index() !== sliceState.currentPatternIndex
                        ? 60 / props.sequencer.engine.transport.bpm.value
                        : 0
                    }
                    activated={index() === sliceState.currentPatternIndex}
                    labelOnButton={true}
                    onClick={(event) => {
                      event.preventDefault();
                      // Cue at the next launch-grid boundary (global transport
                      // quantization); undefined when stopped -> starts from top.
                      props.sequencer.cuePattern(
                        index(),
                        pattern.engine.launchTime(),
                      );

                      if (pattern.engine.transport.state !== 'started') {
                        pattern.engine.start();
                      }
                    }}
                  />
                  <input
                    type="text"
                    onClick={(event) => {
                      event.preventDefault();
                      props.sequencer.set({ selectedPatternIndex: index() });
                    }}
                    class={css`
                      border: 0;
                      flex: 1;
                      font-size: 18px;
                      font-family: 'Oswald';
                      margin-left: 5px;
                      background: transparent;
                      cursor: pointer;
                      color: ${lighten(0.1, 'black')};
                      &:active,
                      &:focus {
                        outline: none;
                        border: none;
                      }
                    `}
                    value={patternState.name}
                    onInput={(event) =>
                      pattern.set({ name: event.currentTarget.value })
                    }
                  />
                </li>
              );
            }}
          </For>
        </ul>
      </Row>
    </ScreenPrintBackground>
  );
};
