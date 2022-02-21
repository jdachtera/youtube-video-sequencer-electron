import { MoogKnobWithLabel } from '../controls/Knob';
import { ReverbDevice } from 'renderer/engine/device/Reverb';
import { Row } from 'renderer/Grid';

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
        max={5}
        value={+reverbState.decay}
        label={'Decay'}
      />
      <MoogKnobWithLabel
        onChange={(preDelay) => props.reverb.set({ preDelay })}
        min={0}
        max={1}
        value={reverbState.preDelay}
        label={'Pre Delay'}
      />
      <MoogKnobWithLabel
        onChange={(wet) => props.reverb.set({ wet })}
        min={0}
        max={1}
        step={0.01}
        value={reverbState.wet}
        label={'Dry/Wet'}
      />
    </Row>
  );
};
