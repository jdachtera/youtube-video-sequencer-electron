export const getPeaks = async (
  data: Float32Array,
  samplesPerPx: number,
  cacheKey: string,
  onProgress: (progress: number) => void,
  start = 0,
  end: number = Math.ceil(data.length / samplesPerPx),
) => {
  const peaks = [];

  for (let x = start; x < end; x++) {
    peaks.push(getPeakAtCached(data, samplesPerPx, x, cacheKey));
    if (x % 10000 === 0) {
      onProgress(x / end);
      await new Promise(requestAnimationFrame);
    }
  }

  return peaks;
};

export const getPeakAtCached = (
  data: Float32Array,
  samplesPerPx: number,
  x: number,
  cacheKey: string,
) => {
  if (samplesPerPx === 1) {
    return [data[x], data[x]];
  }
  const peaksArray = getOrCreatePeaksCache(cacheKey, samplesPerPx);

  if (!peaksArray.has(x)) {
    const multiplicator = 2;
    const roughSamples = Math.ceil(samplesPerPx / multiplicator / 100) * 100;

    if (roughSamples > 100) {
      let min = 0;
      let max = 0;

      const start = Math.round((x * samplesPerPx) / roughSamples);
      for (let i = 0; i < multiplicator; i++) {
        const value = getPeakAtCached(data, roughSamples, start + i, cacheKey);
        if (value[1] > max) {
          max = value[1];
        }
        if (value[0] < min) {
          min = value[0];
        }
      }

      peaksArray.set(x, [min, max]);
    } else {
      peaksArray.set(x, getPeakAt(data, samplesPerPx, x));
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  return peaksArray.get(x)!;
};

export const getPeakAt = (
  data: Float32Array,
  samplesPerPx: number,
  x: number,
): [number, number] => {
  let max = 0;
  let min = 0;

  for (let i = 0; i < samplesPerPx; i++) {
    const index = Math.floor(x * samplesPerPx) + i;

    if (index >= data.length) break;

    const value = data[index];

    if (value > max) {
      max = value;
    } else if (value < min) {
      min = value;
    }
  }

  return [Math.round(min * 1024), Math.round(max * 1024)];
};

const cache: Map<
  string,
  Map<number, Map<number, [number, number]>>
> = new Map();

export const warmupCache = async (
  data: Float32Array,
  cacheKey: string,
  onProgress: (progress: number) => void,
) => {
  onProgress(1);

  const cachedSteps = Array.from({
    length: Math.ceil(data.length / 20000000),
  }).map((_, index) => {
    return (index + 2) * 100;
  });

  await cachedSteps.reduce(async (prev, samplesPerPx, i) => {
    await prev;
    await getPeaks(data, samplesPerPx, cacheKey, (progress) => {
      onProgress((i + progress) / cachedSteps.length);
    });
  }, Promise.resolve());

  onProgress(1);
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
