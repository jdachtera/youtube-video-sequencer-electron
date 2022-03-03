import { MoogKnobWithLabel } from '../UI/Knob';
import type { ReverbDevice } from '../engine/device/Reverb';
import { Row } from '../UI/Grid';
import { createStoreFromEventEmitter } from '../engine/EngineBase';

export const ReverbView = (props: { reverb: ReverbDevice }) => {
  const reverbState = createStoreFromEventEmitter(
    () => props.reverb,
    (reverb) => reverb.serialize(),
    'change',
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
