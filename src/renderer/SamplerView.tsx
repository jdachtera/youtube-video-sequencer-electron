/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { createSignal, onMount, onCleanup, For, untrack } from 'solid-js';

import { Region } from 'wavesurfer.js/src/plugin/regions';
import { Transport } from 'tone';

import { VideoSlice, Slice, Pattern } from './Slice';

import { css } from 'solid-styled-components';

import { Sampler } from './engine/Sampler';
import { WavesurferView } from './WavesurferView';
import { SliceChain } from './engine/SliceChain';
import {
  ModuleFrame,
  RackMountHole,
  Device,
  LCD,
  LCDFrame,
  LCDLine,
  RackEar,
  AkaiButton,
} from './UI';

export const SamplerView = (props: { sampler: Sampler }) => {
  const [selectedSlice, setSelectedSlice] = createSignal<Slice>();
  const [currentPatternIndex, setCurrentPatternIndex] = createSignal(
    untrack(() => props.sampler.getEngine().currentPatternIndex)
  );
  const [chains, setChains] = createSignal<SliceChain[]>(
    untrack(() => props.sampler.getChains())
  );
  const [waveformCenter, setWaveformCenter] = createSignal(0);
  const [length, setLength] = createSignal(0);

  const stopPlayer = () => {
    props.sampler.stop();
  };

  const handleSamplerChanged = () => {
    setChains(props.sampler.getChains());
  };

  onMount(async () => {
    Transport.on('stop', stopPlayer);
    Transport.on('pause', stopPlayer);
    Transport.on('loopEnd', stopPlayer);

    props.sampler.on('chain-added', handleSamplerChanged);
    props.sampler.on('chain-removed', handleSamplerChanged);

    props.sampler
      .getEngine()
      .on('current-pattern-index-updated', setCurrentPatternIndex);

    await props.sampler.hasLoaded();

    setLength(props.sampler.buffer.duration);
  });

  const updateSlice = async (slice: Slice) => {
    const chain = props.sampler.getChain(slice.id);
    if (!chain) return;
    chain.setSlice(slice);
    setChains(props.sampler.getChains());
  };

  const handleRemoveSlice = (slice: Slice) => {
    props.sampler.removeChain(slice.id);
  };

  const updatePattern = (slice: Slice, pattern: Pattern) => {
    const updatedSlice: Slice = {
      ...slice,
      patterns: [
        ...slice.patterns.slice(0, currentPatternIndex()),
        pattern,
        ...slice.patterns.slice(currentPatternIndex() + 1),
      ],
    };

    updateSlice(updatedSlice);
  };

  const handleRemoveSampler = () => {
    props.sampler.getEngine().removeSampler(props.sampler.url);
  };

  const handleClickSlice = async (slice: Slice) => {
    setSelectedSlice(slice);

    const chain = chains().find(
      (currentChain) => currentChain.getSlice().id === slice.id
    );

    if (!chain) return;

    const { duration } = chain.getSampler().buffer;
    if (duration > 0) {
      setWaveformCenter(slice.start / duration);
      chain.play();
    }
  };

  const handleClickRegion = (region: Region) => {
    const chain = chains().find(
      (currentChain) => currentChain.getSlice().id === region.id
    );
    if (!chain) return;

    const { duration } = chain.getPlayer().buffer;
    if (duration > 0) {
      chain.play();
    }
  };

  const updatePatternLength = (slice: Slice, newLength: number) => {
    const pattern = slice.patterns[currentPatternIndex()];

    if (pattern.steps.length > newLength) {
      updatePattern(slice, {
        ...pattern,
        steps: pattern.steps.slice(0, newLength),
      });
    } else if (pattern.steps.length < newLength) {
      updatePattern(slice, {
        ...pattern,
        steps: [
          ...pattern.steps.slice(0),
          ...Array.from({ length: newLength - pattern.steps.length }).map(
            () => ({
              actions: [],
            })
          ),
        ],
      });
    }
  };

  onCleanup(() => {
    props.sampler.off('chain-added', handleSamplerChanged);
    props.sampler.off('chain-removed', handleSamplerChanged);
    props.sampler
      .getEngine()
      .off('current-pattern-index-updated', setCurrentPatternIndex);
  });

  return (
    <div>
      <Device>
        <AkaiButton />
        <ModuleFrame>
          <LCDFrame>
            <LCD>
              <LCDLine>foo</LCDLine>
              <WavesurferView
                sampler={props.sampler}
                center={waveformCenter()}
                onRegionClick={handleClickRegion}
              />
            </LCD>
          </LCDFrame>
        </ModuleFrame>
        <div
          style={{
            borderBottom: '1px solid #222',
            boxShadow: '0px 0px 3px #222',
            padding: '10px',
            width: '100%',
          }}
        >
          <div>Length: {length()}s</div>
          <div class="">
            <div class="">{props.sampler.url}</div>
            <button type="button" onClick={handleRemoveSampler}>
              Remove sampler
            </button>
            <ModuleFrame></ModuleFrame>

            <ol
              class={css`
                box-shadow: inset 0px 0px 8px black;
                padding: 2px;
                border-radius: 5px;
                margin-top: 10px;
                background-color: #111;
              `}
            >
              <For each={chains()}>
                {(chain) => (
                  <VideoSlice
                    chain={chain}
                    isSelected={chain.getSlice() === selectedSlice()}
                    currentPatternIndex={currentPatternIndex()}
                    onClickSlice={handleClickSlice}
                    onRemoveSlice={handleRemoveSlice}
                    onUpdatePatternLength={updatePatternLength}
                    onUpdatePattern={updatePattern}
                  />
                )}
              </For>
            </ol>
          </div>
        </div>
      </Device>
    </div>
  );
};
