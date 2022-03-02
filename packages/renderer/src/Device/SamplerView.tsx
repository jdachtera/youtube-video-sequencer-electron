/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { createSignal, onMount, onCleanup } from 'solid-js';

import type { Region } from 'wavesurfer.js/src/plugin/regions';
import { Transport } from 'tone';

import { css } from '@emotion/css';

import type { SamplerDevice } from '../engine/device/Sampler';
import { WavesurferView } from './WavesurferView';

import type { Slice } from '../engine/device/Slice';
import { LCDFrame, LCDLine } from '../UI/LCD';
import { LCD } from '../UI/lcdStyles';
import { AkaiButton } from '../UI/AkaiButton';
import { Waveform } from './Waveform';
import { createSignalFromEventEmitter } from '../engine/EngineBase';
import { formatTime } from '../UI/format';

export const SamplerView = (props: { sampler: SamplerDevice }) => {
  const [waveformCenter, setWaveformCenter] = createSignal(0);
  const [length, setLength] = createSignal(0);

  const zoom = createSignalFromEventEmitter(
    () => props.sampler,
    (sampler) => sampler.zoom,
    ['zoomUpdated'],
  );

  const position = createSignalFromEventEmitter(
    () => props.sampler,
    (sampler) => sampler.position,
    ['positionUpdated'],
  );

  const buffer = createSignalFromEventEmitter(
    () => props.sampler,
    (sampler) => sampler.buffer.get(),
    ['load'],
  );

  const stopPlayer = () => {
    props.sampler.stop();
  };

  const setZoom = (zoom: number) => {
    props.sampler.set({ zoom });
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
        slice.play();
      }
    }
  };

  onMount(async () => {
    Transport.on('stop', stopPlayer);
    Transport.on('pause', stopPlayer);
    Transport.on('loopEnd', stopPlayer);

    await props.sampler.hasLoaded();

    props.sampler.on('sliceSelected', handleSliceSelected);

    setLength(props.sampler.buffer.duration);
  });

  onCleanup(() => {
    Transport.off('stop', stopPlayer);
    Transport.off('pause', stopPlayer);
    Transport.off('loopEnd', stopPlayer);
    props.sampler.off('sliceSelected', handleSliceSelected);
  });

  const handleClickRegion = (region: Region) => {
    const slice = props.sampler.findSlice(region.id);

    if (!slice) return;

    const { duration } = slice.player.buffer;
    if (duration > 0) {
      slice.play();
    }
  };

  return (
    <div
      classList={{
        [css`
          border: 2px oustet white;
          border-radius: 8px;
          background: radial-gradient(#bdbdbd 0%, #f3f3f3c4 100%);
          display: flex;

          margin: 0px 10px;
        `]: true,
      }}
    >
      <LCDFrame>
        <LCD>
          <LCDLine
            class={css`
              display: flex;
              justify-content: space-between;
            `}
          >
            {props.sampler.url}
          </LCDLine>
          <LCDLine
            class={css`
              display: flex;
              justify-content: space-between;
            `}
          >
            <div>{formatTime(length())}s</div>
            <div>{formatTime(position())}s</div>
          </LCDLine>
          <div>Zoom: {Math.round(zoom() * 100)}%</div>
          <Waveform
            cacheKey={props.sampler.url}
            buffer={buffer()}
            start={position()}
            end={position() + Math.round((length() / zoom()) * 100) / 100}
            onWheel={(event) => {
              event.preventDefault();
              const zoomedLength = length() / zoom();

              if (Math.abs(event.deltaX) > Math.abs(event.deltaY)) {
                const newPosition = Math.min(
                  Math.max(
                    position() +
                      event.deltaX / window.innerWidth / zoomedLength,
                    0,
                  ),
                  length() - zoomedLength,
                );
                props.sampler.set({ position: newPosition });
              } else {
                const pointerPositionPercentage =
                  event.offsetX /
                  +getComputedStyle(event.currentTarget).width.slice(0, -2);

                const pointerPosition =
                  position() + zoomedLength * pointerPositionPercentage;

                const newZoom = Math.max(
                  zoom() + event.deltaY / window.innerHeight / 10,
                  1,
                );

                const newZoomedLength = length() / newZoom;

                const newPosition =
                  pointerPosition - pointerPositionPercentage * newZoomedLength;

                // console.log({
                //   zoomedLength,
                //   pointerPosition,
                //   pointerPositionPercentage,

                //   newZoomedLength,
                //   newZoom,
                //   newPosition,
                // });

                props.sampler.set({
                  zoom: newZoom,
                  position: Math.max(newPosition, 0),
                });
              }
            }}
            class={css`
              height: 200px;
            `}
          />
          {/*<WavesurferView
            sampler={props.sampler}
            center={waveformCenter()}
            onRegionClick={handleClickRegion}
          />*/}
        </LCD>
        <div
          class={css`
            display: flex;
            justify-content: space-evenly;
            margin-top: 20px;
            padding: 0 5px;
          `}
        >
          <AkaiButton onClick={() => setZoom(1)} />
          <AkaiButton onClick={() => setZoom(2)} />
          <AkaiButton onClick={() => setZoom(3)} />
          <AkaiButton onClick={() => setZoom(4)} />
          <AkaiButton onClick={() => setZoom(5)} />
        </div>
      </LCDFrame>
    </div>
  );
};
