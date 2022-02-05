export const Sequence = jest.fn().mockImplementation(() => {
  return { start: jest.fn(), events: [] };
});

export const Transport = {
  bpm: { balue: 120 },
  stop: jest.fn(),
  on: jest.fn(),
};

export const Offline = jest.fn();

export const Gain = jest.fn().mockImplementation(() => {
  return { toDestination: jest.fn(), gain: { value: 1 } };
});

export const ToneAudioBuffer = jest.fn().mockImplementation(() => {
  const buffer = {
    set: jest.fn(),
    load: jest.fn(),
    toMono: () => buffer,
    get: () => ({}),
    toArray: () => [],
  };
  return buffer;
});

export const Time = jest.fn();

export const Player = jest.fn().mockImplementation(() => {
  return { toDestination: jest.fn(), gain: { value: 1 } };
});
