import { createSignal, onMount, onCleanup, For, Index, Show } from 'solid-js';

import { SequencerAction, Action, createNewAction } from './SequencerAction';
import { SequencerStep, Step } from './SequencerStep';
import './Sequencer.scss';
import { SliceChain } from './engine/SliceChain';

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

export const Sequencer = (props: {
  steps: Step[];
  chain: SliceChain;
  onChange: (steps: Step[]) => void;
  onToggleStep: (step: Step) => Action[];
}) => {
  const [currentStep, setCurrentStep] = createSignal<Step>();

  onMount(() => props.chain.on('sequence-event', setCurrentStep));
  onCleanup(() => props.chain.off('sequence-event', setCurrentStep));

  const [selectedStep, setSelectedStep] = createSignal<Step>();

  const handleUpdateActions = (updatedActions: Action[], step: Step) => {
    const newStep = {
      ...step,
      actions: updatedActions,
    };

    const { steps } = props;

    const stepIndex = steps.indexOf(step);

    const newSteps = [
      ...steps.slice(0, stepIndex),
      newStep,
      ...steps.slice(stepIndex + 1),
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
      <ul class="sequencer-steps">
        <Index each={props.steps}>
          {(step) => (
            <SequencerStep
              step={step()}
              onClick={toggleStep}
              isSelected={step() === selectedStep()}
              isCurrent={step() === currentStep()}
              // class={`step-${stepIndex}`}
            />
          )}
        </Index>
      </ul>
      <div>
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
      </div>
    </div>
  );
};
