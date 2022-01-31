/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { createSignal, onMount, onCleanup, Index } from 'solid-js';

import Wavesurfer from 'wavesurfer.js';
import { Region } from 'wavesurfer.js/src/plugin/regions';
import { Transport } from 'tone';
import { debounce } from 'ts-debounce';

import { Step } from './SequencerStep';
import { VideoSlice, Slice } from './Slice';

import './VideoPlayer.scss';

import ScrewHeadWithHole from '../../assets/svg/screw_head_with_hole.svg';
import { Sampler } from './engine/Sampler';
import { WavesurferView } from './WavesurferView';

export const VideoPlayer = (props: {
  url: string;
  slices?: Slice[];
  sampler: Sampler;
}) => {
  const [selectedSlice, setSelectedSlice] = createSignal<Slice>();
  const [currentPatternIndex, setCurrentPatternIndex] = createSignal(0);
  const [slices, setSlices] = createSignal<Slice[]>(props.slices ?? []);
  const [length, setLength] = createSignal(0);
  const [bufferHasLoaded, setBufferHasLoadded] = createSignal(false);

  let wavesurfer: Wavesurfer;

  // eslint-disable-next-line react/sort-comp
  const stopPlayer = () => {
    props.sampler.stop();
  };

  const handleSamplerChanged = () => {
    setSlices(props.sampler.serialize().slices);
  };

  onMount(async () => {
    Transport.on('stop', stopPlayer);
    Transport.on('pause', stopPlayer);
    Transport.on('loopEnd', stopPlayer);

    await props.sampler.hasLoaded();

    const { buffer } = props.sampler;

    setBufferHasLoadded(true);
    setSlices(props.sampler.serialize().slices);
    setLength(buffer.duration);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const typelessWavesurfer = wavesurfer as any;
    slices().forEach((slice: Slice) => {
      const { id, color, start, end } = slice;
      typelessWavesurfer.addRegion({ id, color, start, end });
    });

    props.sampler.on('chain-added', handleSamplerChanged);
    props.sampler.on('chain-removed', handleSamplerChanged);
  });

  const setWavesurferInstance = (incomingWavesurfer: Wavesurfer) => {
    wavesurfer = incomingWavesurfer;
  };

  const handleRegionCreated = async (region: Region) => {
    const randR = Math.floor(Math.random() * (255 - 0 + 1) + 0);
    const randG = Math.floor(Math.random() * (255 - 0 + 1) + 0);
    const randB = Math.floor(Math.random() * (255 - 0 + 1) + 0);
    const color = `rgba(${randR},${randG},${randB},0.8)`;

    const slice: Slice = {
      id: region.id,
      start: region.start,
      end: region.end,
      playbackSpeed: 1,
      reverse: false,
      color,
      patterns: [
        Array.from({ length: 16 }).map(() => ({
          actions: [],
        })),
      ],
    };

    props.sampler.getOrCreateChain(slice);

    handleSamplerChanged();
    region.update({ ...region, color });
  };

  const updateSlice = async (slice: Slice) => {
    props.sampler.getOrCreateChain(slice).setSlice(slice);
    setSlices(props.sampler.serialize().slices);
  };

  const handleRegionUpdated = debounce(async (region: Region) => {
    const slice = slices().find(({ id }) => id === region.id)!;

    const updatedSlice: Slice = {
      ...slice,
      start: region.start,
      end: region.end,
    };

    updateSlice(updatedSlice);
  }, 100);

  const handleRegionRemoved = (region: Region) => {
    const slice = slices().find(({ id }) => id === region.id)!;

    console.log('handleRegionRemoved', region, slice);
    props.sampler.removeChain(slice);
    handleSamplerChanged();
  };

  const pause = () => {
    props.sampler.stop();
  };

  const updateSteps = (slice: Slice, steps: Step[]) => {
    console.log(slice, steps);
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
    const sliceIndex = slices().findIndex(({ id }) => id === slice.id);

    if (sliceIndex === -1) return;

    const chain = props.sampler.getOrCreateChain(slice);

    const { duration } = chain.getPlayer().buffer;
    if (duration > 0) {
      wavesurfer?.seekAndCenter(slice.start / duration);
      chain.play();
    }
  };

  const handleClickRegion = (region: Region) => {
    const slice = slices().find(({ id }) => id === region.id)!;
    handleClickSlice(slice);
  };

  const handleRemoveSlice = (slice: Slice) => {
    console.log(
      'handleRemoveSlice',
      slice,
      wavesurfer,
      wavesurfer?.regions.list[slice.id]
    );
    wavesurfer?.regions.list[slice.id]?.remove();
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

  console.log('Render VideoPlayer');

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
                value={props.url}
              />
            </div>

            <WavesurferView
              buffer={bufferHasLoaded() ? props.sampler.buffer : null}
              onRegionClick={handleClickRegion}
              onRegionCreated={handleRegionCreated}
              onRegionRemoved={handleRegionRemoved}
              onRegionUpdated={handleRegionUpdated}
              onWavesurferInstance={setWavesurferInstance}
            />

            <ol>
              <Index each={slices()}>
                {(slice) => (
                  <VideoSlice
                    chain={props.sampler.getOrCreateChain(slice())}
                    isSelected={slice() === selectedSlice()}
                    currentPatternIndex={currentPatternIndex()}
                    onClickSlice={handleClickSlice}
                    onRemoveSlice={handleRemoveSlice}
                    onUpdateSequenceLength={updateSequenceLength}
                    onUpdateSteps={updateSteps}
                  />
                )}
              </Index>
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
