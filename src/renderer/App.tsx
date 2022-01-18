import { ChangeEvent, useCallback, useEffect, useState } from 'react';
import { Transport } from 'tone';

import VideoPlayer from './VideoPlayer';
function App() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [tempo, setTempo] = useState(110);
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
    Transport.bpm.value = tempo;
  }, [tempo]);

  return (
    <div className="App">
      <button type="button" onClick={togglePlay}>
        {isPlaying ? 'Stop' : 'Play'}
      </button>
      Tempo:
      <input
        type="number"
        min="60"
        max="180"
        value={tempo}
        onChange={handleTempoChange}
      />
      <VideoPlayer
        steps={[
          {
            actions: [
              { type: 'SET_REVERSE', value: false },
              { type: 'SET_PLAYBACK_SPEED', value: 1 },
              { type: 'PLAY', start: 86.56 },
            ],
          },
          { actions: [] },
          { actions: [] },
          { actions: [] },

          {
            actions: [
              { type: 'PLAY', start: 88.56 },
              { type: 'SET_REVERSE', value: true },
            ],
          },

          { actions: [] },
          { actions: [] },
          { actions: [] },
          { actions: [] },
          {
            actions: [
              { type: 'PLAY', start: 89.56 },
              { type: 'SET_REVERSE', value: false },
            ],
          },

          { actions: [] },
          { actions: [] },
          {
            actions: [
              { type: 'PLAY', start: 92.56 },
              { type: 'SET_PLAYBACK_SPEED', value: 1 },
            ],
          },

          { actions: [] },
          { actions: [] },
          {
            actions: [
              { type: 'PLAY', start: 96.56 },
              { type: 'SET_PLAYBACK_SPEED', value: 2 },
            ],
          },
        ]}
        src="https://www.youtube.com/watch?v=GxZuq57_bYM"
      />
      <VideoPlayer src="https://www.youtube.com/watch?v=E5Hnnf2M_VM" />
      <VideoPlayer src="https://www.youtube.com/watch?v=HkMNOlYcpHg" />
      <VideoPlayer src="https://www.youtube.com/watch?v=A0VYsiMtrNE" />
    </div>
  );
}

export default App;
