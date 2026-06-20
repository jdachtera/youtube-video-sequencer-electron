import { createEffect, createMemo, onCleanup, onMount } from 'solid-js';
import type { MenuItemSpec } from '../../../preload/src/exposedVars';
import { camelCaseToSpaced } from '../UI/format';
import { Engine } from '../engine/Engine';
import { createStoreFromEventEmitter } from '../engine/EngineBase';
import { exportBuffer } from '../engine/helpers';
import { createHistory } from '../engine/history';
import { notify } from '../notifications';

const isMac = navigator.userAgent.includes('Mac');

/**
 * Defines the native application menu (File / Edit / View) from the renderer and
 * routes its clicks back to engine actions. Because the template lives here — in
 * the remotely-loaded UI — the menu can change without shipping a new Electron
 * build. Renders nothing.
 *
 * Keyboard shortcuts for the moved actions stay in the renderer (input-guarded)
 * as the single source of truth; the menu shows the same accelerators with
 * `registerAccelerator: false` so they're discoverable but don't double-fire.
 */
export const AppMenu = (props: { engine: Engine }) => {
  const history = createHistory(props.engine);

  const state = createStoreFromEventEmitter(
    () => props.engine,
    (engine) => ({ viewMode: engine.viewMode }),
    ['viewModeUpdated'],
  );

  // --- actions (mirror the former toolbar buttons) ---
  const exportJSON = () => {
    const json = JSON.stringify(props.engine.serialize(), undefined, 2);
    const url = URL.createObjectURL(
      new Blob([json], { type: 'application/json' }),
    );
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'export.json';
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const importJSON = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.addEventListener('change', async () => {
      const file = input.files?.[0];
      if (!file) return;
      try {
        const parsed = JSON.parse(await file.text()) as Partial<
          ReturnType<Engine['serialize']>
        >;
        props.engine.set(Engine.normalizeData(parsed));
      } catch (error) {
        notify(
          `Couldn't import "${file.name}": ${
            error instanceof Error ? error.message : 'not a valid project file'
          }`,
          'error',
        );
      }
    });
    input.click();
  };

  const mixdown = async () => {
    try {
      notify('Rendering mixdown…');
      const length = props.engine.getMaxSequenceLength();
      const buffer = await props.engine.renderToBuffer(length);
      exportBuffer(buffer, 'export.wav', () => undefined);
    } catch (error) {
      notify(
        `Mixdown failed: ${
          error instanceof Error ? error.message : 'unknown error'
        }`,
        'error',
      );
    }
  };

  const clearAll = () => {
    if (
      window.confirm(
        'Clear the entire project? Everything in the rack will be removed.',
      )
    ) {
      props.engine.clear();
    }
  };

  const toggleViewMode = (key: keyof Engine['viewMode']) => {
    const viewMode = props.engine.viewMode;
    props.engine.set({ viewMode: { ...viewMode, [key]: !viewMode[key] } });
  };

  const toggleBrowser = () => {
    const viewMode = props.engine.viewMode;
    props.engine.set({
      viewMode: { ...viewMode, sidePanel: { open: !viewMode.sidePanel.open } },
    });
  };

  const actions: Record<string, () => void> = {
    import: importJSON,
    export: exportJSON,
    mixdown: () => void mixdown(),
    clear: clearAll,
    undo: history.undo,
    redo: history.redo,
  };

  const dispatch = (id: string) => {
    if (id === 'browser') return toggleBrowser();
    if (id.startsWith('view:')) {
      return toggleViewMode(
        id.slice('view:'.length) as keyof Engine['viewMode'],
      );
    }
    actions[id]?.();
  };

  onMount(() => {
    const unsubscribe = window.host?.onMenuClick?.(dispatch);
    if (unsubscribe) onCleanup(unsubscribe);
  });

  // Keyboard shortcuts for the moved actions (the toolbar keeps Play/Escape).
  const handleKeydown = (event: KeyboardEvent) => {
    if (
      event.target instanceof HTMLInputElement ||
      event.target instanceof HTMLTextAreaElement
    ) {
      return;
    }
    if (!(event.metaKey || event.ctrlKey)) return;
    if (event.code === 'KeyZ') {
      event.preventDefault();
      if (event.shiftKey) history.redo();
      else history.undo();
    } else if (event.code === 'KeyS') {
      event.preventDefault();
      exportJSON();
    } else if (event.code === 'KeyO') {
      event.preventDefault();
      importJSON();
    }
  };
  onMount(() => window.addEventListener('keydown', handleKeydown));
  onCleanup(() => window.removeEventListener('keydown', handleKeydown));

  // --- template (reactive to undo/redo + view-toggle state) ---
  const template = createMemo<MenuItemSpec[]>(() => [
    ...(isMac ? [{ role: 'appMenu', label: 'MegaRack' }] : []),
    {
      label: 'File',
      submenu: [
        {
          id: 'import',
          label: 'Import…',
          accelerator: 'CmdOrCtrl+O',
          registerAccelerator: false,
        },
        {
          id: 'export',
          label: 'Export…',
          accelerator: 'CmdOrCtrl+S',
          registerAccelerator: false,
        },
        { id: 'mixdown', label: 'Mixdown to WAV…' },
        { type: 'separator' },
        { id: 'clear', label: 'Clear All' },
        ...(isMac ? [] : [{ type: 'separator' as const }, { role: 'quit' }]),
      ],
    },
    {
      label: 'Edit',
      submenu: [
        {
          id: 'undo',
          label: 'Undo',
          accelerator: 'CmdOrCtrl+Z',
          registerAccelerator: false,
          enabled: history.canUndo(),
        },
        {
          id: 'redo',
          label: 'Redo',
          accelerator: 'Shift+CmdOrCtrl+Z',
          registerAccelerator: false,
          enabled: history.canRedo(),
        },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' },
      ],
    },
    {
      label: 'View',
      submenu: [
        {
          id: 'browser',
          type: 'checkbox',
          label: 'Browser',
          checked: state.viewMode.sidePanel?.open ?? false,
        },
        ...props.engine.viewModes.map((mode) => ({
          id: `view:${mode}`,
          type: 'checkbox' as const,
          label: camelCaseToSpaced(mode),
          checked: Boolean(state.viewMode[mode]),
        })),
        { type: 'separator' },
        { role: 'togglefullscreen' },
        { role: 'reload' },
        { role: 'toggleDevTools' },
      ],
    },
    { role: 'windowMenu' },
  ]);

  // Push the menu to the shell whenever it changes (no-op in a plain browser).
  createEffect(() => void window.host?.setMenu?.(template()));

  return null;
};
