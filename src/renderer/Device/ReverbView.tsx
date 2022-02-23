import { MoogKnobWithLabel } from '../UI/Knob';
import { ReverbDevice } from '../engine/device/Reverb';
import { Row } from '../UI/Grid';

export const ReverbView = (props: { reverb: ReverbDevice }) => {
  const reverbState = props.reverb.createStore(
    (reverb) => reverb.serialize(),
    'change'
  );

  return (
    <Row>
      <MoogKnobWithLabel
        onChange={(decay) => props.reverb.set({ decay })}
        min={0}
        max={20}
        value={+reverbState.decay}
        label={'Decay'}
      />
      <MoogKnobWithLabel
        onChange={(preDelay) => props.reverb.set({ preDelay })}
        min={0.01}
        max={1}
        value={reverbState.preDelay}
        label={'Pre Delay'}
      />
      <MoogKnobWithLabel
        onChange={(wet) => props.reverb.set({ wet })}
        min={0}
        max={1}
        value={reverbState.wet}
        label={'Dry/Wet'}
      />
    </Row>
  );
};
