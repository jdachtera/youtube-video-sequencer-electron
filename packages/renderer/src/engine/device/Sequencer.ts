/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { batch } from 'solid-js';
import { Time } from 'tone';
import type { TransportTime } from 'tone/build/esm/core/type/Units';
import type { Engine } from '../Engine';
import type { PropertyUpdateEvents } from '../helpers';
import { randomColor, entries } from '../helpers';
import type { DeepPartial } from '../types';
import type { SerializedDeviceBase } from './Device';
import { Device } from './Device';
import type { SerializedPattern, Step } from './Patttern';
import { normalizeStepData, Pattern } from './Patttern';
import { getNextPatternIndex } from './patternNavigation';

export type SerializedSequencerDevice = SerializedDeviceBase & {
  name: 'Sequencer';
  currentPatternIndex: number;
  selectedPatternIndex: number;
  autoSelectPattern: boolean;
  patterns: SerializedPattern[];
};

export type SequencerEvents = {
  patternAdded: (pattern: Pattern) => void;
  patternRemoved: (pattern: Pattern) => void;
  patternUpdated: (pattern: Pattern) => void;
  cuedPatternIndexUpdated: (cuedPatternIndex: number) => void;
} & PropertyUpdateEvents<SerializedSequencerDevice>;

export class SequencerDevice extends Device<SequencerEvents> {
  name = 'Sequencer';

  patterns: Pattern[] = [];

  currentPatternIndex = 0;
  cuedPatternIndex = 0;
  selectedPatternIndex = 0;
  autoSelectPattern = false;

  scheduledFollowUpAction = 0;

  iteration = 0;

  static normalizeData = (
    sequencer: DeepPartial<
      SerializedSequencerDevice & { playbackSpeed: number }
    >,
  ): SerializedSequencerDevice => ({
    name: 'Sequencer',
    inputGain: sequencer.inputGain ?? 1,
    collapsed: sequencer.collapsed ?? false,
    color: sequencer.color ?? randomColor(),
    volume: sequencer.volume ?? 1,
    currentPatternIndex: sequencer.currentPatternIndex ?? 0,
    selectedPatternIndex: sequencer.selectedPatternIndex ?? 0,
    autoSelectPattern: sequencer.autoSelectPattern ?? false,
    patterns: (() => {
      const patterns = (
        Array.isArray(sequencer.patterns) ? sequencer.patterns : []
      )
        .filter(
          (maybePattern): maybePattern is DeepPartial<SerializedPattern> =>
            !!maybePattern,
        )
        .map(Pattern.normalizePatternData);

      // Keep the deserialized patterns when the first one carries content. A
      // piano-roll pattern has notes but an empty `steps` array, so the old
      // `steps.length` check discarded it on load — the pattern came back as a
      // fresh, silent step pattern (piano roll worked until you reloaded). Also
      // preserve an empty piano-roll pattern so its mode survives a reload.
      const first = patterns?.[0];
      const hasContent =
        !!first &&
        (first.steps.length > 0 ||
          first.notes.length > 0 ||
          first.mode === 'pianoroll');
      return hasContent ? patterns : [createEmptyPattern(16)];
    })(),
  });

  constructor(
    public engine: Engine,
    serializedSequencer: SerializedSequencerDevice,
  ) {
    super(engine);

    this.setMaxListeners(1000);

    this.engine = engine;

    this.set(serializedSequencer);

    this.engine.on('stop', this.rewindSequence);

    this.rewindSequence();
  }

  public onSequenceEvent = (time: number, step: Step) => {
    this.emit('sequenceEvent', time, step);
  };

  emitChange = () => this.emit('change', this);

  rewindSequence = () => {
    this.stopSequence();
    this.getPattern()?.start();
    this.engine.transport.scheduleOnce(() => {
      this.scheduleFollowUpAction();
    }, 0);
  };

  stopSequence = () => {
    this.getPattern()?.stop();
    this.engine.transport.clear(this.scheduledFollowUpAction);
  };

  createPattern(patternData: SerializedPattern, index = this.patterns.length) {
    const pattern = new Pattern(this, patternData);

    pattern.on('change', (pattern) => {
      this.emit('patternUpdated', pattern);
      this.emit('change', this);
    });

    this.patterns = [
      ...this.patterns.slice(0, index),
      pattern,
      ...this.patterns.slice(index),
    ];

    this.emit('patternAdded', pattern);
  }

