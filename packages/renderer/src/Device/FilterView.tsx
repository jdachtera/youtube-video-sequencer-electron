import { createEffect, createSignal, onCleanup, onMount } from 'solid-js';
import type { FilterRollOff } from 'tone';
import { Column, Row } from '../UI/Grid';
import { MoogKnobWithLabel } from '../UI/Knob';
import { SelectWithArrowButtons } from '../UI/SelectWithArrowButtons';
import { LCD } from '../UI/lcdStyles';
import {
  createSignalFromEventEmitter,
  createStoreFromEventEmitter,
} from '../engine/EngineBase';
import type { FilterDevice } from '../engine/device/Filter';

const filterTypes: BiquadFilterType[] = [
  'lowpass',
  'highpass',
  'bandpass',
  'lowshelf',
  'highshelf',
  'notch',
  'allpass',
  'peaking',
];
const filterRolloffOptions: FilterRollOff[] = [-12, -24, -48, -96];

export const FilterView = (props: { filter: FilterDevice }) => {
  const filterState = createStoreFromEventEmitter(
    () => props.filter,
    (filter) => filter.serialize(),
    'change',
  );

  return (
    <Column>
      <Row>
        <SelectWithArrowButtons
          size={8}
          options={filterTypes}
          selectedOption={filterState.type}
          onChange={(type) => props.filter.set({ type })}
        />
        <SelectWithArrowButtons
          size={3}
          options={filterRolloffOptions}
          selectedOption={filterState.rolloff}
          onChange={(rolloff) => props.filter.set({ rolloff })}
        />
        <MoogKnobWithLabel
          onChange={(frequency) => props.filter.set({ frequency })}
          min={1}
          max={20000}
          value={filterState.frequency}
          label={'Cutoff'}
          unit={'Hz'}
        />
        <MoogKnobWithLabel
          onChange={(resonance) => props.filter.set({ resonance })}
          min={0.1}
          max={50}
          value={filterState.resonance}
          label={'Resonance'}
        />
      </Row>
      <Row>
        <MoogKnobWithLabel
          onChange={(envAmount) => props.filter.set({ envAmount })}
          min={0}
          max={6000}
          value={filterState.envAmount}
          label={'Env'}
          unit={'Hz'}
        />
        <MoogKnobWithLabel
          onChange={(attack) => props.filter.set({ attack })}
          min={0}
          max={3}
          value={filterState.attack}
          label={'Attack'}
          unit={'s'}
        />
        <MoogKnobWithLabel
          onChange={(decay) => props.filter.set({ decay })}
          min={0}
          max={8}
          value={filterState.decay}
          label={'Decay'}
          unit={'s'}
        />
        <MoogKnobWithLabel
          onChange={(sustain) => props.filter.set({ sustain })}
          min={0}
          max={1}
          value={filterState.sustain}
          label={'Sustain'}
        />
        <MoogKnobWithLabel
          onChange={(release) => props.filter.set({ release })}
          min={0}
          max={500}
          value={filterState.release}
          label={'Release'}
        />
      </Row>
      <Row>
        <FrequencyResponseDisplay filter={props.filter} />
      </Row>
    </Column>
  );
};

const FrequencyResponseDisplay = (props: { filter: FilterDevice }) => {
  let canvasRef: HTMLCanvasElement | undefined;

  const frequencyResponse = createSignalFromEventEmitter(
    () => props.filter,
    (filter) => filter.filterNode.getFrequencyResponse(100),
    ['frequencyUpdated', 'resonanceUpdated', 'typeUpdated', 'rolloffUpdated'],
  );
  const [context, setContext] = createSignal<
    CanvasRenderingContext2D | null | undefined
  >();

  onMount(() => {
    setContext(canvasRef?.getContext('2d'));
    canvasRef?.addEventListener('resize', setDimensions);
    setDimensions();
  });

  onCleanup(() => {
    canvasRef?.removeEventListener('resize', setDimensions);
  });

  const [height, setHeight] = createSignal(0);
  const [width, setWidth] = createSignal(0);

  const setDimensions = () => {
    setHeight(canvasRef?.height ?? 0);
    setWidth(canvasRef?.width ?? 0);
  };

  createEffect(() => {
    const ctx = context();

    if (!ctx) return;

    const getX = (i: number) => Math.pow(i, 2) * (width() ?? 0);
    const getY = (y: number) => height() - (y / 20) * (height() ?? 0);

    const points = frequencyResponse();

    ctx.clearRect(0, 0, width(), height());
    ctx.beginPath();

    ctx.moveTo(0, points[0]);

    for (let i = 0; i < points.length - 1; i++) {
      const x1 = getX(i / points.length);
      const x2 = getX((i + 1) / points.length);

      const y1 = getY(points[i]);
      const y2 = getY(points[i + 1]);

      const x_mid = (x1 + x2) / 2;
      const y_mid = (y1 + y2) / 2;
      const cp_x1 = (x_mid + x1) / 2;
      const cp_x2 = (x_mid + x2) / 2;
      ctx.quadraticCurveTo(cp_x1, y1, x_mid, y_mid);
      ctx.quadraticCurveTo(cp_x2, y2, x2, y2);
    }

    ctx.stroke();
  });

  return (
    <LCD>
      <canvas ref={canvasRef} width={260} height={80} />
    </LCD>
  );
};
