import { createSignal, onMount, onCleanup, Index, mergeProps } from 'solid-js';

import { createNewAction } from './SequencerAction';
import { Slice } from './engine/device/Slice';
import { css } from 'solid-styled-components';
import { Action, Step } from './engine/types';
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

export const Sequencer = (propsWithoutDefaults: {
  steps: Step[];
  slice: Slice;
  onChange: (steps: Step[]) => void;
  onToggleStep?: (step: Step) => Action[];
}) => {
  const props = mergeProps(
    {
      onToggleStep: (step: Step): Action[] => {
        if (step.actions.length === 0) {
          return [{ type: 'PLAY' }];
        }
        return [];
      },
    },
    propsWithoutDefaults
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
        class={css`
          border-radius: 4px;
          padding: 3px;
          max-width: 864px;
          background: none;
        `}
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
