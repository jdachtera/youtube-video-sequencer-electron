import { ChangeEvent, useCallback, useEffect, useState } from 'react';
import { Transport } from 'tone';
import './App.css';

import VideoPlayer from './VideoPlayer';

function App() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [tempo, setTempo] = useState(120);
  const togglePlay = useCallback(() => {
    setIsPlaying(!isPlaying);
  }, [isPlaying, setIsPlaying]);

  const handleTempoChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      setTempo(+event.target.value);
    },
    [setTempo]
  );

  useEffect(() => {
    if (isPlaying) {
      Transport.start();
    } else {
      Transport.stop();
    }
  }, [isPlaying]);

  useEffect(() => {
    Transport.bpm.value = tempo * 2;
  }, [tempo]);

  return (
    <div className="App">
      <div className="main-controls">
        <button type="button" onClick={togglePlay}>
          {isPlaying ? 'Stop' : 'Play'}
        </button>
        Tempo:
        <input
          type="number"
          min="20"
          max="280"
          value={tempo}
          onChange={handleTempoChange}
          />
      </div>
      <VideoPlayer src="https://www.youtube.com/watch?v=GxZuq57_bYM" />
      <VideoPlayer src="https://www.youtube.com/watch?v=0-fJLVH8_Es" />

    </div>
  );
}

export default App;
