import { ChangeEvent, useCallback } from 'react';

export type Action =
  | {
      type: 'PLAY';
      velocity?: number;
    }
  | {
      type: 'PAUSE';
    }
  | {
      type: 'SET_PLAYBACK_SPEED';
      value: number;
    }
  | {
      type: 'SET_REVERSE';
      value: boolean;
    };

const SequencerPlayAction: React.FC<{
  action: { type: 'PLAY' } & Action;
  onChange: (action: Action) => void;
}> = ({ action, onChange }) => {
  const handleChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      onChange({ ...action, velocity: +event.target.value });
    },
    [action, onChange]
  );

  return (
    <input
      type="number"
      step="1"
      value={action.velocity}
      onChange={handleChange}
    />
  );
};

const SequencerSetPlaybackSpeedAction: React.FC<{
  action: Action & { type: 'SET_PLAYBACK_SPEED' };
  onChange: (action: Action) => void;
}> = ({ action, onChange }) => {
  const handleChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      onChange({ ...action, value: +event.target.value });
    },
    [action, onChange]
  );

  return (
    <input
      type="range"
      min="0.01"
      max="3"
      step="0.01"
      value={action.value}
      onChange={handleChange}
    />
  );
};

const SequencerSetReverseAction: React.FC<{
  action: Action & { type: 'SET_REVERSE' };
  onChange: (action: Action) => void;
}> = ({ action, onChange }) => {
  const handleChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      onChange({ ...action, value: event.target.checked });
    },
    [action, onChange]
  );

  return (
    <input type="checkbox" checked={action.value} onChange={handleChange} />
  );
};

const SequencerActionFields: React.FC<{
  action: Action;
  onChange: (action: Action) => void;
}> = ({ action, onChange }) => {
  switch (action.type) {
    case 'PLAY':
      return <SequencerPlayAction action={action} onChange={onChange} />;
    case 'SET_PLAYBACK_SPEED':
      return (
        <SequencerSetPlaybackSpeedAction action={action} onChange={onChange} />
      );
    case 'SET_REVERSE':
      return <SequencerSetReverseAction action={action} onChange={onChange} />;
    default:
      return null;
  }
};

export function createNewAction(actionType: Action['type']): Action {
  switch (actionType) {
    case 'SET_PLAYBACK_SPEED':
      return { type: 'SET_PLAYBACK_SPEED', value: 1 };
    case 'SET_REVERSE':
      return { type: 'SET_REVERSE', value: true };
    case 'PAUSE':
      return { type: 'PAUSE' };
    case 'PLAY':
    default:
      return { type: 'PLAY' };
  }
}

const actionTypes: Action['type'][] = [
  'PLAY',
  'PAUSE',
  'SET_PLAYBACK_SPEED',
  'SET_REVERSE',
];

const SequencerAction: React.FC<{
  action: Action;
  onChange: (newAction: Action | null, previousAction: Action) => void;
}> = ({ action, onChange }) => {
  const handleChange = useCallback(
    (newAction: Action | null) => {
      onChange(newAction, action);
    },
    [action, onChange]
  );

  const handleRemoveAction = useCallback(() => {
    handleChange(null);
  }, [handleChange]);

  const handleActionTypeChange = useCallback(
    (event: ChangeEvent<HTMLSelectElement>) => {
      const actionType = event.target.value;
      if (actionTypes.includes(actionType as Action['type'])) {
        handleChange(createNewAction(actionType as Action['type']));
      }
    },
    [handleChange]
  );

  return (
    <div>
      <select onChange={handleActionTypeChange}>
        {actionTypes.map((actionType) => (
          <option
            key={actionType}
            value={actionType}
            selected={action.type === actionType}
          >
            {actionType}
          </option>
        ))}
      </select>

      <SequencerActionFields action={action} onChange={handleChange} />

      <button type="button" onClick={handleRemoveAction}>
        Remove Action
      </button>
    </div>
  );
};

export default SequencerAction;
