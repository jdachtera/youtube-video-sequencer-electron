import React, { useCallback, useState } from 'react';
import SequencerAction, { Action, createNewAction } from './SequencerAction';
import SequencerStep, { Step } from './SequencerStep';
import './Sequencer.css';

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

const Sequencer: React.FC<{
  steps: Step[];
  currentStep?: Step;
  onChange: (steps: Step[]) => void;
}> = React.memo(({ steps, currentStep, onChange }) => {
  const [selectedStep, setSelectedStep] = useState<Step>();

  const handleUpdateActions = useCallback(
    (updatedActions: Action[], step: Step) => {
      const newStep = {
        ...step,
        actions: updatedActions,
      };

      const stepIndex = steps.indexOf(step);

      const newSteps = [
        ...steps.slice(0, stepIndex),
        newStep,
        ...steps.slice(stepIndex + 1),
      ];
      setSelectedStep(newStep);
      onChange(newSteps);
    },
    [steps, onChange]
  );

  const handleAddAction = useCallback(() => {
    if (!selectedStep) return;
    handleUpdateActions(
      [...selectedStep.actions, createDefaultAction(steps)],
      selectedStep
    );
  }, [selectedStep, steps, handleUpdateActions]);

  const handleUpdateAction = useCallback(
    (newAction: Action | null, previousAction: Action) => {
      if (!selectedStep) return;
      const actionIndex = selectedStep.actions.indexOf(previousAction);
      handleUpdateActions(
        [
          ...selectedStep.actions.slice(0, actionIndex),
          ...(newAction ? [newAction] : []),
          ...selectedStep.actions.slice(actionIndex + 1),
        ],
        selectedStep
      );
    },
    [selectedStep, handleUpdateActions]
  );

  const toggleStep = useCallback(
    (step: Step) => {
      setSelectedStep(step);
      if (step.actions.length === 0) {
        handleUpdateActions([createDefaultAction(steps)], step);
      } else {
        handleUpdateActions([], step);
      }
    },
    [steps, setSelectedStep, handleUpdateActions]
  );

  return (
    <div>
      <ul className="sequencer-steps">
        {steps.map((step, stepIndex) => (
          <SequencerStep
            step={step}
            key={`action-${stepIndex}`}
            onClick={setSelectedStep}
            onDoubleClick={toggleStep}
            isSelected={step === selectedStep}
            isCurrent={step === currentStep}
          />
        ))}
      </ul>
      <div>
        {selectedStep && (
          <div>
            {selectedStep.actions.map((action, actionIndex) => {
              return (
                <SequencerAction
                  key={`action-${actionIndex}`}
                  action={action}
                  onChange={handleUpdateAction}
                />
              );
            })}
            <button type="button" onClick={handleAddAction}>
              Add action
            </button>
          </div>
        )}
      </div>
    </div>
  );
});

export default Sequencer;
