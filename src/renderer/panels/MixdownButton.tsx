import { Engine } from '../engine/Engine';
import { exportBuffer } from '../engine/helpers';
import { ButtonWithLabel } from '../UI/ButtonWithLabel';
import { createMemo, createSignal, onCleanup, onMount } from 'solid-js';

export const MixdownButton = (props: { engine: Engine }) => {
  const renderToWavefile = async () => {
    const timeToRender = props.engine.getMaxSequenceLength();
    const audioBuffer = await props.engine.renderToBuffer(timeToRender);
    exportBuffer(audioBuffer, 'export.wav', setEncodeProgress);
  };

  const [renderProgress, setRenderProgress] = createSignal(0);
  const [encodeProgress, setEncodeProgress] = createSignal(0);

  const progress = createMemo(() => (renderProgress() + encodeProgress()) / 2);

  onMount(() => props.engine.on('mixdownProgress', setRenderProgress));
  onCleanup(() => props.engine.off('mixdownProgress', setRenderProgress));

  return (
    <ButtonWithLabel
      onClick={renderToWavefile}
      labelOnButton={true}
      label={
        [0, 1].includes(progress())
          ? 'Mixdown'
          : `${Math.round(progress() * 100)}%`
      }
    />
  );
};
