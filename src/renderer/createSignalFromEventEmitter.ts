import { createSignal, onCleanup, onMount } from 'solid-js';
import { TypedEmitter } from 'tiny-typed-emitter';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const createSignalFromEventEmitter = <T, E extends TypedEmitter<any>>(
  eventEmitter: E,
  eventOrEvents: Parameters<E['on']>[0] | Parameters<E['on']>[0][],
  callback: (eventEmitter: E) => T
) => {
  const [value, setValue] = createSignal<T>(callback(eventEmitter));
  const updateValue = () => setValue(() => callback(eventEmitter));

  const events = Array.isArray(eventOrEvents) ? eventOrEvents : [eventOrEvents];

  onMount(() => events.forEach((event) => eventEmitter.on(event, updateValue)));
  onCleanup(() =>
    events.forEach((event) => eventEmitter.off(event, updateValue))
  );

  return value;
};
