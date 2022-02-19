import {
  createEffect,
  mergeProps,
  onCleanup,
  onMount,
  untrack,
} from 'solid-js';

import { css } from 'renderer/emotion-solid';

import Wavesurfer from 'wavesurfer.js';

import { createSignalFromEventEmitter } from '../createSignalFromEventEmitter';
import { Slice } from '../engine/device/Slice';

type WavesurferSliceViewProps = {
  slice: Slice;
  center: number;
  height?: number;
  currentTime?: number;
  onClickWaveform: (event: MouseEvent) => void;
};

export const WavesurferSliceView = (
  propsWithoutDefaults: WavesurferSliceViewProps
) => {
  const props = mergeProps({ currentTime: 0 }, propsWithoutDefaults);

  let waveformRef: HTMLDivElement | undefined;
  let wavesurfer: Wavesurfer;

  const handleClickWaveform = (event: MouseEvent) =>
    props.onClickWaveform(event);

  onMount(() => {
    if (!waveformRef) return;
    wavesurfer = Wavesurfer.create({
      container: waveformRef,
      waveColor: '#adadad',
      progressColor: '#ff0000',
      cursorColor: '#4353FF',
      normalize: true,
      barWidth: 1,
      barRadius: 2,
      cursorWidth: 1,
      height: props.height ?? 50,
      barGap: 0,
    });

    waveformRef.addEventListener('click', handleClickWaveform);
  });

  onCleanup(() => {
    if (!waveformRef) return;
    waveformRef.removeEventListener('click', handleClickWaveform);
  });

  const buffer = createSignalFromEventEmitter(
    untrack(() => props.slice),
    ['load', 'reverseUpdated'],
    (slice) =>
      slice.player.buffer.length
        ? slice.player.buffer.toMono().get()
        : undefined
  );

  createEffect(() => {
    if (wavesurfer && buffer()) {
      wavesurfer.loadDecodedBuffer(buffer());
    }
  });

  createEffect(() => {
    const duration = buffer()?.duration;
    if (!waveformRef) return;
    if (duration) {
      wavesurfer.seekTo(0);
      wavesurfer.zoom(waveformRef.clientWidth / duration);
      wavesurfer.setCurrentTime(props.currentTime);
    }
  });

  return (
    <div
      class={css`
        width: 300px;
        overflow: hidden;
      `}
    >
      <div
        ref={waveformRef}
        class={css`
          padding: 4px;
          background-color: #464646;
          text-shadow: 1px 1px red;
          wave {
            overflow: hidden !important;
            cursor: pointer !important;
          }
        `}
      />
    </div>
  );
};
