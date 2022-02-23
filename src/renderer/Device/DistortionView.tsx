import { MoogKnobWithLabel } from '../UI/Knob';
import { DistortionDevice } from '../engine/device/Distortion';

export const DistortionView = (props: { distortion: DistortionDevice }) => {
  const distortionState = props.distortion.createStore(
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
