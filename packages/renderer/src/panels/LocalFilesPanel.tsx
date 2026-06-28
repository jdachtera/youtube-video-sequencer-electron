import { css } from '@emotion/css';
import {
  createEffect,
  createMemo,
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
import type { CachedFileSystemDirectoryHandle } from '../engine/blobStore';
import {
  loadCachedLocalDirectoryHandles,
  removeCachedLocalDirectoryHandle,
  storeCachedLocalDirectoryHandle,
} from '../engine/blobStore';
import type { Result } from '../engine/localFile';
import {
  traverseFileHandle,
  loadFileAsDataUrl,
  resolveFileUrl,
} from '../engine/localFile';
import { notify } from '../notifications';
import { BrowserListItem } from './List';

const supportedExtensions = [
  'mp3',
  'mp4',
  'm4a',
  'webm',
  'ogg',
  'wav',
  'aiff',
  'aif',
  'flac',
];

const isSupportedFile = (name: string) =>
  supportedExtensions.includes(name.split('.').pop()?.toLowerCase() ?? '');

// Files found in a directory carry which directory they came from so the list
// can show their origin and the search can stay flat across every folder.
type LocalFile = Result & { directory: string };

export const LocalFilesPanel = (props: { engine: Engine }) => {
  const [searchTerm, setSearchTerm] = createSignal('');
  const [selectedResult, setSelectedResult] = createSignal<LocalFile>();
  const [files, setFiles] = createSignal<LocalFile[]>([]);
  const [indexing, setIndexing] = createSignal(false);

  const [directoryHandles, { refetch }] = createResource(
    async () => loadCachedLocalDirectoryHandles(),
    { initialValue: [] },
  );

  // Grant — or check — read access. requestPermission needs a user gesture, so
  // it's only attempted when we know we have one (interactive).
  const ensurePermission = async (
    handle: CachedFileSystemDirectoryHandle,
    interactive: boolean,
  ) => {
    const options = { mode: 'read' } as const;
    if ((await handle.queryPermission(options)) === 'granted') return true;
    if (!interactive) return false;
    return (await handle.requestPermission(options)) === 'granted';
  };

  // Walk every directory once and build a flat, in-memory index. Searching then
  // filters this list instead of re-reading the disk on every keystroke.
  const indexDirectories = async (
    handles: CachedFileSystemDirectoryHandle[],
    interactive: boolean,
  ) => {
    setIndexing(true);
    try {
      const indexed: LocalFile[] = [];
      for (const handle of handles) {
        if (!(await ensurePermission(handle, interactive))) continue;
        const found = await traverseFileHandle(
          handle,
          `http://file.local:${handle.id}/${handle.name}`,
          (entry) => isSupportedFile(entry.name),
        );
        indexed.push(
          ...found.map((file) => ({ ...file, directory: handle.name })),
        );
      }
      indexed.sort((a, b) => a.name.localeCompare(b.name));
      setFiles(indexed);
    } finally {
      setIndexing(false);
    }
  };

  // Re-index whenever the set of folders changes (non-interactive: only reads
  // folders we already have permission for).
  createEffect(() => {
    const handles = directoryHandles();
    if (handles.length) {
      indexDirectories(handles, false);
    } else {
      setFiles([]);
    }
  });

  const filteredFiles = createMemo(() => {
    const term = searchTerm().toLowerCase().trim();
    if (!term) return files();
    return files().filter((file) => file.name.toLowerCase().includes(term));
  });

  const addFolder = async () => {
    try {
      const dirHandle = await window.showDirectoryPicker();
      await dirHandle.requestPermission({ mode: 'read' });
      await storeCachedLocalDirectoryHandle(dirHandle);
      const handles = await refetch();
      if (handles) await indexDirectories(handles, true);
    } catch (error) {
      // AbortError just means the user closed the picker — ignore it.
      if (error instanceof DOMException && error.name === 'AbortError') return;
      notify(
        `Couldn't open that folder: ${
          error instanceof Error ? error.message : 'unknown error'
        }`,
        'error',
      );
    }
  };

  const removeFolder = async (handle: CachedFileSystemDirectoryHandle) => {
    await removeCachedLocalDirectoryHandle(handle.id);
    refetch();
  };

  const rescan = async () => {
    const handles = directoryHandles();
    if (handles.length) await indexDirectories(handles, true);
  };

  let playerRef: HTMLAudioElement | undefined;

  return (
    <Column flex={1} overflow={'hidden'}>
      <Row
        class={css`
          gap: 4px;
          padding: 6px;
        `}
      >
        <ButtonWithLabel label="Add folder" labelOnButton onClick={addFolder} />
        <Show when={directoryHandles().length}>
          <ButtonWithLabel
            label={indexing() ? 'Scanning…' : 'Rescan'}
            labelOnButton
            disabled={indexing()}
            onClick={rescan}
          />
        </Show>
      </Row>

      <Show when={directoryHandles().length}>
        <TagList>
          <For each={directoryHandles()}>
            {(handle) => (
              <Tag>
                <span
                  class={css`
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                  `}
                  title={handle.name}
                >
                  📁 {handle.name}
                </span>
                <span
                  class={css`
                    cursor: pointer;
                    padding: 0 4px;
                    opacity: 0.7;
                    &:hover {
                      opacity: 1;
                    }
                  `}
                  title="Remove folder"
                  onClick={() => removeFolder(handle)}
                >
                  ✕
                </span>
              </Tag>
            )}
          </For>
        </TagList>
      </Show>

      <Show when={directoryHandles().length}>
        <Row
          class={css`
            padding: 0 6px;
          `}
        >
          <InputLCD
            class={css`
              flex: 1;
            `}
            value={searchTerm()}
            placeholder="Search your samples…"
            onInput={(event) => setSearchTerm(event.currentTarget.value)}
          />
        </Row>
      </Show>

      <Column
        flex={1}
        overflowY={'auto'}
        overflowX={'hidden'}
        class={css`
          margin-top: 6px;
          color: #cfcfcf;
        `}
      >
        <Show
          when={directoryHandles().length}
          fallback={
            <EmptyHint>
              Add a folder of audio or video files to search and sample your own
              local sounds.
            </EmptyHint>
          }
        >
          <Show
            when={filteredFiles().length}
            fallback={
              <EmptyHint>
                <Show when={!indexing()} fallback={<>Scanning your folders…</>}>
                  <Show
                    when={files().length}
                    fallback={<>No supported audio found in your folders.</>}
                  >
                    No samples match “{searchTerm()}”.
                  </Show>
                </Show>
              </EmptyHint>
            }
          >
            <ul
              class={css`
                margin: 0;
                padding: 0;
                list-style: none;
              `}
            >
              <For each={filteredFiles()}>
                {(item) => (
                  <BrowserListItem
                    isSelected={selectedResult() === item}
                    thumbnail={''}
                    name={item.name}
                    onSelect={() => {
                      if (selectedResult() === item) {
                        if (playerRef?.paused) playerRef?.play();
                        else playerRef?.pause();
                      }
                      setSelectedResult(item);
                    }}
                    onAdd={() => {
                      const sampler = props.engine.createSample({
                        url: item.url,
                        title: item.name,
                      });
                      props.engine.setCurrentSampler(sampler);
                    }}
                  />
                )}
              </For>
            </ul>
          </Show>
        </Show>
      </Column>

      <Show keyed when={selectedResult()}>
        {(item) => {
          const [dataUrl] = createResource(async () => {
            const file = await resolveFileUrl(item.url);
            return file ? loadFileAsDataUrl(file) : undefined;
          });

          return (
            <Show when={dataUrl()}>
              <audio
                ref={playerRef}
                src={dataUrl()}
                autoplay
                preload="metadata"
                controls
                class={css`
                  width: 100%;
                `}
              />
            </Show>
          );
        }}
      </Show>
    </Column>
  );
};

const EmptyHint = styled('div')`
  padding: 24px 16px;
  text-align: center;
  font-size: 13px;
  line-height: 1.5;
  color: #9a9a9a;
`;

const TagList = styled('ul')`
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  max-height: 120px;
  margin: 0;
  padding: 0 6px;
  overflow-y: auto;
  list-style: none;
`;

const Tag = styled('li')`
  display: inline-flex;
  align-items: center;
  max-width: 100%;
  padding: 2px 4px;
  border-radius: 3px;
  font-size: 12px;
  color: #eaeaea;
  background-color: rgba(255, 255, 255, 0.08);
`;
