/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { createSignal, onMount, onCleanup } from 'solid-js';

import { Transport } from 'tone';

import { css } from '@emotion/css';

import type { SamplerDevice } from '../engine/device/Sampler';

import { Slice } from '../engine/device/Slice';
import { LCDFrame, LCDLine } from '../UI/LCD';
import { LCD } from '../UI/lcdStyles';
import { AkaiButton } from '../UI/AkaiButton';

import {
  createArraySignalFromEventEmitter,
  createSignalFromEventEmitter,
} from '../engine/EngineBase';
import { formatTime } from '../UI/format';
import { NumberInputWithArrowButtons } from '../UI/NumberInputWithArrowButtons';

import { Waveform } from './Waveform/Waveform';

export const SamplerView = (props: { sampler: SamplerDevice }) => {
  const [waveformCenter, setWaveformCenter] = createSignal(0);

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
            <div>{formatTime(buffer()?.duration ?? 0)}s</div>
            <div>{formatTime(position())}s</div>
          </LCDLine>
          <div>
            Zoom:{' '}
            <NumberInputWithArrowButtons
              value={zoom()}
              onChange={(zoom) => props.sampler.set({ zoom })}
              parse={(value) => Math.round(parseFloat(value)) / 100}
              format={(value) => Math.round(value * 100).toString()}
            />
          </div>
          <Waveform
            buffer={buffer()}
            zoom={zoom()}
            position={position()}
            cacheKey={props.sampler.url}
            onStateChange={(state) => props.sampler.set(state)}
            regions={regions()}
            onCreateRegion={(region) => {
              props.sampler.createSlice(Slice.normalizeData(region));
            }}
            onUpdateRegion={(region) => {
              props.sampler.findSlice(region.id)?.set(region);
            }}
            onClickRegion={(region) => {
              props.sampler.findSlice(region.id)?.play();
            }}
            class={css`
              width: 800px;
              height: 200px;
            `}
          />
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
