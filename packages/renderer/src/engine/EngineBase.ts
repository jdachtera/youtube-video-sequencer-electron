import type { Accessor } from 'solid-js';
import { createEffect, createSignal, onCleanup } from 'solid-js';
import { createStore, reconcile, ReconcileOptions } from 'solid-js/store';
import type { DefaultListener, ListenerSignature } from 'tiny-typed-emitter';
import { TypedEmitter } from 'tiny-typed-emitter';

export class EngineBase<
  L extends ListenerSignature<L> = DefaultListener,
> extends TypedEmitter<L> {
  observable<U extends keyof L>(event: U) {
    return {
      subscribe: (callback: L[U]) => {
        this.on(event, callback);
        return {
          unsubscribe: () => {
            this.off(event, callback);
          },
        };
      },
    };
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const createSignalFromEventEmitter = <T, E extends TypedEmitter<any>>(
  eventEmitter: Accessor<E> | E,
  callback: (eventEmitter: E) => T,
  eventOrEvents: Parameters<E['on']>[0] | Parameters<E['on']>[0][],
) => {
  const getEmitter =
    typeof eventEmitter === 'function' ? eventEmitter : () => eventEmitter;

  const [value, setValue] = createSignal<T>(callback(getEmitter()));
  const updateValue = () => setValue(() => callback(getEmitter()));

  createEffect(updateValue);

  const events = Array.isArray(eventOrEvents) ? eventOrEvents : [eventOrEvents];

  const cleanup = (emitter?: E) =>
    events.forEach((event) => emitter?.off(event, updateValue));

  createEffect<E>((previousEmitter) => {
    cleanup(previousEmitter);
    events.forEach((event) => getEmitter().on(event, updateValue));
    return getEmitter();
  });

  onCleanup(() => cleanup(getEmitter()));

  return value;
};

export const createArraySignalFromEventEmitter = <
  T,
  A,
  E extends TypedEmitter<any>,
>(
  eventEmitter: Accessor<E> | E,
  getItems: (eventEmitter: E) => A[],
  callback: (item: A) => T,
  [itemAddedEvent, itemRemovedEvent, itemUpdatedEvent]: [
    itemAddedEvent: Parameters<E['on']>[0],
    itemRemovedEvent: Parameters<E['on']>[0],
    itemUpdatedEvent: Parameters<E['on']>[0],
  ],
) => {
  const getEmitter =
    typeof eventEmitter === 'function' ? eventEmitter : () => eventEmitter;

  const [state, setState] = createStore({
    items: getItems(getEmitter()),
    mappedItems: getItems(getEmitter()).map(callback),
  });

  const itemAdded = (item: A) => {
    setState('items', [...state.items, item]);
    setState('mappedItems', reconcile([...state.mappedItems, callback(item)]));
  };
  const itemRemoved = (item: A) => {
    const index = state.items.indexOf(item);

    setState('items', [
      ...state.items.slice(0, index),
      ...state.items.slice(index + 1),
    ]);

    setState(
      'mappedItems',
      reconcile([
        ...state.mappedItems.slice(0, index),
        ...state.mappedItems.slice(index + 1),
      ]),
    );
  };
  const itemUpdated = (item: A) => {
    const index = state.items.indexOf(item);
    setState(
      'mappedItems',
      reconcile([
        ...state.mappedItems.slice(0, index),
        callback(item),
        ...state.mappedItems.slice(index + 1),
      ]),
    );
  };

  const cleanup = (emitter?: E) => {
    emitter?.removeListener(itemAddedEvent, itemAdded);
    emitter?.removeListener(itemRemovedEvent, itemRemoved);
    emitter?.removeListener(itemUpdatedEvent, itemUpdated);
  };

  createEffect<E>((previousEmitter) => {
    cleanup(previousEmitter);
    getEmitter().addListener(itemAddedEvent, itemAdded);
    getEmitter().addListener(itemRemovedEvent, itemRemoved);
    getEmitter().addListener(itemUpdatedEvent, itemUpdated);
    return getEmitter();
  });

  onCleanup(() => cleanup(getEmitter()));

  const items = () => state.mappedItems;
  return items;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const createStoreFromEventEmitter = <T, E extends TypedEmitter<any>>(
  eventEmitter: Accessor<E> | E,
  callback: (eventEmitter: E) => T,
  eventOrEvents: Parameters<E['on']>[0] | Parameters<E['on']>[0][],
) => {
  const getEmitter =
    typeof eventEmitter === 'function' ? eventEmitter : () => eventEmitter;

  const [state, setState] = createStore<T>(callback(getEmitter()));
  const updateValue = () => setState(reconcile(callback(getEmitter())));

  createEffect(updateValue);

  const events = Array.isArray(eventOrEvents) ? eventOrEvents : [eventOrEvents];

  const cleanup = (emitter?: E) =>
    events.forEach((event) => emitter?.off(event, updateValue));

  createEffect<E>((previousEmitter) => {
    cleanup(previousEmitter);
    events.forEach((event) => getEmitter().on(event, updateValue));
    return getEmitter();
  });

  onCleanup(() => cleanup(getEmitter()));

  return state;
};
