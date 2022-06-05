import { loadCachedLocalDirectoryHandle } from '../engine/blobStore';

export type Result = {
  url: string;
  name: string;
};

export const traverseFileHandle = async (
  handle: FileSystemDirectoryHandle,
  pathPrefix: string,
  isMatching: (entry: FileSystemFileHandle) => boolean,
): Promise<Result[]> => {
  const matchingFiles = [];
  for await (const entry of handle.values()) {
    if (entry.kind === 'directory') {
      matchingFiles.push(
        ...(await traverseFileHandle(
          entry,
          `${pathPrefix}/${entry.name}`,
          isMatching,
        )),
      );
    } else {
      if (isMatching(entry)) {
        matchingFiles.push({
          url: `${pathPrefix}/${entry.name}`,
          name: entry.name,
        });
      }
    }
  }
  return matchingFiles;
};

export const resolveFileUrl = async (url: string) => {
  const parsedUrl = new URL(url);

  const handleId = +parsedUrl.port;
  const pathSegments = parsedUrl.pathname.split('/').slice(2);

  let currentDirHandle: FileSystemDirectoryHandle | undefined =
    await loadCachedLocalDirectoryHandle(handleId);

  let fileHandle: FileSystemFileHandle | undefined = undefined;

  for (let i = 0; i < pathSegments.length; i++) {
    if (!currentDirHandle) return;

    if (i === pathSegments.length - 1) {
      fileHandle = await currentDirHandle.getFileHandle(pathSegments[i]);
    } else {
      currentDirHandle = await currentDirHandle.getDirectoryHandle(
        pathSegments[i],
      );
    }
  }

  if (fileHandle) {
    const file = await fileHandle.getFile();
    return file;
  }
  return;
};

export const loadFileAsDataUrl = (file: File) => {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener('load', () => resolve(reader.result as string));
    reader.addEventListener('error', reject);
    reader.readAsDataURL(file);
  });
};

export const loadFileAsBuffer = (file: File) => {
  return new Promise<ArrayBuffer>((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener('load', () =>
      resolve(reader.result as ArrayBuffer),
    );
    reader.addEventListener('error', reject);
    reader.readAsArrayBuffer(file);
  });
};
