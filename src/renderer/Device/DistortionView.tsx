import { createStoreFromEventEmitter } from '../createSignalFromEventEmitter';

import { MoogKnobWithLabel } from '../controls/Knob';
import { Distortion } from 'renderer/engine/device/Distortion';

export const DistortionView = (props: { distortion: Distortion }) => {
  const distortionState = createStoreFromEventEmitter(
    () => props.distortion,
    ['change'],
    (distortion) => distortion.serialize()
  );

  return (
    <div>
      <MoogKnobWithLabel
        onChange={(distortion) => props.distortion.set({ distortion })}
        min={0}
        max={1}
        step={0.01}
        value={+distortionState.distortion}
        label={'Distortion'}
      />
    </div>
  );
};
