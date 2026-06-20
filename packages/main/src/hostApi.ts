import { app, ipcMain } from 'electron';
import { getChannel, hasRemote, listBranches, setChannel } from './channel';

/**
 * Version of the contextBridge / IPC contract this desktop shell exposes to the
 * renderer (the `window.yt` / `window.media` / `window.host` APIs).
 *
 * Bump this whenever that contract changes in a way a remotely-loaded renderer
 * could depend on (new IPC channel, changed payload shape, …). A renderer that
 * is served from GitHub Pages and loaded into an *older* installed shell can
 * read this via `window.host.getInfo()` and warn the user to update, instead of
 * silently calling methods the shell doesn't have.
 */
export const SHELL_API_VERSION = 1;

export interface HostInfo {
  apiVersion: number;
  appVersion: string;
  platform: NodeJS.Platform;
}

export const registerHostApi = (): void => {
  ipcMain.handle(
    'host:info',
    (): HostInfo => ({
      apiVersion: SHELL_API_VERSION,
      appVersion: app.getVersion(),
      platform: process.platform,
    }),
  );

  // Renderer "channel" (which Pages deployment / branch the UI is loaded from).
  ipcMain.handle('host:getChannel', () => ({
    current: getChannel(),
    hasRemote: hasRemote(),
  }));
  ipcMain.handle('host:setChannel', (_event, branch: string) =>
    setChannel(branch),
  );
  ipcMain.handle('host:listBranches', () => listBranches());
};
