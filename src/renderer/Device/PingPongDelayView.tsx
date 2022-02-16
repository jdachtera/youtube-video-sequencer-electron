import { createStoreFromEventEmitter } from '../createSignalFromEventEmitter';

import { MoogKnobWithLabel } from '../controls/Knob';
import { PingPongDelayDevice } from 'renderer/engine/device/PingPongDelay';

export const PingPongDelayView = (props: {
  pingPongDelay: PingPongDelayDevice;
}) => {
  const filterState = createStoreFromEventEmitter(
    () => props.pingPongDelay,
    ['change'],
    (filter) => filter.serialize()
  );

  return (
    <div>
      <MoogKnobWithLabel
        onChange={(delayTime) => props.pingPongDelay.set({ delayTime })}
        min={1}
        max={5000}
        value={+filterState.delayTime}
        label={'Delay Time'}
      />
      <MoogKnobWithLabel
        onChange={(feedback) => props.pingPongDelay.set({ feedback })}
        min={0}
        max={1}
        step={0.05}
        value={filterState.feedback}
        label={'Feedback'}
      />
    </div>
  );
};
