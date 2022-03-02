import {
  createEffect,
  createMemo,
  createSignal,
  onCleanup,
  onMount,
  JSX,
  splitProps,
  Show,
} from 'solid-js';
import { getPeakAtCached, warmupCache } from './getWaveformPeaks';

export const Waveform = (
  allProps: {
    buffer?: AudioBuffer;
    start: number;
    end: number;
    cacheKey: string;
  } & JSX.IntrinsicElements['canvas']
) => {
  const [props, canvasProps] = splitProps(allProps, [
    'buffer',
    'start',
    'end',
    'cacheKey',
  ]);

  const rawData = createMemo(() => {
    return props.buffer?.getChannelData(0);
  });

  const [progress, setProgress] = createSignal(0);

  createEffect(() => {
    const data = rawData();
    if (!data) return;
    warmupCache(data, props.cacheKey, setProgress);
  });

  return (
    <Show when={progress() === 1} fallback={Math.round(progress() * 100)}>
      <Canvas
        {...canvasProps}
        onDraw={(ctx, { width, height }) => {
          const data = rawData();
          const duration = props.buffer?.duration;

          if (!data || !duration) return;

          const visibleLength = Math.min(
            ((props.end - props.start) / duration) * data.length,
            data.length
          );

          const samplesPerPx = visibleLength / width;
          if (!samplesPerPx) return;

          const startY = height / 2;

          const startIndex = Math.floor(
            (props.start / duration) * (data.length / samplesPerPx)
          );

          ctx.clearRect(0, 0, width, height);
          ctx.beginPath();

          for (let x = 0; x < width; x++) {
            const y =
              getPeakAtCached(
                data,
                samplesPerPx,
                x + startIndex,
                props.cacheKey
              ) / 128;

            ctx.moveTo(x, startY + y * startY);
            ctx.lineTo(x, startY - y * startY);
          }

          ctx.moveTo(0, startY);

          ctx.closePath();
          ctx.stroke();
        }}
      />
    </Show>
  );
};

const Canvas = (
  allProps: {
    onDraw: (
      context: CanvasRenderingContext2D,
      dimensions: { width: number; height: number }
    ) => void;
  } & JSX.IntrinsicElements['canvas']
) => {
  const [props, canvasProps] = splitProps(allProps, ['onDraw']);
  let canvasRef: HTMLCanvasElement | undefined;

  const [context, setContext] = createSignal<
    CanvasRenderingContext2D | null | undefined
  >();

  const setDimensions = () => {
    const clientRect = canvasRef?.getBoundingClientRect();
    setWidth(clientRect?.width ?? 0);
    setHeight(clientRect?.height ?? 0);
  };

  const observer = new ResizeObserver(setDimensions);

  onMount(() => {
    setContext(canvasRef?.getContext('2d'));

    observer.observe(canvasRef!);

    setDimensions();
  });

  onCleanup(() => {
    observer.unobserve(canvasRef!);
  });

  const [height, setHeight] = createSignal(0);
  const [width, setWidth] = createSignal(0);

  createEffect(() => {
    const ctx = context();
    if (!ctx) return;

    const dpi = window.devicePixelRatio;

    canvasRef?.setAttribute('width', (width() * dpi).toString());
    canvasRef?.setAttribute('height', (height() * dpi).toString());

    ctx.scale(dpi, dpi);
    props.onDraw(ctx, { width: width(), height: height() });
  });

  return <canvas {...canvasProps} ref={canvasRef}></canvas>;
};
