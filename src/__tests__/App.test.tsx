import '@testing-library/jest-dom';
import 'jest-canvas-mock';
import { render } from 'solid-testing-library';
import { App } from '../renderer/App';

jest.mock('tone', () => {
  return {
    Sequence: jest.fn().mockImplementation(() => {
      return { start: jest.fn(), events: [] };
    }),
    Transport: {
      bpm: { balue: 120 },
      stop: jest.fn(),
      on: jest.fn(),
    },
    Offline: jest.fn(),
    Gain: jest.fn().mockImplementation(() => {
      return { toDestination: jest.fn(), gain: { value: 1 } };
    }),
    ToneAudioBuffer: jest.fn().mockImplementation(() => {
      const buffer = {
        set: jest.fn(),
        load: jest.fn(),
        toMono: () => buffer,
        get: () => ({}),
      };
      return buffer;
    }),
    Time: jest.fn(),
    Player: jest.fn().mockImplementation(() => {
      return { toDestination: jest.fn(), gain: { value: 1 } };
    }),
  };
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(global as any).yt = {
  getYouTubeVideoSource: jest
    .fn()
    .mockImplementation(async () => 'http://mock_url'),
};

describe('App', () => {
  it('should render', () => {
    expect(render(() => <App />)).toBeTruthy();
  });
});
