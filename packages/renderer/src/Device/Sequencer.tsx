import type { JSX } from 'solid-js';
import {
  createSignal,
  Index,
  mergeProps,
  splitProps,
  Show,
  createEffect,
  from,
} from 'solid-js';

import type { Slice } from '../engine/device/Slice';
import { css } from '../emotion-solid';
import type { SequencerMode } from './SequencerStep';
import { SequencerStep } from './SequencerStep';
import { Row } from '../UI/Grid';
import { NumberInputWithArrowButtons } from '../UI/NumberInputWithArrowButtons';
import { ButtonWithLabel } from '../UI/ButtonWithLabel';
import { createSignalFromEventEmitter } from '../engine/EngineBase';
import type { Step } from '../engine/device/Patttern';
import type { DeepReadonly } from 'solid-js/store';

const colors808Knobs = ['#ffffff', '#f1f827', '#f8a125', '#e72e2e'];

const getColor = (index: number) =>
  colors808Knobs[Math.floor((index % 16) / 4)];

export const Sequencer = (
  propsWithoutDefaults: Omit<JSX.IntrinsicElements['ul'], 'onChange'> & {
    steps: DeepReadonly<Step[]>;
    slice: Slice;
    mode: SequencerMode;
    onChange: (steps: Step[]) => void;
  },
) => {
  const [ownProps, ulProps] = splitProps(propsWithoutDefaults, [
    'steps',
    'slice',
    'onChange',
    'mode',
  ]);
  const props = mergeProps(
    { onToggleStep: (step: Step): boolean => !step.play },
    ownProps,
  );

  const [page, setPage] = createSignal(1);

  const [autoPage, setAutoPage] = createSignal(true);
  const collapsed = createSignalFromEventEmitter(
    () => props.slice,
    (slice) => slice.collapsed,
    ['collapsedUpdated'],
  );

  // eslint-disable-next-line solid/reactivity
  const currentStep = from(props.slice.observable('sequenceEvent'));

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

    const newSteps = [
      ...props.steps.slice(0, stepIndex),
      newStep,
      ...props.steps.slice(stepIndex + 1),
    ];
    setSelectedStep(newStep);
    props.onChange(newSteps);
  };

  return (
    <Row>
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
            padding: 10px;
            width: ${44 * 16}px;
            background: none;
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
