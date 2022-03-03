import type { IDBPDatabase } from 'idb';
import { openDB } from 'idb';

let db: IDBPDatabase<{
  'video-cache': {
    key: string;
    value: Float32Array | Float32Array[];
  };
}>;

const dbVersion = 1;

const getDatabase = async () => {
  if (!db) {
    db = await openDB('cache', dbVersion, {
      upgrade(db) {
        db.createObjectStore('video-cache');
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
