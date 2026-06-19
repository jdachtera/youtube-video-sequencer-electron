import type { IDBPDatabase } from 'idb';
import { openDB } from 'idb';

export type CachedFileSystemDirectoryHandle = {
  id: number;
} & FileSystemDirectoryHandle;

let db: IDBPDatabase<{
  'directory-handles': {
    key: number;
    value: CachedFileSystemDirectoryHandle;
  };
}>;

// v3: audio is now cached as compressed files on disk by the main process
// (see packages/main/src/youtubeDownload.ts), so the decoded-PCM `video-cache`
// and `audio-buffers` stores are gone. Only File System Access directory
// handles remain — they can only be persisted via structured clone, so
// IndexedDB is the right (and only) home for them.
const dbVersion = 3;

const getDatabase = async () => {
  if (!db) {
    db = await openDB('cache', dbVersion, {
      upgrade(database, oldVersion) {
        if (oldVersion < 2) {
          database.createObjectStore('directory-handles', {
            keyPath: 'id',
            autoIncrement: true,
          });
        }

        if (oldVersion < 3) {
          // Drop the obsolete decoded-audio caches and reclaim their space.
          const legacy = database as unknown as IDBPDatabase;
          for (const name of ['video-cache', 'audio-buffers']) {
            if (legacy.objectStoreNames.contains(name)) {
              legacy.deleteObjectStore(name);
            }
          }
        }
      },
    });
  }
  return db;
};

export const loadCachedLocalDirectoryHandles = async () => {
  return (await getDatabase()).getAll('directory-handles');
};

export const loadCachedLocalDirectoryHandle = async (id: number) => {
  return (await getDatabase()).get('directory-handles', id);
};

export const storeCachedLocalDirectoryHandle = async (
  handle: FileSystemDirectoryHandle,
) => {
  return (await getDatabase()).put(
    'directory-handles',
    handle as CachedFileSystemDirectoryHandle,
  );
};

export const removeCachedLocalDirectoryHandle = async (id: number) => {
  return (await getDatabase()).delete('directory-handles', id);
};
