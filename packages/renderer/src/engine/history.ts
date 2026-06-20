import { createSignal, onCleanup, onMount } from 'solid-js';
import { debounce } from 'ts-debounce';
import { Engine } from './Engine';

const HISTORY_LIMIT = 50;

/**
 * Snapshot-based undo/redo for the engine. The engine serializes to JSON and
 * `engine.set(normalizeData(...))` fully rebuilds from a snapshot, so history is
 * just a stack of serialized states.
 *
 * Captures are debounced so a burst of parameter tweaks collapses into a single
 * undo step, and the first change after mount (the initial localStorage load)
 * becomes the baseline. The capture scheduled by an undo/redo apply is cancelled
 * so replaying a state never registers as a new edit.
 */
export function createHistory(engine: Engine) {
  const [entries, setEntries] = createSignal<string[]>([]);
  const [pointer, setPointer] = createSignal(-1);

  const snapshot = () => JSON.stringify(engine.serialize());

  // Accepts (and ignores) the engine arg the 'change' event passes.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const capture = (..._args: unknown[]) => {
    const current = snapshot();
    const all = entries();
    const p = pointer();

    if (all[p] === current) return; // nothing changed since the last snapshot

    const next = [...all.slice(0, p + 1), current].slice(-HISTORY_LIMIT);
    setEntries(next);
    setPointer(next.length - 1);
  };

  const debouncedCapture = debounce(capture, 500);

  const apply = (state: string) => {
    engine.set(Engine.normalizeData(JSON.parse(state)));
    // Drop the capture this apply just scheduled; it isn't a user edit.
    debouncedCapture.cancel();
  };

  const undo = () => {
    const p = pointer();
    if (p <= 0) return;
    setPointer(p - 1);
    apply(entries()[p - 1]);
  };

  const redo = () => {
    const p = pointer();
    const all = entries();
    if (p >= all.length - 1) return;
    setPointer(p + 1);
    apply(all[p + 1]);
  };

  onMount(() => engine.on('change', debouncedCapture));
  onCleanup(() => engine.off('change', debouncedCapture));

  return {
    undo,
    redo,
    canUndo: () => pointer() > 0,
    canRedo: () => pointer() < entries().length - 1,
  };
}
