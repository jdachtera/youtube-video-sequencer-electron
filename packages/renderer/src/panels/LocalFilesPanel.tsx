import { css } from '@emotion/css';
import {
  createEffect,
  createResource,
  createSignal,
  For,
  Show,
} from 'solid-js';
import { ButtonWithLabel } from '../UI/ButtonWithLabel';
import { Column, Row } from '../UI/Grid';
import { InputLCD } from '../UI/lcdStyles';
import { styled } from '../emotion-solid';
import type { Engine } from '../engine/Engine';
import { Track } from '../engine/Track';
import type { CachedFileSystemDirectoryHandle } from '../engine/blobStore';
import {
  loadCachedLocalDirectoryHandles,
  storeCachedLocalDirectoryHandle,
} from '../engine/blobStore';
import type { SamplerDevice } from '../engine/device/Sampler';
import { Slice } from '../engine/device/Slice';
import type { Result } from '../engine/localFile';
import {
  traverseFileHandle,
  loadFileAsDataUrl,
  resolveFileUrl,
} from '../engine/localFile';
import { BrowserListItem } from './List';

export const LocalFilesPanel = (props: { engine: Engine }) => {
  const [searchTerm, setSearchTerm] = createSignal('');

  const [selectedHandle, setSelectedHandle] =
    createSignal<CachedFileSystemDirectoryHandle>();

  const [selectedResult, setSelectedResult] = createSignal<Result>();

  const [results, setResults] = createSignal<Result[]>([]);

  const supportedExtensions = ['mp3', 'mp4', 'webm', 'wav', 'aiff'];

  const fetchResults = async () => {
    const handle = selectedHandle();
    const searchTermLowercase = searchTerm().toLowerCase();

    if (!handle) {
      setResults([]);
    } else {
      await handle?.requestPermission({
        mode: 'readwrite',
      });

      setResults(
        await traverseFileHandle(
          handle,
          `http://file.local:${handle.id}/${handle.name}`,
          (entry) => {
            const ext = entry.name.split('.').pop() ?? '';
            return (
              supportedExtensions.includes(ext) &&
              (!searchTermLowercase.length ||
                entry.name.toLowerCase().includes(searchTermLowercase))
            );
          },
        ),
      );
    }
  };

  createEffect(() => {
    console.dir(selectedHandle());
    fetchResults();
  });

  createEffect(() => {
    console.log(results());
  });
  const [directoryHandles, { refetch }] = createResource(async () =>
    loadCachedLocalDirectoryHandles(),
  );

  let playerRef: HTMLAudioElement | undefined;
  return (
    <Column flex={1} overflow={'hidden'}>
      <Row>
        <ButtonWithLabel
          label="Add directory"
          onClick={async () => {
            const dirHandle = await window.showDirectoryPicker();

            await dirHandle.requestPermission({
              mode: 'readwrite',
            });
            await storeCachedLocalDirectoryHandle(dirHandle);
            refetch();
          }}
        />
      </Row>
      <Row>
        <TagList>
          <For each={directoryHandles()}>
            {(handle) => (
              <Tag isActive={selectedHandle() === handle}>
                <span onClick={() => setSelectedHandle(handle)}>
                  {handle.name}
                </span>
                <span
                  onClick={() => {
                    //
                  }}
                >
                  x
                </span>
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
      >
        <InputLCD
          value={searchTerm()}
          placeholder="Enter search term"
          onChange={(event) => {
            setSearchTerm(event.currentTarget.value);
          }}
        />
      </Column>
      <Column
        flex={1}
        overflowY={'auto'}
        overflowX={'hidden'}
        class={css`
          margin-top: 10px;
        `}
      >
        <ul>
          <For each={results()}>
            {(item) => (
              <BrowserListItem
                isSelected={selectedResult() === item}
                thumbnail={''}
                name={item.name}
                onSelect={() => {
                  console.log(item);

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
                  const track = props.engine.createTrack(
                    Track.normalizeData({
                      chain: {
                        devices: [{ name: 'Sampler', url: item.url }],
                      },
                    }),
                  );

                  await track.hasLoaded();

                  const sampler = track.chain.devices[0] as SamplerDevice;
                  sampler.set({ title: item.name, collapsed: false });
                  sampler.createSlice(
                    Slice.normalizeData({
                      start: 0,
                      end: sampler.buffer.duration,
                    }),
                  );
                }}
              />
            )}
          </For>
        </ul>
      </Column>
      <Show when={selectedResult()}>
        {(item) => {
          const [dataUrl] = createResource(async () => {
            const file = await resolveFileUrl(item.url);
            if (file) {
              return loadFileAsDataUrl(file);
            }
            return;
          });

          return (
            <Show when={dataUrl()}>
              <audio
                ref={playerRef}
                muted={false}
                src={dataUrl()}
                autoplay
                preload="metadata"
                controls
              />
            </Show>
          );
        }}
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
