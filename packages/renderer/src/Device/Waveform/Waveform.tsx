import { css } from '@emotion/css';
import type { Accessor, JSX } from 'solid-js';
import {
  For,
  createEffect,
  createMemo,
  createSignal,
  splitProps,
  Show,
  createUniqueId,
} from 'solid-js';
import { Row } from '../../UI/Grid';
import { randomColor } from '../../engine/helpers';
import { Canvas } from './Canvas';
import { Region } from './Region';
import { drawWaveformWithPeaks } from './drawFunctions';
import { warmupCache } from './getWaveformPeaks';

export const Waveform = (
  allProps: {
    buffer?: AudioBuffer;
    position: number;
    zoom: number;
    onStateChange: (state: { position?: number; zoom?: number }) => void;
    cacheKey: string;
    regions?: Accessor<Region>[];
    onCreateRegion?: (region: Partial<Region> & Pick<Region, 'id'>) => void;
    onUpdateRegion?: (region: Partial<Region> & Pick<Region, 'id'>) => void;
    onClickRegion?: (region: Region, event: MouseEvent) => void;
    onDblClickRegion?: (region: Region, event: MouseEvent) => void;
  } & JSX.IntrinsicElements['div'],
) => {
  const [props, divProps] = splitProps(allProps, [
    'buffer',
    'position',
    'zoom',
    'onStateChange',
    'onCreateRegion',
    'onUpdateRegion',
    'onClickRegion',
    'onDblClickRegion',
    'cacheKey',
    'regions',
  ]);

  const rawData = createMemo(() => props.buffer?.getChannelData(0));
  const duration = createMemo(() => allProps.buffer?.duration ?? 0);
  const [progress, setProgress] = createSignal(0);

  const [newRegion, setNewRegion] = createSignal<Region>();

  createEffect(() => {
    const data = rawData();
    if (!data) return;
    warmupCache(data, props.cacheKey, setProgress);
  });

  const endTime = createMemo(() => props.position + duration() / props.zoom);

  let animationFrame: number;
  const [scrollDivRef, setScrollDivRef] = createSignal<HTMLDivElement>();

  const updateState = ({
    position,
    zoom,
  }: {
    position?: number;
    zoom?: number;
  }) => {
    const newZoom = Math.max(1, zoom ?? props.zoom);
    const maxPosition = duration() - duration() / newZoom;

    const newState = {
      ...(position !== undefined && {
        position: clamp(position, 0, maxPosition),
      }),
      ...(zoom !== undefined && { zoom: newZoom }),
    };

    props.onStateChange(newState);
  };

  const getPosition = (clientX: number) => {
    const parent = scrollDivRef()!.parentElement!;

    const width = scrollDivRef()!.clientWidth;
    const rect = parent.getBoundingClientRect();

    const position =
      ((clientX - rect.left + parent.scrollLeft) / width) * duration();

    return position;
  };

  createEffect(() => {
    const div = scrollDivRef();

    if (!div || !div.parentElement) return;

    const maxPosition = duration() - duration() / props.zoom;
    const scrollAmount = props.position / maxPosition;

    const { clientWidth } = div.parentElement;

    div.parentElement.scrollLeft =
      scrollAmount * (clientWidth * props.zoom - clientWidth);

    div.style.width = `${clientWidth * props.zoom}px`;
  });

  return (
    <Show when={progress() === 1} fallback={Math.round(progress() * 100)}>
      <Row
        {...divProps}
        classList={{
          ...divProps.classList,
          [css`
            position: relative;
          `]: true,
        }}
      >
        <Canvas
          class={css`
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            height: 100%;
          `}
          onDraw={(ctx, { width, height }) => {
            const data = rawData();

            if (!data || !duration()) return;

            const visibleLength = Math.min(
              ((endTime() - props.position) / duration()) * data.length,
              data.length,
            );

            const samplesPerPx = visibleLength / width;

            if (!samplesPerPx) return;

            const startY = height / 2;

            const start = Math.floor(
              (props.position / duration()) * (data.length / samplesPerPx),
            );
            const end = start + Math.min(visibleLength, Math.ceil(width));

            cancelAnimationFrame(animationFrame);

            animationFrame = requestAnimationFrame(() => {
              drawWaveformWithPeaks({
                data,
                samplesPerPx,
                cacheKey: props.cacheKey,
                ctx,
                startY,
                start,
                end,
                width,
                height,
              });
            });
          }}
        />
        <Row
          class={css`
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            height: 100%;
          `}
          overflowX={'auto'}
          onWheel={(event) => {
            event.preventDefault();
            const zoomedLength = duration() / props.zoom;
            const { width, height, left } =
              event.currentTarget.getBoundingClientRect();

            const deltaX = event.altKey ? event.deltaY : event.deltaX;
            const deltaY = event.altKey ? event.deltaX : event.deltaY;

            if (Math.abs(deltaX) > Math.abs(deltaY)) {
              const newPosition =
                props.position + (deltaX / width / props.zoom) * 1000;

              updateState({ position: newPosition });
            } else {
              const pointerPositionPercentage = (event.clientX - left) / width;
              const pointerPosition =
                props.position + zoomedLength * pointerPositionPercentage;

              const newZoom = props.zoom * (1 + deltaY / height);
              const newZoomedLength = duration() / newZoom;
              const newPosition =
                pointerPosition - pointerPositionPercentage * newZoomedLength;

              updateState({ position: newPosition, zoom: newZoom });
            }
          }}
          onScroll={(event) => {
            event.preventDefault();
            const { width } = scrollDivRef()!.getBoundingClientRect();
            const { scrollLeft, clientWidth } = event.currentTarget;

            const scrollableWidth = width - clientWidth;
            const scrollAmount =
              scrollableWidth > 0 ? scrollLeft / scrollableWidth : 0;
            const maxPosition = duration() - duration() / props.zoom;

            updateState({ position: maxPosition * scrollAmount });
          }}
        >
          <div
            class={css`
              height: 100%;
              position: relative;
            `}
            onMouseDown={(event) => {
              if (props.regions === undefined) return;
              event.preventDefault();
              const mouseDownPosition = getPosition(event.clientX);

              const onMouseMove = (event: MouseEvent) => {
                const mouseMovePosition = getPosition(event.clientX);

                const createdRegion = newRegion();
                if (!createdRegion) {
                  const id = createUniqueId();
                  const color = randomColor();

                  const region = {
                    id,
                    color,
                    start: Math.min(mouseDownPosition, mouseMovePosition),
                    end: Math.max(mouseDownPosition, mouseMovePosition),
                  };

                  setNewRegion(region);
                  props.onCreateRegion?.(region);
                } else {
                  const region = {
                    ...createdRegion,
                    start: Math.min(mouseDownPosition, mouseMovePosition),
                    end: Math.max(mouseDownPosition, mouseMovePosition),
                  };

                  props.onUpdateRegion?.(region);
                }
              };

              const onMouseUp = () => {
                setNewRegion(undefined);
                scrollDivRef()?.removeEventListener('mousemove', onMouseMove);
                scrollDivRef()?.removeEventListener('mouseup', onMouseUp);
              };

              scrollDivRef()?.addEventListener('mousemove', onMouseMove);
              scrollDivRef()?.addEventListener('mouseup', onMouseUp);
            }}
            ref={setScrollDivRef}
          >
            <For each={props.regions}>
              {(region) => (
                <Region
                  region={region()}
                  duration={duration()}
                  onUpdateRegion={(region) => props.onUpdateRegion?.(region)}
                  onClickRegion={(region, event) =>
                    props.onClickRegion?.(region, event)
                  }
                  onDblClickRegion={(region, event) =>
                    props.onDblClickRegion?.(region, event)
                  }
                  getPosition={getPosition}
                />
              )}
            </For>
          </div>
        </Row>
      </Row>
    </Show>
  );
};

const clamp = (value: number, min: number, max: number) => {
  return Math.max(min, Math.min(max, value));
};
