import { createStoreFromEventEmitter } from '../createSignalFromEventEmitter';

import { MoogKnobWithLabel } from '../controls/Knob';
import { ReverbDevice } from 'renderer/engine/device/Reverb';

export const ReverbView = (props: { reverb: ReverbDevice }) => {
  const reverbState = createStoreFromEventEmitter(
    () => props.reverb,
    ['change'],
    (reverb) => reverb.serialize()
  );

  return (
    <div>
      <MoogKnobWithLabel
        onChange={(decay) => props.reverb.set({ decay })}
        min={1}
        max={5000}
        value={+reverbState.decay}
        label={'Decay'}
      />
      <MoogKnobWithLabel
        onChange={(preDelay) => props.reverb.set({ preDelay })}
        min={0}
        max={800}
        step={0.1}
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
    </div>
  );
};
