/* eslint-disable @typescript-eslint/no-non-null-assertion */
import React from 'react';
import Wavesurfer from 'wavesurfer.js';
import { Region } from 'wavesurfer.js/src/plugin/regions';
import { Transport } from 'tone';

import { Step } from './SequencerStep';
import VideoSlice, { Slice } from './Slice';

import './VideoPlayer.scss';

import ScrewHeadWithHole from '../../assets/svg/screw_head_with_hole.svg';
import Sampler from './engine/Sampler';
import WavesurferView from './WavesurferView';

export default class VideoPlayer extends React.Component<
  {
    url: string;
    slices?: Slice[];
    steps?: Step[];
    sampler: Sampler;
  },
  {
    currentPatternIndex: number;
    selectedSlice?: Slice;
    url: string;
    length: number;
    slices: Slice[];
    bufferHasLoaded: boolean;
  }
> {
  state = {
    selectedSlice: undefined,
    currentPatternIndex: 0,
    slices: this.props.slices ?? [],
    length: 0,
    url: this.props.url,
    bufferHasLoaded: false,
  };

  wavesurfer?: Wavesurfer;

  // eslint-disable-next-line react/sort-comp
  stopPlayer = () => {
    this.props.sampler.stop();
  };

  componentDidMount = async () => {
    Transport.on('stop', this.stopPlayer);
    Transport.on('pause', this.stopPlayer);
    Transport.on('loopEnd', this.stopPlayer);

    await this.props.sampler.hasLoaded();

    const { buffer } = this.props.sampler;

    this.setState(
      {
        bufferHasLoaded: true,
        slices: this.props.sampler.serialize().slices,
        length: buffer.duration,
      },
      () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const typelessWavesurfer = this.wavesurfer as any;

        this.state.slices.forEach((slice: Slice) => {
          const { id, color, start, end } = slice;
          typelessWavesurfer.addRegion({ id, color, start, end });
        });
      }
    );

    this.props.sampler.on('chain-added', this.handleSamplerChanged);
    this.props.sampler.on('chain-removed', this.handleSamplerChanged);
  };

  setWavesurferInstance = (wavesurfer: Wavesurfer) => {
    this.wavesurfer = wavesurfer;
  };

  handleSamplerChanged = () => {
    this.setState({ slices: this.props.sampler.serialize().slices });
  };

  componentWillUnmount() {
    this.props.sampler.off('chain-added', this.handleSamplerChanged);
    this.props.sampler.off('chain-removed', this.handleSamplerChanged);
  }

  handleRegionCreated = async (region: Region) => {
    const randR = Math.floor(Math.random() * (255 - 0 + 1) + 0);
    const randG = Math.floor(Math.random() * (255 - 0 + 1) + 0);
    const randB = Math.floor(Math.random() * (255 - 0 + 1) + 0);
    const color = `rgba(${randR},${randG},${randB},0.8)`;

    const slice: Slice = {
      id: region.id,
      url: this.state.url,
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

    this.props.sampler.getOrCreateChain(slice);
    this.setState(this.props.sampler.serialize(), () =>
      region.update({ ...region, color })
    );
  };

  handleRegionUpdated = async (region: Region) => {
    const slice = this.state.slices.find(({ id }) => id === region.id)!;

    const updatedSlice: Slice = {
      ...slice,
      start: region.start,
      end: region.end,
    };

    this.updateSlice(updatedSlice);
  };

  handleRegionRemoved = (region: Region) => {
    const slice = this.state.slices.find(({ id }) => id === region.id)!;

    console.log('handleRegionRemoved', region, slice);
    this.props.sampler.removeChain(slice);
    this.setState(this.props.sampler.serialize());
  };

  updateSlice = async (slice: Slice) => {
    this.props.sampler.getOrCreateChain(slice).setSlice(slice);

    this.setState(this.props.sampler.serialize());
  };

  pause = () => {
    this.props.sampler.stop();
  };

  updateSteps = (slice: Slice, steps: Step[]) => {
    const updatedSlice: Slice = {
      ...slice,
      patterns: [
        ...slice.patterns.slice(0, this.state.currentPatternIndex),
        steps,
        ...slice.patterns.slice(this.state.currentPatternIndex + 1),
      ],
    };

    this.updateSlice(updatedSlice);
  };

  handleClickRegion = (region: Region) => {
    const slice = this.state.slices.find(({ id }) => id === region.id)!;
    this.handleClickSlice(slice);
  };

  handleClickSlice = async (slice: Slice) => {
    this.setState({ selectedSlice: slice });
    const sliceIndex = this.state.slices.findIndex(({ id }) => id === slice.id);

    if (sliceIndex === -1) return;

    const chain = this.props.sampler.getOrCreateChain(slice);

    const { duration } = chain.getPlayer().buffer;
    if (duration > 0) {
      this.wavesurfer?.seekAndCenter(slice.start / duration);
      chain.play();
    }
  };

  handleRemoveSlice = (slice: Slice) => {
    console.log(
      'handleRemoveSlice',
      slice,
      this.wavesurfer,
      this.wavesurfer?.regions.list[slice.id]
    );
    this.wavesurfer?.regions.list[slice.id]?.remove();
  };

  updateSequenceLength = (slice: Slice, newLength: number) => {
    const steps = slice.patterns[this.state.currentPatternIndex];

    if (steps.length > newLength) {
      this.updateSteps(slice, steps.slice(0, newLength));
    } else if (steps.length < newLength) {
      this.updateSteps(slice, [
        ...steps.slice(0),
        ...Array.from({ length: newLength - steps.length }).map(() => ({
          actions: [],
        })),
      ]);
    }
  };

  render = () => {
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
            <div>Length: {this.state.length}s</div>
            <div className="flex flex-col w-full">
              <div className="mb-2 w-full">
                <label className="mr-2 w-full">Youtube URL</label>
                <input
                  className="border w-2/3 lcd"
                  type="text"
                  disabled
                  value={this.state.url}
                />
              </div>

              <WavesurferView
                buffer={
                  this.state.bufferHasLoaded ? this.props.sampler.buffer : null
                }
                onRegionClick={this.handleClickRegion}
                onRegionCreated={this.handleRegionCreated}
                onRegionRemoved={this.handleRegionRemoved}
                onRegionUpdated={this.handleRegionUpdated}
                onWavesurferInstance={this.setWavesurferInstance}
              />

              <ol>
                {this.state.slices.map((slice) => (
                  <VideoSlice
                    chain={this.props.sampler.getOrCreateChain(slice)}
                    isSelected={slice === this.state.selectedSlice}
                    currentPatternIndex={this.state.currentPatternIndex}
                    onClickSlice={this.handleClickSlice}
                    onRemoveSlice={this.handleRemoveSlice}
                    onUpdateSequenceLength={this.updateSequenceLength}
                    onUpdateSteps={this.updateSteps}
                    key={slice.id}
                  />
                ))}
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
}
