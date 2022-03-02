export const getPeaks = (data: Float32Array, samplesPerPx: number) => {
  const peaks = [];
  const end = Math.ceil(data.length / samplesPerPx);

  for (let x = 0; x < end; x++) {
    peaks.push(getPeakAt(data, samplesPerPx, x));
  }

  return peaks;
};

export const getPeakAtCached = (
  data: Float32Array,
  samplesPerPx: number,
  x: number,
  cacheKey: string,
) => {
  const peaksArray = getOrCreatePeaksCache(cacheKey, samplesPerPx);

  if (!peaksArray.has(x)) {
    peaksArray.set(x, getPeakAt(data, samplesPerPx, x));
  }

  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  return peaksArray.get(x)!;
};

export const getPeakAt = (
  data: Float32Array,
  samplesPerPx: number,
  x: number,
) => {
  let absMax = 0;

  for (let i = 0; i < samplesPerPx; i++) {
    const index = Math.floor(x * samplesPerPx) + i;

    if (index >= data.length) break;

    const value = Math.abs(data[index]);

    if (value > absMax) {
      absMax = value;
    }
  }

  return Math.round(absMax * 128);
};

const cache: Map<string, Map<number, Map<number, number>>> = new Map();

export const warmupCache = async (
  data: Float32Array,
  cacheKey: string,
  onProgress: (progress: number) => void,
) => {
  const max = 10;
  onProgress(0);

  for (let i = 0; i < max; i++) {
    await new Promise(requestAnimationFrame);
    onProgress((i + 1) / max);

    const samplesPerPx = data.length / (10000 * i);

    const peaksCache = getOrCreatePeaksCache(cacheKey, samplesPerPx);
    getPeaks(data, samplesPerPx).forEach((peak, index) => {
      peaksCache.set(index, peak);
    });
  }
};

export const getOrCreatePeaksCache = (
  cacheKey: string,
  samplesPerPx: number,
) => {
  if (!cache.has(cacheKey)) {
    cache.set(cacheKey, new Map());
  }

  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const currentCache = cache.get(cacheKey)!;

  if (!currentCache.has(samplesPerPx)) {
    currentCache.set(samplesPerPx, new Map());
  }

  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  return currentCache.get(samplesPerPx)!;
};
