/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { createSignal, createEffect, onMount, onCleanup, For } from 'solid-js';

import { Region } from 'wavesurfer.js/src/plugin/regions';
import { Transport } from 'tone';

import { Step } from './SequencerStep';
import { VideoSlice, Slice } from './Slice';

import './VideoPlayer.scss';

import ScrewHeadWithHole from '../../assets/svg/screw_head_with_hole.svg';
import { Sampler } from './engine/Sampler';
import { WavesurferView } from './WavesurferView';
import { SliceChain } from './engine/SliceChain';

export const VideoPlayer = (props: { sampler: Sampler }) => {
  const [selectedSlice, setSelectedSlice] = createSignal<Slice>();
  const [currentPatternIndex, setCurrentPatternIndex] = createSignal(0);
  const [chains, setChains] = createSignal<SliceChain[]>(
    props.sampler.getChains()
  );
  const [waveformCenter, setWaveformCenter] = createSignal(0);
  const [length, setLength] = createSignal(0);

  // eslint-disable-next-line react/sort-comp
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

  const updateSteps = (slice: Slice, steps: Step[]) => {
    const updatedSlice: Slice = {
      ...slice,
      patterns: [
        ...slice.patterns.slice(0, currentPatternIndex()),
        steps,
        ...slice.patterns.slice(currentPatternIndex() + 1),
      ],
    };

    updateSlice(updatedSlice);
  };

  const handleClickSlice = async (slice: Slice) => {
    setSelectedSlice(slice);

    const chain = chains().find(
      (currentChain) => currentChain.getSlice().id === slice.id
    );

    if (!chain) return;

    const { duration } = chain.getPlayer().buffer;
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

  const updateSequenceLength = (slice: Slice, newLength: number) => {
    const steps = slice.patterns[currentPatternIndex()];

    if (steps.length > newLength) {
      updateSteps(slice, steps.slice(0, newLength));
    } else if (steps.length < newLength) {
      updateSteps(slice, [
        ...steps.slice(0),
        ...Array.from({ length: newLength - steps.length }).map(() => ({
          actions: [],
        })),
      ]);
    }
  };

  onCleanup(() => {
    props.sampler.off('chain-added', handleSamplerChanged);
    props.sampler.off('chain-removed', handleSamplerChanged);
  });

  return (
    <div className="border p-4 m-4">
      <div style={{ display: 'flex' }}>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            borderRight: '1px inset #222',
            borderBottom: '1px outset #777',
            boxShadow: '0px 0px 2px #222',
          }}
        >
          <img
            alt="screw"
            src={ScrewHeadWithHole}
            width="35px"
            style={{ margin: '8px' }}
          />
          <img
            alt="screw"
            src={ScrewHeadWithHole}
            width="35px"
            style={{ margin: '8px' }}
          />
        </div>
        <div
          style={{
            borderBottom: '1px solid #222',
            boxShadow: '0px 0px 3px #222',
            padding: '10px',
            width: '100%',
          }}
        >
          <div>Length: {length()}s</div>
          <div className="flex flex-col w-full">
            <div className="mb-2 w-full">
              <label className="mr-2 w-full">Youtube URL</label>
              <input
                className="border w-2/3 lcd"
                type="text"
                disabled
                value={props.sampler.url}
              />
            </div>

            <WavesurferView
              sampler={props.sampler}
              center={waveformCenter()}
              onRegionClick={handleClickRegion}
            />

            <ol>
              <For each={chains()}>
                {(chain) => (
                  <VideoSlice
                    chain={chain}
                    isSelected={chain.getSlice() === selectedSlice()}
                    currentPatternIndex={currentPatternIndex()}
                    onClickSlice={handleClickSlice}
                    onRemoveSlice={handleRemoveSlice}
                    onUpdateSequenceLength={updateSequenceLength}
                    onUpdateSteps={updateSteps}
                  />
                )}
              </For>
            </ol>
          </div>
        </div>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            borderRight: '1px inset #222',
            borderBottom: '1px solid #333',
            boxShadow: '0px 0px 2px #333',
          }}
        >
          <img
            alt="screw"
            src={ScrewHeadWithHole}
            width="35px"
            style={{ margin: '8px' }}
          />
          <img
            alt="screw"
            src={ScrewHeadWithHole}
            width="35px"
            style={{ margin: '8px' }}
          />
        </div>
      </div>
    </div>
  );
};
