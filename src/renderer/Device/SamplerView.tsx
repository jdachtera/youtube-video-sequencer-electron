/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { createSignal, onMount, onCleanup } from 'solid-js';

import { Region } from 'wavesurfer.js/src/plugin/regions';
import { Transport } from 'tone';

import { css } from 'renderer/emotion-solid';

import { SamplerDevice } from '../engine/device/Sampler';
import { WavesurferView } from './WavesurferView';

import { LCD, LCDFrame, LCDLine, AkaiButton } from '../UI';

import { Slice } from '../engine/device/Slice';

export const SamplerView = (props: { sampler: SamplerDevice }) => {
  const [waveformCenter, setWaveformCenter] = createSignal(0);
  const [length, setLength] = createSignal(0);

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
      slice.play();
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
            <div>{props.sampler.url}</div>
            <div>{length()}s</div>
          </LCDLine>
          <WavesurferView
            sampler={props.sampler}
            center={waveformCenter()}
            onRegionClick={handleClickRegion}
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
          <AkaiButton onClick={() => setZoom(100)} />
          <AkaiButton onClick={() => setZoom(200)} />
          <AkaiButton onClick={() => setZoom(300)} />
          <AkaiButton onClick={() => setZoom(400)} />
          <AkaiButton onClick={() => setZoom(500)} />
        </div>
      </LCDFrame>
    </div>
  );
};
