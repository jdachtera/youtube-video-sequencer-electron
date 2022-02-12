import { createEffect, onMount, onCleanup, untrack } from 'solid-js';

import { css } from 'solid-styled-components';

import Wavesurfer from 'wavesurfer.js';
import { Region } from 'wavesurfer.js/src/plugin/regions';
import { createSignalFromEventEmitter } from './createSignalFromEventEmitter';
import { SliceChain } from './engine/SliceChain';

type WavesurferSliceViewProps = {
  chain: SliceChain;
  center: number;
  height?: number;
  // onRegionClick: (region: Region) => void;
};

export const WavesurferSliceView = (props: WavesurferSliceViewProps) => {
  let waveformRef: HTMLDivElement | undefined;
  let wavesurfer: Wavesurfer;

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
  });

  const buffer = createSignalFromEventEmitter(
    untrack(() => props.chain),
    'chain-updated',
    (chain) => chain.getPlayer().buffer.toMono().get()
  );

  createEffect(() => {
    if (wavesurfer && buffer()) {
      wavesurfer.loadDecodedBuffer(buffer());
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
          }
        `}
      />
    </div>
  );
};
