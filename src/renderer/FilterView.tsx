import { createEffect, createSignal, For, onCleanup, onMount } from 'solid-js';
import { FilterRollOff } from 'tone';
import { createStoreFromEventEmitter } from './createSignalFromEventEmitter';
import { Filter, SerializedFilter } from './engine/device/Filter';
import { MoogKnobWithLabel } from './Knob';

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

export const FilterView = (props: { filter: Filter }) => {
  const filterState = createStoreFromEventEmitter(
    () => props.filter,
    ['change'],
    (filter) => ({
      ...filter.serialize(),
      frequencyResponse: filter.filterNode.getFrequencyResponse(100),
    })
  );

  return (
    <div>
      <select
        value={filterState.type}
        onChange={(event) =>
          props.filter.set({
            type: event.currentTarget.value as SerializedFilter['type'],
          })
        }
      >
        <For each={filterTypes}>
          {(type) => <option value={type}>{type}</option>}
        </For>
      </select>
      <select
        value={filterState.rolloff}
        onChange={(event) =>
          props.filter.set({
            rolloff: event.currentTarget.value as unknown as FilterRollOff,
          })
        }
      >
        <For each={filterRolloffOptions}>
          {(rolloff) => <option value={rolloff}>{rolloff}</option>}
        </For>
      </select>
      <MoogKnobWithLabel
        onChange={(frequency) => props.filter.set({ frequency })}
        min={1}
        max={20000}
        value={filterState.frequency}
        label={'Cutoff'}
      />
      <MoogKnobWithLabel
        onChange={(resonance) => props.filter.set({ resonance })}
        min={0.1}
        max={50}
        value={filterState.resonance}
        label={'Resonance'}
      />
      <FrequencyResponseDisplay
        frequencyResponse={filterState.frequencyResponse}
      />
    </div>
  );
};

const FrequencyResponseDisplay = (props: {
  frequencyResponse: Float32Array;
}) => {
  let canvasRef: HTMLCanvasElement | undefined;
  const [context, setContext] = createSignal<
    CanvasRenderingContext2D | null | undefined
  >();

  const [height, setHeight] = createSignal(0);
  const [width, setWidth] = createSignal(0);

  const setDimensions = () => {
    setHeight(canvasRef?.height ?? 0);
    setWidth(canvasRef?.width ?? 0);
  };

  onMount(() => {
    setContext(canvasRef?.getContext('2d'));
    canvasRef?.addEventListener('resize', setDimensions);
    setDimensions();
  });

  onCleanup(() => {
    canvasRef?.removeEventListener('resize', setDimensions);
  });

  createEffect(() => {
    const ctx = context();

    if (!ctx) return;

    const getX = (i: number) => i * (width() ?? 0);
    const getY = (y: number) => height() - (y / 5) * (height() ?? 0);

    const points = props.frequencyResponse;

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

  return <canvas ref={canvasRef} width={500} height={150} />;
};
