/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { createSignal, onMount, For, untrack, createEffect } from 'solid-js';

import { Region } from 'wavesurfer.js/src/plugin/regions';
import { Transport } from 'tone';

import { SampleSlice } from './Slice';

import { css } from 'solid-styled-components';

import { Sampler } from './engine/Sampler';
import { WavesurferView } from './WavesurferView';

import {
  Device,
  LCD,
  LCDFrame,
  LCDLine,
  AkaiButton,
  ScreenPrintBackground,
} from './UI';

import { createSignalFromEventEmitter } from './createSignalFromEventEmitter';
import { Slice } from './engine/Slice';

export const SamplerView = (props: { sampler: Sampler }) => {
  const [selectedSlice, setSelectedSlice] = createSignal<Slice>();

  const currentPatternIndex = createSignalFromEventEmitter(
    untrack(() => props.sampler.engine),
    ['currentPatternIndexUpdated'],
    (engine) => engine.currentPatternIndex
  );

  const slices = createSignalFromEventEmitter(
    untrack(() => props.sampler),
    ['sliceAdded', 'sliceRemoved', 'sliceUpdated'],
    (sampler) => sampler.getSlices()
  );

  const [waveformCenter, setWaveformCenter] = createSignal(0);
  const [length, setLength] = createSignal(0);
  const [playing, setPlaying] = createSignal(0);

  const stopPlayer = () => {
    props.sampler.stop();
  };

  const setZoom = (zoom: number) => {
    props.sampler.update({ zoom });
  };

  onMount(async () => {
    Transport.on('stop', stopPlayer);
    Transport.on('pause', stopPlayer);
    Transport.on('loopEnd', stopPlayer);

    await props.sampler.hasLoaded();

    setLength(props.sampler.buffer.duration);
  });

  const handleRemoveSlice = (slice: Slice) => {
    props.sampler.removeSlice(slice.id);
  };

  const handleRemoveSampler = () => {
    props.sampler.engine.removeSampler(props.sampler.url);
  };

  const handleClickSlice = async (slice: Slice) => {
    setSelectedSlice(slice);

    if (!slice) return;

    const { duration } = slice.sampler.buffer;
    if (duration > 0) {
      setWaveformCenter(slice.start / duration);
      slice.play();
    }
  };

  const handleClickRegion = (region: Region) => {
    const slice = slices().find(
      (currentSlice) => currentSlice.serialize().id === region.id
    );
    if (!slice) return;

    const { duration } = slice.player.buffer;
    if (duration > 0) {
      slice.play();
    }
  };

  return (
    <Device background="#969696">
      <div
        class={css`
          background-color: #b9b9b9;
          padding: 10px;
          display: flex;
        `}
      >
        <div
          class={css`
            padding: 50px;
            padding-right: 200px;
            border: 2px oustet white;
            border-radius: 3px;
            background: radial-gradient(#bdbdbd 0%, #f3f3f3c4 100%);
            display: flex;
          `}
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
                padding: 10px;
              `}
            >
              <AkaiButton onClick={() => setZoom(100)} />
              <AkaiButton onClick={() => setZoom(200)} />
              <AkaiButton onClick={() => setZoom(300)} />
              <AkaiButton onClick={() => setZoom(400)} />
              <AkaiButton onClick={() => setZoom(500)} />
            </div>
          </LCDFrame>
          {/* <ButtonWithLabel label="Foo" /> */}
          <div
            class={css`
              padding: 10px;
              display: flex;
              justify-content: space-evenly;
            `}
          >
            <ScreenPrintBackground label="Function">
              <AkaiButton onClick={() => setZoom(100)} />
              <AkaiButton onClick={() => setZoom(200)} />
              <AkaiButton onClick={() => setZoom(300)} />
              <AkaiButton onClick={() => setZoom(400)} />
              <AkaiButton onClick={() => setZoom(500)} />
            </ScreenPrintBackground>
          </div>
        </div>
      </div>
      <div
        style={{
          borderBottom: '1px solid #222',
          boxShadow: '0px 0px 3px #222',
          padding: '10px',
        }}
      >
        <div>
          <button type="button" onClick={handleRemoveSampler}>
            Remove sampler
          </button>
        </div>
        <ol
          class={css`
            font-size: 10px;
            box-shadow: inset 0px 0px 8px black;
            padding: 2px;
            border-radius: 5px;
            margin-top: 10px;
            background-color: #111;
          `}
        >
          <For each={slices()}>
            {(slice) => (
              <SampleSlice
                slice={slice}
                isSelected={slice === selectedSlice()}
                currentPatternIndex={currentPatternIndex()}
                onClickSlice={handleClickSlice}
                onRemoveSlice={handleRemoveSlice}
              />
            )}
          </For>
        </ol>
      </div>
    </Device>
  );
};
