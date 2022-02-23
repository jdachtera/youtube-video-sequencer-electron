import {
  createSignal,
  onMount,
  onCleanup,
  Index,
  mergeProps,
  JSX,
  splitProps,
  Show,
  createEffect,
  For,
  createMemo,
} from 'solid-js';

import { Slice, Step } from '../engine/device/Slice';
import { css } from '../emotion-solid';
import { SequencerStep } from './SequencerStep';
import { Row } from '../UI/Grid';
import { NumberInputWithArrowButtons } from '../UI/NumberInputWithArrowButtons';
import { ButtonWithLabel } from '../UI/ButtonWithLabel';

const colors808Knobs = ['#ffffff', '#f1f827', '#f8a125', '#e72e2e'];

export const Sequencer = (
  propsWithoutDefaults: Omit<JSX.IntrinsicElements['ul'], 'onChange'> & {
    steps: Step[];
    slice: Slice;
    onChange: (steps: Step[]) => void;
  }
) => {
  const [ownProps, ulProps] = splitProps(propsWithoutDefaults, [
    'steps',
    'slice',
    'onChange',
  ]);
  const props = mergeProps(
    { onToggleStep: (step: Step): boolean => !step.play },
    ownProps
  );

  const [page, setPage] = createSignal(1);
  const [currentStep, setCurrentStep] = createSignal<Step>();
  const [autoPage, setAutoPage] = createSignal(true);
  const collapsed = props.slice.createSignal(
    (slice) => slice.collapsed,
    ['collapsedUpdated']
  );

  createEffect(() => {
    if (autoPage() && collapsed()) {
      const step = currentStep();
      if (step) {
        setPage(Math.floor(props.steps.indexOf(step) / 16) + 1);
      }
    }
  });

  onMount(() => props.slice.on('sequenceEvent', setCurrentStep));
  onCleanup(() => props.slice.off('sequenceEvent', setCurrentStep));

  const [selectedStep, setSelectedStep] = createSignal<Step>();

  const handleToggleStep = (step: Step) => {
    const newStep = {
      ...step,
      play: !step.play,
    };

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
                hidden={
                  !(
                    !collapsed() ||
                    (index < page() * 16 && index >= page() * 16 - 16)
                  )
                }
                color={colors808Knobs[Math.floor((index % 16) / 4)]}
                onClick={() => handleToggleStep(step())}
                isSelected={step() === selectedStep()}
                isCurrent={step() === currentStep()}
                isActive={step().play}
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
            {(step, index) => {
              return (
                <SequencerStep
                  class={css`
                    opacity: 0.4;
                  `}
                  color={
                    colors808Knobs[
                      Math.floor((((props.steps.length % 16) + index) % 16) / 4)
                    ]
                  }
                />
              );
            }}
          </Index>
        </Show>
      </ul>
    </Row>
  );
};
