import type { JSX } from 'solid-js';
import {
  createEffect,
  createSignal,
  onCleanup,
  onMount,
  splitProps,
} from 'solid-js';

export const Canvas = (
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

    //canvasRef?.removeAttribute('width');
    //canvasRef?.removeAttribute('height');
  });

  return <canvas {...canvasProps} ref={canvasRef}></canvas>;
};
