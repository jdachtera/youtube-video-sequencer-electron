import { css } from '@emotion/css';
import {
  createEffect,
  createResource,
  createSignal,
  For,
  Show,
  Suspense,
} from 'solid-js';
import { Column, Row } from '../UI/Grid';
import { InputLCD } from '../UI/lcdStyles';
import { styled } from '../emotion-solid';
import type { Engine } from '../engine/Engine';
import { Slice } from '../engine/device/Slice';
import { BrowserListItem } from './List';

const types = ['One-shot', 'Loop'] as const;

export const SoundsDotComPanel = (props: { engine: Engine }) => {
  const [searchTerm, setSearchTerm] = createSignal('Kick');

  const [selectedType, setSelectedType] =
    createSignal<typeof types[number]>('One-shot');

  const [selectedInstrumentType, setSelectedInstrumentType] =
    createSignal<keyof typeof typeMap>('Drums');

  const [selectedInstrument, setSelectedInstrument] =
    createSignal<typeof typeMap[keyof typeof typeMap][number]>();

  createEffect(() => {
    const instrument = selectedInstrument();
    if (selectedType() !== 'One-shot') {
      setSelectedInstrument(undefined);
    } else {
      if (
        instrument &&
        !typeMap[selectedInstrumentType()].includes(instrument)
      ) {
        setSelectedInstrument(undefined);
      }
    }
  });

  const fetchPage = (page: number) => {
    return createResource(
      () => ({
        keyword: searchTerm(),
        type: selectedType(),
        instrument: selectedInstrument(),
      }),
      ({ instrument, keyword, type }) => {
        return window.soundsDotCom.searchSounds({
          keyword,
          type,
          instrument,
          page,
        });
      },
    );
  };

  const fetchNextPage = () => {
    setResultPages([...resultPages(), fetchPage(resultPages().length)]);
  };

  const [resultPages, setResultPages] = createSignal<
    ReturnType<typeof fetchPage>[]
  >([]);

  fetchNextPage();

  const [selectedResult, setSelectedResult] =
    createSignal<
      NonNullable<
        ReturnType<ReturnType<typeof fetchPage>[0]>
      >['result']['sounds'][number]
    >();

  let playerRef: HTMLAudioElement | undefined;
  return (
    <Column flex={1} overflow={'hidden'}>
      <InputLCD
        value={searchTerm()}
        placeholder="Enter search term"
        onChange={(event) => {
          setResultPages(resultPages().slice(0, 1));
          setSearchTerm(event.currentTarget.value);
        }}
      />
      <Row>
        <TagList>
          <For each={types}>
            {(type) => (
              <Tag
                isActive={selectedType() === type}
                onClick={() => setSelectedType(type)}
              >
                {type}
              </Tag>
            )}
          </For>
        </TagList>
      </Row>
      <Row hidden={selectedType() !== 'One-shot'}>
        <TagList>
          <For each={Object.keys(typeMap) as (keyof typeof typeMap)[]}>
            {(instrumentType) => (
              <Tag
                isActive={selectedInstrumentType() === instrumentType}
                onClick={() => setSelectedInstrumentType(instrumentType)}
              >
                {instrumentType}
              </Tag>
            )}
          </For>
        </TagList>
      </Row>
      <Row hidden={selectedType() !== 'One-shot'}>
        <TagList>
          <For each={typeMap[selectedInstrumentType()]}>
            {(instrument) => (
              <Tag
                isActive={selectedInstrument() === instrument}
                onClick={() => setSelectedInstrument(instrument)}
              >
                {instrument}
              </Tag>
            )}
          </For>
        </TagList>
      </Row>

      <Column
        flex={1}
        overflowY={'auto'}
        overflowX={'hidden'}
        class={css`
          margin-top: 10px;
        `}
        onScroll={(event) => {
          const { scrollTop, scrollHeight, clientHeight } = event.currentTarget;

          const percentScrolled = scrollTop / (scrollHeight - clientHeight);
          const numberOfPages = resultPages().length;

          const lastPage = resultPages()[numberOfPages - 1];

          if (percentScrolled > 1 - 0.5 / numberOfPages && lastPage[0]?.()) {
            fetchNextPage();
          }
        }}
      >
        <ul>
          <For each={resultPages()}>
            {([result]) => (
              <Suspense fallback={'Loading....'}>
                <For each={result()?.result?.sounds ?? []}>
                  {(item) => (
                    <BrowserListItem
                      isSelected={selectedResult() === item}
                      thumbnail={
                        result()?.result.sounds_releases.find(
                          () => item.release_id,
                        )?.cover_small ?? ''
                      }
                      name={item.name}
                      onSelect={() => {
                        if (selectedResult() === item) {
                          if (playerRef?.paused) {
                            playerRef?.play();
                          } else {
                            playerRef?.pause();
                          }
                        }
                        setSelectedResult(item);
                      }}
                      onAdd={async () => {
                        event?.preventDefault();

                        props.engine.createSliceTrack(
                          Slice.normalizeData({
                            url: item.preview_mp3,
                            start: 0,
                            end: +item.duration,
                          }),
                        );
                      }}
                    />
                  )}
                </For>
              </Suspense>
            )}
          </For>
        </ul>
      </Column>

      <Show keyed when={selectedResult()}>
        {(item) => (
          <audio
            ref={playerRef}
            muted={false}
            src={item.preview_mp3}
            autoplay
            preload="metadata"
            controls
          />
        )}
      </Show>
    </Column>
  );
};

