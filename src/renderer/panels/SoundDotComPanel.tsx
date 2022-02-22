import {
  createEffect,
  createResource,
  createSignal,
  For,
  Show,
  Suspense,
} from 'solid-js';

import { Engine } from 'renderer/engine/Engine';
import { Column, Row } from 'renderer/UI/Grid';
import { InputLCD } from 'renderer/UI/lcdStyles';
import { ButtonWithLabel } from 'renderer/UI/ButtonWithLabel';
import { css } from '@emotion/css';
import { Track } from 'renderer/engine/Track';
import { styled } from 'renderer/emotion-solid';
import { SamplerDevice } from 'renderer/engine/device/Sampler';
import { Slice } from 'renderer/engine/device/Slice';

const types = ['One-shot', 'Loop'] as const;

export const SoundsDotComPanel = (props: { engine: Engine }) => {
  const [searchTerm, setSearchTerm] = createSignal('breakbeat');

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

  const [result] = createResource(
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
      });
    }
  );

  const [selectedResult, setSelectedResult] =
    createSignal<
      NonNullable<ReturnType<typeof result>>['result']['sounds'][number]
    >();

  return (
    <Column flex={1} overflow={'hidden'}>
      <InputLCD
        value={searchTerm()}
        placeholder="Enter search term"
        onChange={(event) => setSearchTerm(event.currentTarget.value)}
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
      <Suspense>
        <Column
          flex={1}
          overflowY={'auto'}
          overflowX={'hidden'}
          class={css`
            margin-top: 10px;
          `}
        >
          <ul>
            <For each={result()?.result?.sounds ?? []}>
              {(item) => (
                <li
                  classList={{
                    [css`
                      display: flex;
                      cursor: pointer;
                      border-bottom: 1px black solid;
                      overflow: hidden;
                      height: 80px;
                    `]: true,
                    [css`
                      background: #363434;
                    `]: selectedResult() === item,
                  }}
                >
                  <div
                    class={css`
                      display: flex;
                      width: 80px;
                      height: 80px;
                      background-size: cover;
                      background-position: 50% 50%;
                    `}
                    style={{
                      'background-image': `url('${
                        result()?.result.sounds_releases.find(
                          ({ id }) => item.release_id
                        )?.cover_small ?? ''
                      }')`,
                    }}
                    onClick={() => setSelectedResult(item)}
                  ></div>
                  <div
                    class={css`
                      flex: 1;
                      padding: 5px;
                      text-overflow: ellipsis;
                      overflow: hidden;
                    `}
                    onClick={() => setSelectedResult(item)}
                  >
                    {item.name}
                  </div>
                  <div>
                    <ButtonWithLabel
                      label="+"
                      labelOnButton
                      onClick={async () => {
                        event?.preventDefault();
                        const track = props.engine.createTrack(
                          Track.normalizeData({
                            chain: {
                              devices: [
                                { name: 'Sampler', url: item.preview_mp3 },
                              ],
                            },
                          })
                        );

                        await track.hasLoaded();

                        const sampler = track.chain.devices[0] as SamplerDevice;
                        sampler.set({ title: item.name, collapsed: false });
                        sampler.createSlice(
                          Slice.normalizeData({
                            start: 0,
                            end: sampler.buffer.duration,
                          })
                        );
                      }}
                    />
                  </div>
                </li>
              )}
            </For>
          </ul>
        </Column>
      </Suspense>
      <Show when={selectedResult()}>
        {(item) => (
          <audio
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
  (props) => css`
    display: inline-block;
    display: inline-block;
    padding: 3px;
    margin: 3px;
    border-radius: 2px;
    cursor: pointer;
    ${props.isActive ? `background-color: darkgray;` : ''}
  `
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
