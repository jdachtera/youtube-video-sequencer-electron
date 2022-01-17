import './App.css';

import Player from './Player';
import videojs from 'video.js';

const abLoopPlugin = require('videojs-abloop');

function App() {
  abLoopPlugin(window, videojs);
  return (
    <div className="App">
      <Player
        start_time={86.54}
        end_time={93.5}
        src="https://www.youtube.com/watch?v=GxZuq57_bYM"
      />
      <Player src="https://www.youtube.com/watch?v=E5Hnnf2M_VM" />
      <Player src="https://www.youtube.com/watch?v=HkMNOlYcpHg" />
      <Player src="https://www.youtube.com/watch?v=A0VYsiMtrNE" />
    </div>
  );
}

export default App;
