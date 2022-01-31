import { createSignal, onMount, createEffect, onCleanup, For } from 'solid-js';
import { Transport } from 'tone';
import { debounce } from 'ts-debounce';

import './App.css';
import { Engine } from './engine/Engine';
import { Sampler } from './engine/Sampler';

import { VideoPlayer } from './VideoPlayer';

const engine = new Engine();

export function App() {
  const [isPlaying, setIsPlaying] = createSignal(false);
  const [tempo, setTempo] = createSignal(120);
  const [swing, setSwing] = createSignal(120);
  const [samplers, setSamplers] = createSignal<Sampler[]>([]);

  const togglePlay = () => {
    setIsPlaying(!isPlaying());
  };

  const handleTempoChange = (event: { currentTarget: HTMLInputElement }) => {
    setTempo(+event.currentTarget.value);
  };

  const handleSamplerChanged = () => {
    setSamplers(engine.getSamplers());
  };

  const saveToLocalStorage = debounce(() => {
    console.log('handleChange');
    localStorage.setItem('track', JSON.stringify(engine.serialize()));
  }, 500);

  onMount(() => {
    engine.on('sampler-added', handleSamplerChanged);
    engine.on('sampler-removed', handleSamplerChanged);
    engine.on('change', saveToLocalStorage);
  });

  onCleanup(() => {
    engine.off('sampler-added', handleSamplerChanged);
    engine.off('sampler-removed', handleSamplerChanged);
    engine.off('change', saveToLocalStorage);
  });

  onMount(() => {
    let parsedData;
    const storedDataString = localStorage.getItem(`track`);

    if (storedDataString) {
      try {
        parsedData = JSON.parse(storedDataString);
      } catch {
        //
      }
    }
    engine.load(
      parsedData ?? {
        samplers: [
          { url: 'https://www.youtube.com/watch?v=GxZuq57_bYM' },
          { url: 'https://www.youtube.com/watch?v=0-fJLVH8_Es' },
        ],
        currentPatternIndex: 0,
      }
    );
  });

  createEffect(() => {
    if (isPlaying()) {
      Transport.start();
      engine.start();
    } else {
      Transport.stop();
    }
  });

  createEffect(() => {
    Transport.bpm.value = tempo() * 2;
  });

  const addSampler = (event: { currentTarget: HTMLInputElement }) => {
    engine.createSampler({
      url: event.currentTarget.value,
      zoom: 0,
      slices: [],
    });
  };

  console.log('Render App');

  return (
    <div className="App">
      <div className="main-controls">
        <button type="button" onClick={togglePlay}>
          {isPlaying() ? 'Stop' : 'Play'}
        </button>
        Tempo:
        <input
          type="number"
          min="20"
          max="280"
          value={tempo()}
          onChange={handleTempoChange}
        />
        <input type="text" onInput={addSampler} />
      </div>
      <For each={samplers()}>
        {(sampler) => <VideoPlayer sampler={sampler} />}
      </For>
    </div>
  );
}
