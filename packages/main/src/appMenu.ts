import {
  Menu,
  type MenuItemConstructorOptions,
  type WebContents,
  ipcMain,
} from 'electron';

/**
 * Renderer-driven native application menu.
 *
 * The native menu normally lives in the main process, which means changing it
 * requires shipping a new Electron build. To avoid that — the renderer is loaded
 * from GitHub Pages and updates itself without a rebuild — the renderer instead
 * *defines* the menu and sends it here as a serializable template (`host:setMenu`).
 * Items with an `id` get a click that posts `menu:click` back to the renderer;
 * items with a built-in `role` use Electron's native behavior. So the menu's
 * contents and actions live in the (remotely-updatable) renderer, while the main
 * process only ships this generic builder.
 */

/** Serializable menu item received from the renderer (mirrors the preload type). */
export interface MenuItemSpec {
  id?: string;
  label?: string;
  role?: MenuItemConstructorOptions['role'];
  type?: 'normal' | 'separator' | 'submenu' | 'checkbox' | 'radio';
  accelerator?: string;
  registerAccelerator?: boolean;
  enabled?: boolean;
  checked?: boolean;
  submenu?: MenuItemSpec[];
}

// The renderer that last defined the menu; clicks are routed back to it.
let menuOwner: WebContents | null = null;

const toMenuItem = (spec: MenuItemSpec): MenuItemConstructorOptions => {
  const { id, submenu, ...rest } = spec;
  const item: MenuItemConstructorOptions = { ...rest };
  if (submenu) item.submenu = submenu.map(toMenuItem);
  // Custom (non-role) items route their click back to the renderer by id.
  if (id && !spec.role) {
    item.click = () => menuOwner?.send('menu:click', id);
  }
  return item;
};

/**
 * A sensible default native menu, installed at startup so the menu bar is never
 * empty before the renderer customizes it (and as a fallback for an older
 * renderer that doesn't). The renderer replaces this via `host:setMenu`.
 */
export const installDefaultMenu = (): void => {
  const isMac = process.platform === 'darwin';
  const template: MenuItemConstructorOptions[] = [
    ...(isMac ? [{ role: 'appMenu' as const }] : []),
    { role: 'fileMenu' },
    { role: 'editMenu' },
    { role: 'viewMenu' },
    { role: 'windowMenu' },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
};

export const registerMenuApi = (): void => {
  ipcMain.handle('host:setMenu', (event, template: MenuItemSpec[]) => {
    menuOwner = event.sender;
    Menu.setApplicationMenu(Menu.buildFromTemplate(template.map(toMenuItem)));
  });
};
