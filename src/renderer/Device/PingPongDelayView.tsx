import { MoogKnobWithLabel } from '../controls/Knob';
import { PingPongDelayDevice } from 'renderer/engine/device/PingPongDelay';
import { Row } from 'renderer/Grid';

export const PingPongDelayView = (props: {
  pingPongDelay: PingPongDelayDevice;
}) => {
  const pingPongDelayState = props.pingPongDelay.createStore(
    (pingPongDelay) => pingPongDelay.serialize(),
    'change'
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
