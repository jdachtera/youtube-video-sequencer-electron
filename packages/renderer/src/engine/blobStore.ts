import type { IDBPDatabase } from 'idb';
import { openDB } from 'idb';

export type CachedFileSystemDirectoryHandle = {
  id: number;
} & FileSystemDirectoryHandle;

let db: IDBPDatabase<{
  'video-cache': {
    key: string;
    value: Float32Array | Float32Array[];
  };
  'directory-handles': {
    key: number;
    value: CachedFileSystemDirectoryHandle;
  };
}>;

const dbVersion = 2;

const getDatabase = async () => {
  if (!db) {
    db = await openDB('cache', dbVersion, {
      upgrade(db, oldVersion) {
        if (oldVersion < 1) {
          db.createObjectStore('video-cache');
        }

        if (oldVersion < 2) {
          db.createObjectStore('directory-handles', {
            keyPath: 'id',
            autoIncrement: true,
          });
        }
      },
    });
  }
  return db;
};

export const loadCachedVideo = async (url: string) => {
  return (await getDatabase()).get('video-cache', url);
};

export const storeCachedVideo = async (
  url: string,
  data: Float32Array | Float32Array[],
) => {
  return (await getDatabase()).put('video-cache', data, url);
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
  handle;
  return (await getDatabase()).put(
    'directory-handles',
    handle as CachedFileSystemDirectoryHandle,
  );
};

export const removeCachedLocalDirectoryHandle = async (id: number) => {
  return (await getDatabase()).delete('directory-handles', id);
};
