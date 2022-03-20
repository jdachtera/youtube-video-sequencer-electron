import { css } from '@emotion/css';

import {
  createEffect,
  createMemo,
  createSignal,
  splitProps,
  Show,
  For,
  batch,
  createUniqueId,
  onCleanup,
  untrack,
} from 'solid-js';
import type { JSX } from 'solid-js';
import { Row } from '../../UI/Grid';
import { Canvas } from './Canvas';
import { drawWaveformWithPeaks } from './drawFunctions';
import { warmupCache } from './getWaveformPeaks';
import { randomColor } from '../../engine/helpers';
import type { DeepReadonly } from 'solid-js/store';

export type Region = { id: string; color: string; start: number; end: number };

export const Waveform = (
  allProps: {
    buffer?: AudioBuffer;
    position: number;
    zoom: number;
    onStateChange: (state: { position?: number; zoom?: number }) => void;
    cacheKey: string;
    regions?: DeepReadonly<Region[]>;
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

  const [newRegionId, setNewRegionId] = createSignal<string>();

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

            updateState({
              position: maxPosition * scrollAmount,
            });
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
              const handleMouseMove = (event: MouseEvent) => {
                event.preventDefault();
                scrollDivRef()?.removeEventListener(
                  'mousemove',
                  handleMouseMove,
                );
                const id = createUniqueId();
                const color = randomColor();
                const mouseMovePosition = getPosition(event.clientX);

                const region = {
                  id,
                  color,
                  start: Math.min(mouseDownPosition, mouseMovePosition),
                  end: Math.max(mouseDownPosition, mouseMovePosition),
                };

                setNewRegionId(id);
                props.onCreateRegion?.(region);
              };
              scrollDivRef()?.addEventListener('mousemove', handleMouseMove);
            }}
            ref={setScrollDivRef}
          >
            <For each={props.regions}>
              {(region) => (
                <Region
                  isDragging={region.id === newRegionId()}
                  region={region}
                  duration={duration()}
                  onUpdateRegion={(region) => {
                    setNewRegionId(undefined);
                    props.onUpdateRegion?.(region);
                  }}
                  onClickRegion={props.onClickRegion}
                  onDblClickRegion={props.onDblClickRegion}
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

const regionDragHandles = ['LEFT', 'MIDDLE', 'RIGHT'] as const;
type RegionDragHandle = typeof regionDragHandles[number];

const Region = (props: {
  region: DeepReadonly<Region>;
  duration: number;
  onUpdateRegion: (region: Partial<Region> & Pick<Region, 'id'>) => void;
  onClickRegion?: (region: Region, event: MouseEvent) => void;
  onDblClickRegion?: (region: Region, event: MouseEvent) => void;
  getPosition: (clientX: number) => number;
  isDragging?: boolean;
}) => {
  const [dragHandle, setDragHandle] = createSignal<RegionDragHandle>('LEFT');
  const [initialRegion, setInitialRegion] = createSignal(
    untrack(() => ({ ...props.region })),
  );
  const [isDragging, setIsDragging] = createSignal(
    untrack(() => props.isDragging ?? false),
  );

  const [offset, setOffset] = createSignal(0);

  const handleMouseMove = (event: MouseEvent) => {
    event.preventDefault();
    const position = props.getPosition(event.clientX);

    switch (dragHandle()) {
      case 'LEFT':
        props.onUpdateRegion({
          id: props.region.id,
          start: Math.min(position, initialRegion().end),
          end: Math.max(position, initialRegion().end),
        });
        break;
      case 'RIGHT':
        props.onUpdateRegion({
          id: props.region.id,
          start: Math.min(position, initialRegion().start),
          end: Math.max(position, initialRegion().start),
        });
        break;
      case 'MIDDLE':
        props.onUpdateRegion({
          id: props.region.id,
          start: position - offset(),
          end:
            position - offset() + (initialRegion().end - initialRegion().start),
        });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const cleanup = () => {
    window.removeEventListener('mousemove', handleMouseMove);
    window.removeEventListener('mouseup', handleMouseUp);
  };

  createEffect(() => {
    if (isDragging()) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    } else {
      cleanup();
    }
  });

  onCleanup(() => cleanup());

  return (
    <div
      class={css`
        display: flex;
        justify-content: space-between;
        position: absolute;
        top: 0;
        height: 100%;
        opacity: 0.7;
      `}
      style={{
        width: `${
          ((props.region.end - props.region.start) / props.duration) * 100
        }%`,
        left: `${(props.region.start / props.duration) * 100}%`,
        'background-color': props.region.color,
      }}
    >
      <For each={regionDragHandles}>
        {(handleName) => (
          <div
            class={css`
              border-left: 5px rgba(0, 0, 0, 0) solid;
              height: 100%;
              cursor: ${handleName === 'MIDDLE' ? 'move' : 'col-resize'};
              ${handleName === 'MIDDLE' ? 'flex: 1' : ''}
            `}
            onMouseDown={(event) => {
              event.preventDefault();
              event.stopPropagation();
              batch(() => {
                setDragHandle(handleName);
                setInitialRegion({ ...props.region });
                setOffset(
                  handleName === 'MIDDLE'
                    ? props.getPosition(event.clientX) - props.region.start
                    : 0,
                );
                setIsDragging(true);
              });
            }}
            onClick={props.onClickRegion && [props.onClickRegion, props.region]}
            onDblClick={
              props.onDblClickRegion && [props.onDblClickRegion, props.region]
            }
          ></div>
        )}
      </For>
    </div>
  );
};

const clamp = (value: number, min: number, max: number) => {
  return Math.max(min, Math.min(max, value));
};
