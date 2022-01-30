import {
  DefaultListener,
  ListenerSignature,
  TypedEmitter,
} from 'tiny-typed-emitter';

export default class SubscriptionEventEmitter<
  L extends ListenerSignature<L> = DefaultListener
> extends TypedEmitter<L> {
  subscribe<U extends keyof L>(event: U, listener: L[U]) {
    this.on(event, listener);
    return () => {
      this.off(event, listener);
    };
  }
}
