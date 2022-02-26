import { MoogKnobWithLabel } from '../UI/Knob';
import { DistortionDevice } from '../engine/device/Distortion';
import { createStoreFromEventEmitter } from 'renderer/engine/EngineBase';

export const DistortionView = (props: { distortion: DistortionDevice }) => {
  const distortionState = createStoreFromEventEmitter(
    () => props.distortion,
    (distortion) => distortion.serialize(),
    'change'
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
