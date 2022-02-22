import { MoogKnobWithLabel } from '../UI/Knob';
import { CompressorDevice } from 'renderer/engine/device/Compressor';
import { Column, Row } from 'renderer/UI/Grid';

export const CompressorView = (props: { compressor: CompressorDevice }) => {
  const compressorState = props.compressor.createStore(
    (compressor) => compressor.serialize(),
    'change'
  );

  return (
    <Column>
      <Row>
        <MoogKnobWithLabel
          onChange={(attack) => props.compressor.set({ attack })}
          min={0}
          max={1}
          step={0.01}
          value={+compressorState.attack}
          label={'Attack'}
        />
        <MoogKnobWithLabel
          onChange={(release) => props.compressor.set({ release })}
          min={0}
          max={1}
          step={0.01}
          value={+compressorState.release}
          label={'Decay'}
        />
        <MoogKnobWithLabel
          onChange={(knee) => props.compressor.set({ knee })}
          min={0}
          max={1}
          step={0.1}
          value={+compressorState.knee}
          label={'Knee'}
        />
      </Row>
      <Row>
        <MoogKnobWithLabel
          onChange={(ratio) => props.compressor.set({ ratio })}
          min={1}
          max={20}
          step={1}
          value={+compressorState.ratio}
          label={'Ratio'}
        />
        <MoogKnobWithLabel
          onChange={(threshold) => props.compressor.set({ threshold })}
          min={-30}
          max={0}
          step={0.1}
          value={+compressorState.threshold}
          label={'Threshold'}
        />
      </Row>
    </Column>
  );
};
