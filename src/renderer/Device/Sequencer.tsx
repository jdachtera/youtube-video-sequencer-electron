import {
  createSignal,
  onMount,
  onCleanup,
  Index,
  mergeProps,
  JSX,
  splitProps,
} from 'solid-js';

import { createNewAction } from './SequencerAction';
import { Action, Slice, Step } from '../engine/device/Slice';
import { css } from 'solid-styled-components';
import { SequencerStep } from './SequencerStep';

const createDefaultAction = (allSteps: Step[]): Action => {
  const firstStepWithPlayAction = allSteps.find((step) =>
    step.actions.find((action) => action.type === 'PLAY')
  );
  if (firstStepWithPlayAction) {
    const firstPlayAction = firstStepWithPlayAction.actions.find(
      (action) => action.type === 'PLAY'
    );
    if (firstPlayAction) {
      return {
        ...firstPlayAction,
      };
    }
  }
  return createNewAction('PLAY');
};

export const Sequencer = (
  propsWithoutDefaults: Omit<JSX.IntrinsicElements['ul'], 'onChange'> & {
    steps: Step[];
    slice: Slice;
    onChange: (steps: Step[]) => void;
    onToggleStep?: (step: Step) => Action[];
  }
) => {
  const [ownProps, ulProps] = splitProps(propsWithoutDefaults, [
    'steps',
    'slice',
    'onChange',
    'onToggleStep',
  ]);
  const props = mergeProps(
    {
      onToggleStep: (step: Step): Action[] => {
        if (step.actions.length === 0) {
          return [{ type: 'PLAY' }];
        }
        return [];
      },
    },
    ownProps
  );

  const [currentStep, setCurrentStep] = createSignal<Step>();

  onMount(() => props.slice.on('sequenceEvent', setCurrentStep));
  onCleanup(() => props.slice.off('sequenceEvent', setCurrentStep));

  const [selectedStep, setSelectedStep] = createSignal<Step>();

  const handleUpdateActions = (updatedActions: Action[], step: Step) => {
    const newStep = {
      ...step,
      actions: updatedActions,
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

  const handleAddAction = () => {
    const selectedStepValue = selectedStep();
    if (!selectedStepValue) return;
    handleUpdateActions(
      [...selectedStepValue.actions, createDefaultAction(props.steps)],
      selectedStepValue
    );
  };

  const handleUpdateAction = (
    newAction: Action | null,
    previousAction: Action
  ) => {
    const selectedStepValue = selectedStep();
    if (!selectedStepValue) return;
    const actionIndex = selectedStepValue.actions.indexOf(previousAction);
    handleUpdateActions(
      [
        ...selectedStepValue.actions.slice(0, actionIndex),
        ...(newAction ? [newAction] : []),
        ...selectedStepValue.actions.slice(actionIndex + 1),
      ],
      selectedStepValue
    );
  };

  const toggleStep = (step: Step) => {
    setSelectedStep(step);
    handleUpdateActions(props.onToggleStep(step), step);
  };

  return (
    <div>
      <ul
        {...ulProps}
        classList={{
          ...ulProps.classList,
          [css`
            border-radius: 4px;
            padding: 3px;
            width: ${44 * Math.min(16, props.steps.length)}px;
            background: none;
          `]: true,
        }}
      >
        <Index each={props.steps}>
          {(step) => (
            <SequencerStep
              step={step()}
              onClick={toggleStep}
              isSelected={step() === selectedStep()}
              isCurrent={step() === currentStep()}
            />
          )}
        </Index>
      </ul>
      {/* <div>
        <Show when={selectedStep()}>
          {(step) => (
            <div>
              <For each={step.actions}>
                {(action) => {
                  return (
                    <SequencerAction
                      action={action}
                      onChange={handleUpdateAction}
                    />
                  );
                }}
              </For>
              <button type="button" onClick={handleAddAction}>
                Add action
              </button>
            </div>
          )}
        </Show>
      </div> */}
    </div>
  );
};