const TagList = styled('ul')`
  flex: 1;
  max-height: 200px;
  margin-top: 5px;
  overflow-y: auto;
  list-style: none;
`;

const Tag = styled('li')<{ isActive?: boolean }>(
  (p) => css`
    display: inline-block;
    display: inline-block;
    padding: 1px 2px;
    margin: 1px 2px;
    border-radius: 2px;
    cursor: pointer;
    ${p.isActive ? 'background-color: darkgray;' : ''}
  `,
);

const typeMap = {
  Drums: [
    'Side Stick',
    'Tom',
    'Floor',
    'Snare',
    'Drums',
    'Clap',
    'Cymbal',
    'China',
    'Clash',
    'Crash',
    'Finger',
    'Gong',
    'Hihat Closed',
    'Hihat Open',
    'Hihat Pedal',
    'Ride',
    'Ride Bell',
    'Sizzle',
    'Kick',
    'Percussion',
    'Agogo',
    'Bell',
    'Block',
    'Bongo',
    'Cajon',
    'Castanets',
    'Clave',
    'Click',
    'Conga',
    'Cowbell',
    'Darabuka',
    'Djembe',
    'Guiro',
    'Snap',
    'Steel Drum',
    'Tabla',
    'Taiko',
    'Tambourine',
    'Timbale',
    'Timpani',
    'Triangle',
    'Shaker',
    'Maracas',
    'Brush',
    'Rimshot',
  ].sort(),
  'One Shots': [
    'Bass',
    'Double Bass',
    'Bowed Strings',
    'Violin',
    'Viola',
    'Cello',
    'Horn',
    'Brass',
    'French',
    'Trombone',
    'Trumpet',
    'Tuba',
    'Roto',
    'Didgeridoo',
    'Concert',
    'Whistle',
    'Flute',
    'Recorder',
    'Ocarina',
    'Shakuhachi',
    'Pan',
    'Piccolo',
    'Pedal',
    'Guitar',
    'Dobro',
    'Lap',
    'Lute',
    'Slide',
    'Harpsichord',
    'Upright',
    'Toy',
    'Grand',
    'Piano',
    'Clavinet',
    'Celesta',
    'Keyboard',
    'Vibraphone',
    'Mallet',
    'Chimes',
    'Glockenspiel',
    'Marimba',
    'Xylophone',
    'Tonewheel',
    'Pipe',
    'Accordion',
    'Organ',
    'Transistor',
    'Mandolin',
    'Harp',
    'Banjo',
    'Plucked Strings',
    'Ukulele',
    'Sitar',
    'Koto',
    'Reed',
    'Tenor',
    'Soprano',
    'Baritone',
    'Alto',
    'Saxophone',
    'Oboe',
    'Melodica',
    'Harmonica',
    'Clarinet',
    'Bassoon',
    'Bag Pipe',
    'Field Recording',
    'Natural',
    'Noise',
    'Foley',
    'Sound Effects',
    'Soundscape',
    'Synth',
    'Male',
    'Female',
    'Vocal',
    'Choir',
  ],
};
