import { Step } from './SequencerStep';

export type Slice = {
  id: string;
  start: number;
  end: number;
  playbackSpeed: number;
  reverse: boolean;
  color: string;
  patterns: Step[][];
};
