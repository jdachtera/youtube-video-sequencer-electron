import { For, Match, Switch } from 'solid-js';

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

const SequencerPlayAction = (props: {
  action: { type: 'PLAY' } & Action;
  onChange: (action: Action) => void;
}) => {
  const handleChange = (event: { currentTarget: HTMLInputElement }) => {
    props.onChange({ ...props.action, velocity: +event.currentTarget.value });
  };

  return (
    <input
      type="number"
      step="1"
      value={props.action.velocity}
      onChange={handleChange}
    />
  );
};

const SequencerSetPlaybackSpeedAction = (props: {
  action: Action & { type: 'SET_PLAYBACK_SPEED' };
  onChange: (action: Action) => void;
}) => {
  const handleChange = (event: { currentTarget: HTMLInputElement }) => {
    props.onChange({ ...props.action, value: +event.currentTarget.value });
  };

  return (
    <input
      type="range"
      min="0.01"
      max="3"
      step="0.01"
      value={props.action.value}
      onChange={handleChange}
    />
  );
};

const SequencerSetReverseAction = (props: {
  action: Action & { type: 'SET_REVERSE' };
  onChange: (action: Action) => void;
}) => {
  const handleChange = (event: { currentTarget: HTMLInputElement }) => {
    props.onChange({ ...props.action, value: event.currentTarget.checked });
  };

  return (
    <input
      type="checkbox"
      checked={props.action.value}
      onChange={handleChange}
    />
  );
};

const SequencerActionFields = (props: {
  action: Action;
  onChange: (action: Action) => void;
}) => {
  return (
    <Switch>
      <Match when={props.action.type === 'PLAY' && props.action}>
        {(action) => (
          <SequencerPlayAction action={action} onChange={props.onChange} />
        )}
      </Match>
      <Match when={props.action.type === 'SET_PLAYBACK_SPEED' && props.action}>
        {(action) => (
          <SequencerSetPlaybackSpeedAction
            action={action}
            onChange={props.onChange}
          />
        )}
      </Match>
      <Match when={props.action.type === 'SET_REVERSE' && props.action}>
        {(action) => (
          <SequencerSetReverseAction
            action={action}
            onChange={props.onChange}
          />
        )}
      </Match>
    </Switch>
  );
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

export const SequencerAction = (props: {
  action: Action;
  onChange: (newAction: Action | null, previousAction: Action) => void;
}) => {
  const handleChange = (newAction: Action | null) => {
    props.onChange(newAction, props.action);
  };

  const handleRemoveAction = () => {
    handleChange(null);
  };

  const handleActionTypeChange = (event: {
    currentTarget: HTMLSelectElement;
  }) => {
    const actionType = event.currentTarget.value;
    if (actionTypes.includes(actionType as Action['type'])) {
      handleChange(createNewAction(actionType as Action['type']));
    }
  };

  return (
    <div>
      <select onChange={handleActionTypeChange}>
        <For each={actionTypes}>
          {(actionType) => (
            <option
              value={actionType}
              selected={props.action.type === actionType}
            >
              {actionType}
            </option>
          )}
        </For>
      </select>

      <SequencerActionFields action={props.action} onChange={handleChange} />

      <button type="button" onClick={handleRemoveAction}>
        Remove Action
      </button>
    </div>
  );
};