  removePattern(pattern: Pattern) {
    const index = this.patterns.indexOf(pattern);
    this.patterns = [
      ...this.patterns.slice(0, index),
      ...this.patterns.slice(index + 1),
    ];

    if (this.patterns.length === 0) {
      this.createPattern(createEmptyPattern(16));
    }

    this.set({
      currentPatternIndex:
        (this.patterns.length + index - 1) % this.patterns.length,
    });

    this.emit('patternRemoved', pattern);

    pattern.dispose();
  }

  getPattern(index = this.currentPatternIndex): Pattern | undefined {
    return this.patterns?.[index];
  }

  set(sequencerPartial: Partial<SerializedSequencerDevice>) {
    batch(() => {
      entries(sequencerPartial).forEach((entry) => {
        if (!entry) return;

        switch (entry[0]) {
          case 'currentPatternIndex': {
            this.currentPatternIndex = entry[1]!;
            break;
          }
          case 'selectedPatternIndex':
            this.selectedPatternIndex = entry[1]!;
            break;
          case 'autoSelectPattern':
            this.autoSelectPattern = entry[1]!;
            break;
          case 'patterns': {
            this.getPattern()?.stop();
            this.patterns.forEach((pattern) => pattern.dispose());

            entry[1]?.forEach((pattern) => this.createPattern(pattern));

            break;
          }
          default:
            entry[0];
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        this.emit(`${entry[0]}Updated` as any, entry[1]);
      });

      this.emit('change', this);
    });
  }

  scheduleFollowUpAction() {
    const pattern = this.getPattern();

    if (!pattern) return;
    const {
      subdivision,
      subdivisionType,
      followupAction,
      steps: { length: patternLength },
    } = pattern;

    if (!followupAction || followupAction.type === 'no') return;

    const stepTime = Time(`${subdivision}${subdivisionType}`).toSeconds();

    const time = Time(
      Time(this.engine.transport.position).quantize(stepTime) +
        (followupAction.linked
          ? stepTime * patternLength * followupAction.multiplicator
          : stepTime * followupAction.triggerTime),
    ).toBarsBeatsSixteenths();

    if (followupAction.type === 'stop') {
      this.getPattern()?.stop(time);
    } else {
      const nextPatternIndex = this.getNextPatternIndex();

      this.cuePattern(nextPatternIndex, time);
    }
  }

  async cuePattern(nextPatternIndex: number, time: TransportTime) {
    if (this.scheduledFollowUpAction) {
      this.engine.transport.clear(this.scheduledFollowUpAction);
    }

    const currentPattern = this.getPattern();
    const nextPattern = this.getPattern(nextPatternIndex);

    currentPattern?.stop(time);
    nextPattern?.start(time);

    this.cuedPatternIndex = nextPatternIndex;
    this.emit('cuedPatternIndexUpdated', nextPatternIndex);

    if (this.engine.transport.state !== 'stopped') {
      await new Promise((resolve) => {
        this.scheduledFollowUpAction = this.engine.transport.scheduleOnce(
          resolve,
          time,
        );
      });
    }

    if (nextPatternIndex < this.patterns.length) {
      this.set({ currentPatternIndex: nextPatternIndex });
    }

    if (this.engine.transport.state !== 'stopped') {
      this.scheduleFollowUpAction();
    }
  }

  getNextPatternIndex() {
    const { followupAction } = this.patterns[this.currentPatternIndex];

    return getNextPatternIndex(
      followupAction,
      this.currentPatternIndex,
      this.patterns.length,
    );
  }

  serialize() {
    return {
      name: 'Sequencer',
      inputGain: this.input.gain.value,
      volume: this.output.gain.value,
      color: this.color,
      currentPatternIndex: this.currentPatternIndex,
      selectedPatternIndex: this.selectedPatternIndex,
      autoSelectPattern: this.autoSelectPattern,
      patterns: this.patterns.map((pattern) => pattern.serialize()),
      collapsed: this.collapsed,
    } as const;
  }

  dispose() {
    this.stopSequence();

    this.patterns.forEach((pattern) => pattern.dispose());

    // Mirror the single listener registered in the constructor.
    this.engine.off('stop', this.rewindSequence);
    this.removeAllListeners();

    // Release the base device's input/output Gain nodes too (this was
    // leaking two nodes per track on removal).
    super.dispose();
  }
}

const createEmptyPattern = (numberOfSteps = 16): SerializedPattern =>
  Pattern.normalizePatternData({
    steps: Array.from({ length: numberOfSteps }).map(() =>
      normalizeStepData({}),
    ),
  });
