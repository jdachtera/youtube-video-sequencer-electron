import React from 'react';
import VideoPlayer from './VideoPlayer';

export default class Player extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      src: this.props.src,
      loop: false,
      ranges: [
        {
          start_time: 15,
          end_time: 18,
        },
        {
          start_time: 20,
          end_time: 22,
        },
      ],
    };

    this.setStartTime = this.setStartTime.bind(this);
    this.setEndTime = this.setEndTime.bind(this);
  }

  setStartTime() {}

  setEndTime() {}

  render() {
    console.log('render video player');
    const videoJsOptions = {
      autoplay: false,
      preload: true,
      controls: true,
      muted: true,
      sources: [
        {
          src: this.state.src,
          type: 'video/youtube',
        },
      ],
      start_time: this.props.start_time,
      end_time: this.props.end_time,
      src: this.state.src,
      plugins: {
        abLoopPlugin: {},
      },
    };

    return (
      <div>
        <VideoPlayer {...videoJsOptions} />
      </div>
    );
  }
}
