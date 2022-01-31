import { createSignal, onMount, createEffect, onCleanup, For } from 'solid-js';
import { Offline, Time, Transport } from 'tone';
import { debounce } from 'ts-debounce';
import bufferToWav from 'audiobuffer-to-wav';

import './App.css';
import { Engine } from './engine/Engine';
import { Sampler } from './engine/Sampler';

import { VideoPlayer } from './VideoPlayer';

const engine = new Engine(Transport);

export function App() {
  const [isPlaying, setIsPlaying] = createSignal(false);
  const [bpm, setBpm] = createSignal(engine.bpm);
  const [swing, setSwing] = createSignal(engine.swing);
  const [samplers, setSamplers] = createSignal<Sampler[]>([]);

  const togglePlay = () => {
    setIsPlaying(!isPlaying());
  };

  const handleTempoChange = (event: { currentTarget: HTMLInputElement }) => {
    engine.setBpm(+event.currentTarget.value);
  };

  const handleSwingChange = (event: { currentTarget: HTMLInputElement }) => {
    engine.setSwing(+event.currentTarget.value);
  };

  const handleSamplerChanged = () => {
    setSamplers(engine.getSamplers());
  };

  const saveToLocalStorage = debounce(() => {
    console.log('handleChange');
    localStorage.setItem('track', JSON.stringify(engine.serialize()));
  }, 500);

  console.log(Time('').toSeconds());

  const renderToWavefile = async () => {
    const maxLength =
      engine
        .getSamplers()
        .flatMap((sampler) => {
          return sampler
            .getChains()
            .map(
              (chain) =>
                chain.getSlice().patterns[engine.currentPatternIndex].length
            );
        })
        .sort()
        .pop() ?? 16;

    const timeToRender = (maxLength * 4) / 8;

    const buffer = await Offline(async (offlineContext) => {
      const offlineEngine = new Engine(offlineContext.transport);
      offlineEngine.load(engine.serialize());

      await Promise.all(
        offlineEngine.getSamplers().map((sampler) => sampler.hasLoaded())
      );

      offlineContext.transport.start();
    }, timeToRender);

    const wav = bufferToWav(buffer.get()!);
    const blob = new window.Blob([new DataView(wav)], {
      type: 'audio/wav',
    });

    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'audio.wav';
    anchor.click();
    window.URL.revokeObjectURL(url);
  };

  const addSampler = (event: { currentTarget: HTMLInputElement }) => {
    engine.createSampler({
      url: event.currentTarget.value,
      zoom: 0,
      slices: [],
    });
  };

  onMount(() => {
    engine.on('sampler-added', handleSamplerChanged);
    engine.on('sampler-removed', handleSamplerChanged);
    engine.on('change', saveToLocalStorage);
    engine.on('bpm-updated', setBpm);
    engine.on('swing-updated', setSwing);
  });

  onCleanup(() => {
    engine.off('sampler-added', handleSamplerChanged);
    engine.off('sampler-removed', handleSamplerChanged);
    engine.off('change', saveToLocalStorage);
    engine.off('bpm-updated', setBpm);
    engine.off('swing-updated', setSwing);
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
          value={bpm()}
          onChange={handleTempoChange}
        />
        Swing:
        <input
          type="number"
          min="0"
          max="1"
          step="0.05"
          value={swing()}
          onChange={handleSwingChange}
        />
        <input type="text" onInput={addSampler} />
      </div>
      <button type="button" onClick={renderToWavefile}>
        Download WAV
      </button>
      <For each={samplers()}>
        {(sampler) => <VideoPlayer sampler={sampler} />}
      </For>
    </div>
  );
}
