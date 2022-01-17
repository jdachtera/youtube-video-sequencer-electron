import React from 'react';
import videojs from 'video.js';
import { Player as TonePlayer } from 'tone';

import 'video.js/dist/video-js.css';
import 'videojs-youtube';

const clamp = (num, min, max) => Math.min(Math.max(num, min), max);

export default class VideoPlayer extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      loop: false,
      currentTime: 0,
      start_time: this.props.start_time || 1,
      end_time: this.props.end_time || 2,
      length: 0,
      src: this.props.src,
    };
    this.seek = this.seek.bind(this);
    this.loop = this.loop.bind(this);
    this.pause = this.pause.bind(this);
    this.setSrc = this.setSrc.bind(this);
    this.setStart = this.setStart.bind(this);
    this.setEnd = this.setEnd.bind(this);
  }

  async componentDidMount() {
    // instantiate Video.js
    let that = this;
    this.player = videojs(this.videoNode, this.props, function onPlayerReady() {
      console.log('onPlayerReady', this);

      this.on('timeupdate', function (e) {
        that.timeupdate(this);
      });
    });
    console.log('foo');
    console.log(this.player.src());
    this.player.play();
    this.player.currentTime(this.props.start_time);
    this.player.pause();

    this.tonePlayer = new TonePlayer().toDestination();
    const sourceUrl = await window.yt.getYouTubeVideoSource(this.props.src);
    await this.tonePlayer.load(sourceUrl);
    this.setState({ length: this.tonePlayer.buffer.duration });
  }

  // destroy player on unmount
  componentWillUnmount() {
    if (this.player) {
      this.player.dispose();
    }
    if (this.tonePlayer) {
      this.tonePlayer.dispose();
    }
  }

  timeupdate(e) {
    console.log(e.currentTime());

    this.setState({ currentTime: e.currentTime() });
    // if (e.currentTime() >= this.props.end_time) {
    //   if(this.state.isLooping) {
    //     e.currentTime(this.props.start_time)
    //   } else {
    //     e.pause();
    //   }
    // }
  }

  seek() {
    //this.player.pause();
    this.setState({ loop: false });
    this.player.abLoopPlugin.setOptions({ pauseAfterLooping: true });
    this.player.abLoopPlugin
      .setStart(this.state.start_time)
      .setEnd(this.state.end_time)
      .goToStart()
      .enable()
      .playLoop();

    if (this.tonePlayer.loaded) {
      this.tonePlayer.start(
        0,
        this.state.start_time,
        this.state.end_time - this.state.start_time
      );
    }

    // this.player.currentTime(this.props.start_time);
    // this.player.play();
  }

  async loop() {
    //this.player.pause();
    this.setState({ loop: true });
    this.player.abLoopPlugin.setOptions({ pauseAfterLooping: false });
    this.player.abLoopPlugin
      .setStart(this.state.start_time)
      .setEnd(this.state.end_time)
      .goToStart()
      .enable()
      .playLoop();

    this.tonePlayer.setLoopPoints(this.state.start_time, this.state.end_time);
    this.tonePlayer.loop = true;
    if (this.tonePlayer.loaded) {
      this.tonePlayer.start(0, this.state.start_time);
    }
  }

  async setSrc(e) {
    this.player.src({ type: 'video/youtube', src: e.target.value });
    this.setState({ src: e.target.value });

    const sourceUrl = await window.yt.getYouTubeVideoSource(e.target.value);
    this.tonePlayer.load(sourceUrl);
  }

  setStart(e) {
    this.setState(
      { start_time: clamp(+e.target.value, 0, this.state.end_time - 0.1) },
      () => {
        this.player.abLoopPlugin.setStart(this.state.start_time);
        this.tonePlayer.setLoopPoints(
          this.state.start_time,
          this.state.end_time
        );
      }
    );
  }

  setEnd(e) {
    this.setState(
      {
        end_time: clamp(
          +e.target.value,
          this.state.start_time + 0.1,
          this.tonePlayer.buffer.duration
        ),
      },
      () => {
        this.player.abLoopPlugin.setEnd(this.state.end_time);
        this.tonePlayer.setLoopPoints(
          this.state.start_time,
          this.state.end_time
        );
      }
    );
  }

  pause() {
    this.player.pause();
    this.tonePlayer.stop();
  }
  // wrap the player in a div with a `data-vjs-player` attribute
  // so videojs won't create additional wrapper in the DOM
  // see https://github.com/videojs/video.js/pull/3856
  render() {
    ///abLoopPlugin(window,videojs);

    const setup =
      '{ "techOrder": ["youtube"], "sources": [{ "type": "video/youtube", "src": "' +
      this.props.src +
      '"}] }';
    return (
      <div className="border p-4 m-4">
        <div data-vjs-player>
          <video
            ref={(node) => (this.videoNode = node)}
            className="video-js"
            data-setup={setup}
            preload="auto"
          ></video>
        </div>
        <div>current Time: {this.state.currentTime}s</div>
        <h3>loop: {this.state.loop.toString()}</h3>
        <div className="flex flex-col w-full">
          <div className="mb-2 w-full">
            <label className="mr-2 w-full">Youtube URL</label>
            <input
              className="border w-2/3"
              type="text"
              onChange={this.setSrc}
              value={this.state.src}
            ></input>
          </div>
          <div className="mb-2">
            <label className="mr-2">Start Time</label>
            <input
              className="border w-2/3"
              type="range"
              min={0}
              max={this.state.length}
              onChange={this.setStart}
              value={this.state.start_time}
            ></input>
          </div>
          <div className="mb-2">
            <label className="mr-2">End Time</label>
            <input
              className="border w-2/3"
              type="range"
              min={0}
              max={this.state.length}
              onChange={this.setEnd}
              value={this.state.end_time}
            ></input>
          </div>
        </div>
        <button className="border bg-black text-white p-4" onClick={this.seek}>
          1-Shot
        </button>
        <button className="border bg-black text-white p-4" onClick={this.loop}>
          Loop
        </button>
        <button className="border bg-black text-white p-4" onClick={this.pause}>
          SOTP
        </button>
      </div>
    );
  }
}
