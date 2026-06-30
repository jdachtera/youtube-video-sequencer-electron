/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { css } from '@emotion/css';
import { createSignal, onMount, onCleanup, createEffect, Show } from 'solid-js';
import { Waveform, Regions } from 'solid-waveform';
import type { Region } from 'solid-waveform';
import { Transport } from 'tone';
import { AkaiButton } from '../UI/AkaiButton';
import { LCDFrame, LCDLine } from '../UI/LCD';
import { NumberInputWithArrowButtons } from '../UI/NumberInputWithArrowButtons';
import { formatTime } from '../UI/format';
import { LCD } from '../UI/lcdStyles';
import {
  createArraySignalFromEventEmitter,
  createSignalFromEventEmitter,
} from '../engine/EngineBase';
import type { SamplerDevice } from '../engine/device/Sampler';
import { Slice } from '../engine/device/Slice';

export const SamplerView = (props: { sampler: SamplerDevice }) => {
  const [waveformCenter, setWaveformCenter] = createSignal(0);

  // Local view state so the sampler editor isn't a fixed, oversized panel:
  // it can be collapsed to its header and its height dragged.
  const [collapsed, setCollapsed] = createSignal(false);
  const [waveHeight, setWaveHeight] = createSignal(180);

  const startResize = (event: MouseEvent) => {
    event.preventDefault();
    const startY = event.clientY;
    const startHeight = waveHeight();
    const onMove = (moveEvent: MouseEvent) =>
      setWaveHeight(
        Math.max(80, Math.min(600, startHeight + (moveEvent.clientY - startY))),
      );
    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  // Dragging a region edge fires onUpdateRegion on every pointer frame. Coalesce
  // those to at most one apply per animation frame so the reactive cascade
  // (store reconcile + slice buffer reslice) runs once per frame rather than
  // once per pointer event. Keyed by region id so simultaneous edits don't
  // clobber each other; the latest value for each region wins.
  let pendingRegionUpdates = new Map<string, Region>();
  let regionUpdateFrame: number | undefined;
  const flushRegionUpdates = () => {
    regionUpdateFrame = undefined;
    const updates = pendingRegionUpdates;
    pendingRegionUpdates = new Map();
    updates.forEach((region) =>
      props.sampler.findSlice(region.id)?.set(region),
    );
  };
  const queueRegionUpdate = (region: Region) => {
    pendingRegionUpdates.set(region.id, region);
    if (regionUpdateFrame === undefined) {
      regionUpdateFrame = requestAnimationFrame(flushRegionUpdates);
    }
  };
  onCleanup(() => {
    if (regionUpdateFrame !== undefined)
      cancelAnimationFrame(regionUpdateFrame);
  });

  const [chopCount, setChopCount] = createSignal(8);

  // Vertical waveform amplitude scale (shift+wheel). Kept as local view
  // state since the Sampler device only persists position/zoom.
  const [scale, setScale] = createSignal(1);

  // Slice the whole sample into N equal pieces, each its own playable track —
  // the classic chop workflow for turning a YouTube clip into an instrument.
  const chopSample = () => {
    const duration = buffer()?.duration;
    if (!duration) return;
    const count = Math.max(1, Math.min(64, Math.round(chopCount())));
    for (let i = 0; i < count; i++) {
      props.sampler.engine.createSliceTrack(
        Slice.normalizeData({
          url: props.sampler.url,
          title: `${props.sampler.title || 'Chop'} ${i + 1}`,
          start: (i * duration) / count,
          end: ((i + 1) * duration) / count,
        }),
      );
    }
  };

  const zoom = createSignalFromEventEmitter(
    () => props.sampler,
    (sampler) => sampler.zoom,
    ['zoomUpdated'],
  );

  const regions = createArraySignalFromEventEmitter(
    () => props.sampler,
    (sampler) => sampler.slices,
    ({ id, color, start, end }) => ({ id, color, start, end }),
    ['sliceAdded', 'sliceRemoved', 'sliceUpdated'],
  );

  const position = createSignalFromEventEmitter(
    () => props.sampler,
    (sampler) => sampler.position,
    ['positionUpdated'],
  );

  const [buffer, setBuffer] = createSignal<AudioBuffer | undefined>();
  createEffect(() => {
    (async () => {
      await props.sampler.hasLoaded();
      setBuffer(props.sampler.buffer.get());
    })();
  });

  const stopPlayer = () => {
    props.sampler.stop();
  };

  const handleSliceSelected = (slice?: Slice) => {
    if (!slice) return;

    const { duration } = slice.sampler.buffer;
    if (duration > 0) {
      setWaveformCenter(slice.start / duration);
      if (
        props.sampler.engine.transport.state === 'stopped' &&
        slice.player.state === 'started'
      ) {
        slice.stop();
      } else {
        slice.stop();
        slice.play();
      }
    }
  };

  onMount(async () => {
    Transport.on('stop', stopPlayer);
    Transport.on('pause', stopPlayer);
    Transport.on('loopEnd', stopPlayer);
    props.sampler.on('sliceSelected', handleSliceSelected);
  });

  onCleanup(() => {
    Transport.off('stop', stopPlayer);
    Transport.off('pause', stopPlayer);
    Transport.off('loopEnd', stopPlayer);
    props.sampler.off('sliceSelected', handleSliceSelected);
  });

  return (
    <div
      class={css`
        border: 2px outset white;
        border-radius: 8px;
        background: radial-gradient(#bdbdbd 0%, #f3f3f3c4 100%);
        display: flex;
        flex: 1;
        margin: 0px 10px;
      `}
    >
      <LCDFrame
        class={css`
          flex: 1;
        `}
      >
        <LCD>
          <LCDLine
            class={css`
              display: flex;
              justify-content: space-between;
              align-items: center;
              gap: 8px;
            `}
          >
            <span
              class={css`
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
              `}
            >
              {props.sampler.title || props.sampler.url}
            </span>
            <span
              class={css`
                display: flex;
                gap: 4px;
                flex-shrink: 0;
              `}
            >
              <AkaiButton
                label={collapsed() ? '▸' : '▾'}
                onClick={() => setCollapsed((value) => !value)}
              />
              <AkaiButton
                label="x"
                onClick={() =>
                  props.sampler.engine.setCurrentSampler(undefined)
                }
              />
            </span>
          </LCDLine>

          <Show when={!collapsed()}>
            <LCDLine
              class={css`
                display: flex;
                justify-content: space-between;
              `}
            >
              <div>{formatTime(buffer()?.duration ?? 0)}s</div>
              <div>{formatTime(position())}s</div>
            </LCDLine>
            <div
              class={css`
                display: flex;
                align-items: center;
                gap: 12px;
                flex-wrap: wrap;
              `}
            >
              <span>
                Zoom:{' '}
                <NumberInputWithArrowButtons
                  value={zoom()}
                  onChange={(zoom) => props.sampler.set({ zoom })}
                  parse={(value) => Math.round(parseFloat(value)) / 100}
                  format={(value) => Math.round(value * 100).toString()}
                />
              </span>
              <span
                class={css`
                  display: flex;
                  align-items: center;
                  gap: 4px;
                `}
              >
                Chop:{' '}
                <NumberInputWithArrowButtons
                  value={chopCount()}
                  min={1}
                  max={64}
                  step={1}
                  onChange={(value) => setChopCount(value)}
                />
                <AkaiButton onClick={chopSample}>Chop sample</AkaiButton>
              </span>
            </div>
            <Waveform
              buffer={buffer()}
              zoom={zoom()}
              position={position()}
              scale={scale()}
              onZoomChange={(zoom) => props.sampler.set({ zoom })}
              onPositionChange={(position) => props.sampler.set({ position })}
              onScaleChange={setScale}
              class={css`
                width: 100%;
                height: ${waveHeight()}px;
              `}
            >
              <Regions
                regions={regions().map((region) => region())}
                onCreateRegion={(region) =>
                  props.sampler.engine.createSliceTrack(
                    Slice.normalizeData({ ...region, url: props.sampler.url }),
                  )
                }
                onUpdateRegion={queueRegionUpdate}
                onClickRegion={(region) => {
                  props.sampler.findSlice(region.id)?.play();
                }}
              />
            </Waveform>
            {/* Drag to resize the waveform height. */}
            <div
              onMouseDown={startResize}
              class={css`
                height: 8px;
                cursor: row-resize;
                margin: 2px 0 -4px;
                border-radius: 3px;
                background: repeating-linear-gradient(
                  90deg,
                  #888,
                  #888 2px,
                  transparent 2px,
                  transparent 5px
                );
                opacity: 0.5;
                &:hover {
                  opacity: 0.9;
                }
              `}
            />
          </Show>
        </LCD>
      </LCDFrame>
    </div>
  );
};
