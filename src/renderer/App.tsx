import { ChangeEvent, useCallback, useEffect, useState } from 'react';
import { Transport } from 'tone';
import './App.css';
import Engine from './engine/Engine';

import VideoPlayer from './VideoPlayer';

const engine = new Engine();

function App() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [tempo, setTempo] = useState(120);
  const [swing, setSwing] = useState(120);
  const [samplers, setSamplers] = useState<{ url: string }[]>([
    { url: 'https://www.youtube.com/watch?v=GxZuq57_bYM' },
    { url: 'https://www.youtube.com/watch?v=0-fJLVH8_Es' },
  ]);

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
    (async () => {
      const storedDataString = localStorage.getItem(`track`);
      if (!storedDataString) return;
      try {
        await engine.load(JSON.parse(storedDataString));
      } catch {
        //
      }
    })();

    const handleSamplerChanged = () => {
      setSamplers(engine.serialize().samplers);
    };

    const subscriptions = [
      engine.subscribe('sampler-added', handleSamplerChanged),
      engine.subscribe('sampler-removed', handleSamplerChanged),
      engine.subscribe('change', () => {
        console.log('handleChange');
        localStorage.setItem('track', JSON.stringify(engine.serialize()));
      }),
    ];

    return () => {
      subscriptions.forEach((unsubscribe) => unsubscribe());
    };
  }, []);

  useEffect(() => {
    if (isPlaying) {
      Transport.start();
      engine.start();
    } else {
      Transport.stop();
    }
  }, [isPlaying]);

  useEffect(() => {
    Transport.bpm.value = tempo * 2;
  }, [tempo]);

  const addSampler = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    engine.getOrCreateSampler(event.target.value);
  }, []);

  console.log('Render App');

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
        <input type="text" onInput={addSampler} />
      </div>
      {samplers.map((sampler) => (
        <VideoPlayer
          key={sampler.url}
          url={sampler.url}
          sampler={engine.getOrCreateSampler(sampler.url)}
        />
      ))}
    </div>
  );
}

export default App;
