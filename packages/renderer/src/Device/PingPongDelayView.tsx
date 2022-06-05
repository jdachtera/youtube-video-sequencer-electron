import { Row } from '../UI/Grid';
import { MoogKnobWithLabel } from '../UI/Knob';
import { createStoreFromEventEmitter } from '../engine/EngineBase';
import type { PingPongDelayDevice } from '../engine/device/PingPongDelay';

export const PingPongDelayView = (props: {
  pingPongDelay: PingPongDelayDevice;
}) => {
  const pingPongDelayState = createStoreFromEventEmitter(
    () => props.pingPongDelay,
    (pingPongDelay) => pingPongDelay.serialize(),
    'change',
  );
  return (
    <Row>
      <MoogKnobWithLabel
        onChange={(delayTime) => props.pingPongDelay.set({ delayTime })}
        min={0.001}
        max={5}
        value={+pingPongDelayState.delayTime}
        label={'Delay Time'}
      />
      <MoogKnobWithLabel
        onChange={(feedback) => props.pingPongDelay.set({ feedback })}
        min={0}
        max={1}
        value={pingPongDelayState.feedback}
        label={'Feedback'}
      />
      <MoogKnobWithLabel
        onChange={(wet) => props.pingPongDelay.set({ wet })}
        min={0}
        max={1}
        value={pingPongDelayState.wet}
        label={'Dry/Wet'}
      />
    </Row>
  );
};
