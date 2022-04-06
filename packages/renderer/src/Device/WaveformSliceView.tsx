import { mergeProps } from 'solid-js';

import { css, keyframes } from '@emotion/css';

import type { Slice } from '../engine/device/Slice';
import { createSignalFromEventEmitter } from '../engine/EngineBase';
import { Waveform } from './Waveform/Waveform';

type WaveformSliceViewProps = {
  slice: Slice;
  center: number;
  height?: number;
  collapsed: boolean;
  onClickWaveform: (event: MouseEvent) => void;
};

export const WaveformSliceView = (
  propsWithoutDefaults: WaveformSliceViewProps,
) => {
  const props = mergeProps({ currentTime: 0 }, propsWithoutDefaults);

  const handleClickWaveform = (event: MouseEvent) =>
    props.onClickWaveform(event);

  const buffer = createSignalFromEventEmitter(
    () => props.slice,
    (slice) =>
      slice.player.buffer.length
        ? slice.player.buffer.toMono().get()
        : undefined,
    ['load', 'reverseUpdated'],
  );

  const isPlaying = createSignalFromEventEmitter(
    () => props.slice,
    (slice) => slice.player.state === 'started',
    ['playingUpdated'],
  );

  return (
    <div
      classList={{
        [css`
          min-width: 300px;
          width: 100%;
          height: ${props.height ?? 50}px;
          position: relative;
        `]: true,
      }}
    >
      <Waveform
        classList={{
          [css`
            min-width: 300px;
            width: 100%;
            height: ${props.height ?? 50}px;
          `]: true,
        }}
        buffer={buffer()}
        cacheKey={`${props.slice.id}-${props.slice.start}${props.slice.end}`}
        onClick={handleClickWaveform}
        position={0}
        zoom={1}
        onStateChange={() => {
          //
        }}
      />
      <div
        classList={{
          [css`
            position: absolute;
            top: 0;
            left: 0;
            pointer-events: none;
            background: black;

            height: ${props.height ?? 50}px;
            width: 1px;
          `]: true,
          [css`
            animation: ${keyframes`
               0% {
                 left: 0px;
               }
               100% {
                 left: 100%;
               }
             `} ${props.slice.end - props.slice.start}s linear;
          `]: isPlaying(),
        }}
      />
    </div>
  );
};
