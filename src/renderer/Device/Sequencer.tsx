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
} from 'solid-js';

import { Slice, Step } from '../engine/device/Slice';
import { css } from 'renderer/emotion-solid';
import { SequencerStep } from './SequencerStep';
import { Row } from 'renderer/Grid';
import { ButtonWithLabel, NumberInputWithArrowButtons } from 'renderer/UI';

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
              <Show
                when={
                  !collapsed() ||
                  (index < page() * 16 && index >= page() * 16 - 16)
                }
              >
                <SequencerStep
                  classList={{
                    [css`
                      > div {
                        background: ${colors808Knobs[
                          Math.floor((index % 16) / 4)
                        ]};
                      }
                    `]: true,
                  }}
                  step={step()}
                  onClick={handleToggleStep}
                  isSelected={step() === selectedStep()}
                  isCurrent={step() === currentStep()}
                />
              </Show>
            );
          }}
        </Index>
      </ul>
    </Row>
  );
};
