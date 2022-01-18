import React, { ChangeEvent } from 'react';
import { Player as TonePlayer, Sequence, Transport } from 'tone';

import Sequencer from './Sequencer';
import { Action } from './SequencerAction';
import { Step } from './SequencerStep';

const clamp = (num: number, min: number, max: number) =>
  Math.min(Math.max(num, min), max);

declare const yt: { getYouTubeVideoSource: (url: string) => Promise<string> };

export default class VideoPlayer extends React.Component<
  {
    src: string;
    steps?: Step[];
  },
  {
    currentTime: number;
    currentStep?: Step;
    src: string;
    length: number;
    steps: Step[];
  }
> {
  state = {
    currentStep: undefined,
    currentTime: 0,
    length: 0,
    src: this.props.src,
    steps:
      this.props.steps ||
      Array.from({ length: 16 }).map(() => ({ actions: [] as Action[] })),
  };

  tonePlayer = new TonePlayer().toDestination();

  // eslint-disable-next-line react/sort-comp
  handleStep = (time: number, step: Step) => {
    this.setState({ currentStep: step });
    step.actions.forEach((action) => {
      switch (action.type) {
        case 'PLAY':
          if (action.start < this.tonePlayer.buffer.duration) {
            this.tonePlayer.start(time, action.start);
          }
          break;
        case 'PAUSE':
          this.tonePlayer.stop(time);
          break;
        case 'SET_PLAYBACK_SPEED':
          this.tonePlayer.playbackRate = action.value;
          break;
        case 'SET_REVERSE':
          this.tonePlayer.reverse = action.value;
          break;
        default:
          break;
      }
    });
  };

  sequence = new Sequence(this.handleStep, this.state.steps);

  stopPlayer = () => {
    this.tonePlayer.stop();
  };

  componentDidMount = async () => {
    Transport.on('stop', this.stopPlayer);
    Transport.on('pause', this.stopPlayer);
    Transport.on('loopEnd', this.stopPlayer);
    this.sequence.start();

    const sourceUrl = await yt.getYouTubeVideoSource(this.props.src);
    await this.tonePlayer.load(sourceUrl);

    this.setState({ length: this.tonePlayer.buffer.duration });
  };

  // destroy player on unmount
  componentWillUnmount = () => {
    if (this.tonePlayer) {
      this.tonePlayer.dispose();
    }
  };

  setSrc = async (e: ChangeEvent<HTMLInputElement>) => {
    this.setState({ src: e.target.value });

    const sourceUrl = await yt.getYouTubeVideoSource(e.target.value);
    this.tonePlayer.load(sourceUrl);
  };

  pause = () => {
    this.tonePlayer.stop();
  };

  updateSteps = (steps: Step[]) => {
    const oldSequence = this.sequence;
    oldSequence.dispose();

    this.setState({ steps });
    this.sequence = new Sequence(this.handleStep, steps);
    this.sequence.start(oldSequence.startOffset);
  };

  render = () => {
    return (
      <div className="border p-4 m-4">
        <div>current Time: {this.state.currentTime}s</div>
        <div>Length: {this.state.length}s</div>
        <div className="flex flex-col w-full">
          <div className="mb-2 w-full">
            <label className="mr-2 w-full">Youtube URL</label>
            <input
              className="border w-2/3"
              type="text"
              onChange={this.setSrc}
              value={this.state.src}
            />
          </div>

          <Sequencer
            steps={this.state.steps}
            currentStep={this.state.currentStep}
            onChange={this.updateSteps}
          />
        </div>
      </div>
    );
  };
}
