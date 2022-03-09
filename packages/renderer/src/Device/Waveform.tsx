import type { JSX } from 'solid-js';
import {
  createEffect,
  createMemo,
  createSignal,
  onCleanup,
  onMount,
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
  } & JSX.IntrinsicElements['canvas'],
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

  let animationFrame: number;

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
            data.length,
          );

          const samplesPerPx = visibleLength / width;
          if (!samplesPerPx) return;

          cancelAnimationFrame(animationFrame);

          animationFrame = requestAnimationFrame(() => {
            const startY = height / 2;

            const startIndex = Math.floor(
              (props.start / duration) * (data.length / samplesPerPx),
            );

            const numberOfPeaks = Math.min(visibleLength, Math.ceil(width));
            const peaks = Array.from({
              length: numberOfPeaks,
            }).map((_, i): [number, number, number, number] => {
              const [min, max] = getPeakAtCached(
                data,
                samplesPerPx,
                i + startIndex,
                props.cacheKey,
              );
              const x = (i / numberOfPeaks) * width;

              const minY = startY + (min / 1024) * startY;
              const maxY = startY + (max / 1024) * startY;

              const absMaxY = Math.abs(min) > Math.abs(max) ? minY : maxY;

              return [x, absMaxY, minY, maxY];
            });

            ctx.clearRect(0, 0, width, height);

            drawWaveform(ctx, peaks);

            const peaksOpacity =
              Math.min(1, Math.max(0, Math.log(samplesPerPx / 96)) - 0.5) + 0.5;

            ctx.strokeStyle = `rgba(0,0,0,${peaksOpacity})`;

            drawPeaks(ctx, peaks);

            if (samplesPerPx < 100 / width) {
              ctx.strokeStyle = `rgb(0,0,0)`;
              const radius = width / 256;

              drawSampleDots(peaks, ctx, radius);
            }
          });
        }}
      />
    </Show>
  );
};

const Canvas = (
  allProps: {
    onDraw: (
      context: CanvasRenderingContext2D,
      dimensions: { width: number; height: number },
    ) => void;
  } & JSX.IntrinsicElements['canvas'],
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

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    observer.observe(canvasRef!);

    setDimensions();
  });

  onCleanup(() => {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
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

function drawSampleDots(
  peaks: [number, number, number, number][],
  ctx: CanvasRenderingContext2D,
  radius: number,
) {
  peaks.forEach(([x1, avgMaxY]) => {
    ctx.beginPath();
    ctx.arc(x1, avgMaxY, radius, 0, 360);
    ctx.closePath();
    ctx.fill();
  });
}

function drawPeaks(
  ctx: CanvasRenderingContext2D,
  peaks: [number, number, number, number][],
) {
  ctx.beginPath();
  peaks.forEach(([x1, _, minY, maxY]) => {
    ctx.moveTo(x1, minY);
    ctx.lineTo(x1, maxY);
  });
  ctx.closePath();
  ctx.stroke();
}

function drawWaveform(
  ctx: CanvasRenderingContext2D,
  peaks: [number, number, number, number][],
) {
  ctx.beginPath();
  ctx.strokeStyle = 'rgb(0,0,0)';

  for (let i = 0; i < peaks.length - 1; i++) {
    const [x1, y1] = peaks[i];
    const [x2, y2] = peaks[i + 1];

    const x_mid = (x1 + x2) / 2;
    const y_mid = (y1 + y2) / 2;
    const cp_x1 = (x_mid + x1) / 2;
    const cp_x2 = (x_mid + x2) / 2;

    ctx.quadraticCurveTo(cp_x1, y1, x_mid, y_mid);
    ctx.quadraticCurveTo(cp_x2, y2, x2, y2);
  }
  ctx.stroke();
}
