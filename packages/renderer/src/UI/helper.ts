import type { JSX } from 'solid-js';
import { onCleanup, onMount } from 'solid-js';

export const onWheelPassive =
  <E extends HTMLElement>(
    handleWheel: JSX.EventHandler<Required<E>, WheelEvent>,
  ) =>
  (ref: E) => {
    const handler = (e: WheelEvent) => {
      handleWheel(
        e as Parameters<JSX.EventHandler<Required<E>, WheelEvent>>[0],
      );
    };

    onMount(() => {
      ref?.addEventListener('wheel', handler, {
        passive: true,
      });
    });

    onCleanup(() => {
      ref?.removeEventListener('wheel', handler);
    });
  };
