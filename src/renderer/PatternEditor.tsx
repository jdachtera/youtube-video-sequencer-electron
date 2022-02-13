import { createMemo, For, untrack, JSX, splitProps } from 'solid-js';
import { css } from 'solid-styled-components';
import { createSignalFromEventEmitter } from './createSignalFromEventEmitter';
import { Sampler } from './engine/Sampler';
import { SamplerSlice } from './engine/SamplerSlice';
import { Pattern, subdivisions, subdivisionTypes } from './engine/types';
import { MoogKnobWithLabel } from './Knob';
import { Label } from './Label';
import { Sequencer } from './Sequencer';
import { Toggle } from './Toggle';
import { LCD, ScreenPrintBackground } from './UI';

export const PatternEditor = (
  allProps: { sampler: Sampler } & JSX.IntrinsicElements['div']
) => {
  const [props, divProps] = splitProps(allProps, ['sampler']);
  const chains = createSignalFromEventEmitter(
    untrack(() => props.sampler),
    ['chain-added', 'chain-removed'],
    (sampler) => sampler.getChains()
  );

  const currentPatternIndex = createSignalFromEventEmitter(
    untrack(() => props.sampler.engine),
    ['current-pattern-index-updated'],
    (engine) => engine.currentPatternIndex
  );

  return (
    <div {...divProps}>
      <For each={chains()} fallback={<div>loading chains..</div>}>
        {(chain) => (
          <SlicePattern
            chain={chain}
            currentPatternIndex={currentPatternIndex()}
          />
        )}
      </For>
    </div>
  );
};

export const SlicePattern = (
  allProps: {
    chain: SamplerSlice;
    currentPatternIndex: number;
  } & JSX.IntrinsicElements['div']
) => {
  const [props, divProps] = splitProps(allProps, [
    'chain',
    'currentPatternIndex',
  ]);
  const slice = createSignalFromEventEmitter(
    untrack(() => props.chain),
    ['chain-updated'],
    (chain) => chain.serialize()
  );

  const currentPattern = createMemo(
    () => slice().patterns[props.currentPatternIndex]
  );

  return (
    <div
      {...divProps}
      classList={{
        ...divProps.classList,
        [css`
          display: flex;
          align-items: center;
        `]: true,
      }}
    >
      <LCD>foo</LCD>
      <Label label={slice().name} />
      <ScreenPrintBackground background={slice().color}>
        {
          <>
            {' '}
            <Sequencer
              steps={slice().patterns[props.currentPatternIndex].steps}
              onChange={(steps) => {
                props.chain.updatePattern(props.currentPatternIndex, {
                  steps,
                });
              }}
              chain={props.chain}
            />{' '}
            <Toggle
              label="Solo"
              checked={slice().solo}
              onChange={(solo, altKey) => {
                props.chain.setSolo(solo, altKey);
              }}
            />
            <MoogKnobWithLabel
              label="Steps"
              step={1}
              min={1}
              max={1024}
              speed={0.1}
              fineIsDefault
              value={currentPattern()?.steps?.length}
              onChange={(patternLength) => {
                props.chain.updatePatternLength(
                  props.currentPatternIndex,
                  patternLength
                );
              }}
            />
            <select
              value={currentPattern()?.subdivision ?? 16}
              onChange={(event) => {
                props.chain.updatePattern(props.currentPatternIndex, {
                  subdivision: +event.currentTarget.value,
                });
              }}
            >
              <For each={subdivisions}>
                {(subdivision) => (
                  <option value={subdivision}>{subdivision}</option>
                )}
              </For>
            </select>
            <select
              value={currentPattern()?.subdivisionType ?? 'n'}
              onChange={(event) => {
                props.chain.updatePattern(props.currentPatternIndex, {
                  subdivisionType: event.currentTarget
                    .value as Pattern['subdivisionType'],
                });
              }}
            >
              <For each={subdivisionTypes}>
                {(subdivisionType) => (
                  <option value={subdivisionType}>{subdivisionType}</option>
                )}
              </For>
            </select>
          </>
        }
      </ScreenPrintBackground>
    </div>
  );
};
