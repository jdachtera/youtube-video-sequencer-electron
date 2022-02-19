import { Accessor, createEffect, createSignal, onCleanup } from 'solid-js';
import { createStore, reconcile } from 'solid-js/store';
import {
  DefaultListener,
  ListenerSignature,
  TypedEmitter,
} from 'tiny-typed-emitter';

export abstract class EngineBase<
  L extends ListenerSignature<L> = DefaultListener
> extends TypedEmitter<L> {
  createSignal<U extends keyof L, R>(
    callback: (emitter: this) => R,
    event: U | U[]
  ) {
    return createSignalFromEventEmitter(
      this,
      Array.isArray(event) ? event : [event],
      callback
    );
  }

  createStore<U extends keyof L, R>(
    callback: (emitter: this) => R,
    event: U | U[]
  ) {
    return createStoreFromEventEmitter(
      this,
      Array.isArray(event) ? event : [event],
      callback
    );
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const createSignalFromEventEmitter = <T, E extends TypedEmitter<any>>(
  eventEmitter: Accessor<E> | E,
  eventOrEvents: Parameters<E['on']>[0] | Parameters<E['on']>[0][],
  callback: (eventEmitter: E) => T
) => {
  const getEmitter =
    typeof eventEmitter === 'function' ? eventEmitter : () => eventEmitter;

  const [value, setValue] = createSignal<T>(callback(getEmitter()));
  const updateValue = () => setValue(() => callback(getEmitter()));

  const events = Array.isArray(eventOrEvents) ? eventOrEvents : [eventOrEvents];

  const cleanup = (emitter?: E) =>
    events.forEach((event) => emitter?.on(event, updateValue));

  createEffect<E>((previousEmitter) => {
    cleanup(previousEmitter);
    events.forEach((event) => getEmitter().on(event, updateValue));
    return getEmitter();
  });

  onCleanup(() => cleanup(getEmitter()));

  return value;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const createStoreFromEventEmitter = <T, E extends TypedEmitter<any>>(
  eventEmitter: Accessor<E> | E,
  eventOrEvents: Parameters<E['on']>[0] | Parameters<E['on']>[0][],
  callback: (eventEmitter: E) => T
) => {
  const getEmitter =
    typeof eventEmitter === 'function' ? eventEmitter : () => eventEmitter;

  const [state, setState] = createStore<T>(callback(getEmitter()));
  const updateValue = () => setState(reconcile(callback(getEmitter())));

  const events = Array.isArray(eventOrEvents) ? eventOrEvents : [eventOrEvents];

  const cleanup = (emitter?: E) =>
    events.forEach((event) => emitter?.on(event, updateValue));

  createEffect<E>((previousEmitter) => {
    cleanup(previousEmitter);
    events.forEach((event) => getEmitter().on(event, updateValue));
    return getEmitter();
  });

  onCleanup(() => cleanup(getEmitter()));

  return state;
};
