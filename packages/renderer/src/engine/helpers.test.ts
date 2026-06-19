import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchSliceUrlInfo } from './helpers';

// helpers.ts imports file-saver at module load; it's only used by exportBuffer.
// vi.mock is hoisted above the imports by vitest, so this stub is registered
// before ./helpers (and its file-saver import) is evaluated.
vi.mock('file-saver', () => ({ default: { saveAs: vi.fn() } }));

type YtMock = {
  getInfo: ReturnType<typeof vi.fn>;
  fetchVideo: ReturnType<typeof vi.fn>;
};

const setYt = (yt: Partial<YtMock>) => {
  (window as unknown as { yt: unknown }).yt = yt;
};

describe('fetchSliceUrlInfo', () => {
  beforeEach(() => {
    setYt({});
  });

  it('downloads YouTube urls through window.yt and returns title + buffer', async () => {
    const buffer = new ArrayBuffer(16);
    const yt: YtMock = {
      getInfo: vi.fn().mockResolvedValue({ basic_info: { title: 'My Track' } }),
      fetchVideo: vi.fn().mockResolvedValue(buffer),
    };
    setYt(yt);

    const url = 'https://www.youtube.com/watch?v=abc123';
    const result = await fetchSliceUrlInfo(url);

    expect(yt.getInfo).toHaveBeenCalledWith(url);
    expect(yt.fetchVideo).toHaveBeenCalledWith(url);
    expect(result).toEqual({ title: 'My Track', buffer });
  });

  it('throws when the YouTube download yields no buffer', async () => {
    setYt({
      getInfo: vi.fn().mockResolvedValue({ basic_info: { title: 't' } }),
      fetchVideo: vi.fn().mockResolvedValue(undefined),
    });

    await expect(
      fetchSliceUrlInfo('https://youtube.com/watch?v=missing'),
    ).rejects.toThrow('Download failed');
  });

  it('derives a title from local file urls without touching the network', async () => {
    const result = await fetchSliceUrlInfo(
      'http://local.file/dir/Cool Sample.wav',
    );

    expect(result).toEqual({
      sourceUrl: 'http://local.file/dir/Cool Sample.wav',
      title: 'Cool Sample',
    });
  });

  it('passes other urls through with an empty title', async () => {
    const result = await fetchSliceUrlInfo('https://example.com/audio.mp3');

    expect(result).toEqual({
      sourceUrl: 'https://example.com/audio.mp3',
      title: '',
    });
  });
});
