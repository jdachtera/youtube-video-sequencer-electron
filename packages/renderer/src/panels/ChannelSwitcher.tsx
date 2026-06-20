import { css } from '@emotion/css';
import {
  createResource,
  createSignal,
  For,
  onMount,
  Show,
  Suspense,
} from 'solid-js';
import { ButtonWithLabel } from '../UI/ButtonWithLabel';
import { notify } from '../notifications';

/**
 * Switch which GitHub Pages deployment (branch) the desktop shell loads the UI
 * from. Only shown when the shell has a remote renderer configured; in the
 * bundled/dev app it renders nothing. Picking a branch tells the shell to
 * persist the choice and reload from that branch's deployment.
 */
export const ChannelSwitcher = () => {
  const [channel, setChannel] = createSignal<{
    current: string;
    hasRemote: boolean;
  }>();
  const [open, setOpen] = createSignal(false);

  onMount(async () => {
    const info = await window.host?.getChannel?.().catch(() => undefined);
    if (info) setChannel(info);
  });

  // Branch list is fetched lazily, each time the menu opens.
  const [branches] = createResource(open, async () => {
    const list = (await window.host?.listBranches?.().catch(() => [])) ?? [];
    return ['main', ...list.filter((branch) => branch !== 'main')];
  });

  const switchTo = async (branch: string) => {
    setOpen(false);
    if (branch === channel()?.current) return;
    notify(`Loading “${branch}”…`);
    try {
      // The window reloads from the new deployment, so this UI unmounts.
      await window.host?.setChannel?.(branch);
    } catch {
      notify(`Couldn't switch to “${branch}”`, 'error');
    }
  };

  return (
    <Show when={channel()?.hasRemote}>
      <div
        class={css`
          position: relative;
        `}
      >
        <ButtonWithLabel
          labelOnButton
          label={`⑂ ${channel()?.current ?? 'main'}`}
          title="Switch which branch's online build to load"
          onClick={() => setOpen((value) => !value)}
        />
        <Show when={open()}>
          {/* Click-away backdrop. */}
          <div
            class={css`
              position: fixed;
              inset: 0;
              z-index: 40;
            `}
            onClick={() => setOpen(false)}
          />
          <div
            class={css`
              position: absolute;
              top: 100%;
              right: 0;
              z-index: 41;
              margin-top: 4px;
              min-width: 200px;
              max-height: 320px;
              overflow-y: auto;
              background: #2a2a2a;
              border: 1px solid #555;
              border-radius: 4px;
              box-shadow: 0 6px 16px rgba(0, 0, 0, 0.5);
              padding: 4px;
            `}
          >
            <div
              class={css`
                font-family: 'oswald';
                font-size: 10px;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                color: #888;
                padding: 4px 8px;
              `}
            >
              Online build
            </div>
            <Suspense
              fallback={
                <div
                  class={css`
                    padding: 8px;
                    color: #999;
                    font-size: 12px;
                  `}
                >
                  Loading branches…
                </div>
              }
            >
              <For each={branches()}>
                {(branch) => (
                  <button
                    type="button"
                    onClick={() => void switchTo(branch)}
                    class={css`
                      display: flex;
                      align-items: center;
                      gap: 6px;
                      width: 100%;
                      text-align: left;
                      background: transparent;
                      border: none;
                      cursor: pointer;
                      padding: 6px 8px;
                      border-radius: 3px;
                      font-family: 'oswald';
                      font-size: 13px;
                      color: #e6e6e6;
                      &:hover {
                        background: rgba(255, 255, 255, 0.08);
                      }
                    `}
                  >
                    <span
                      class={css`
                        width: 10px;
                        color: #ff9100;
                      `}
                    >
                      {branch === channel()?.current ? '●' : ''}
                    </span>
                    <span
                      class={css`
                        overflow: hidden;
                        text-overflow: ellipsis;
                        white-space: nowrap;
                      `}
                    >
                      {branch === 'main' ? 'main (stable)' : branch}
                    </span>
                  </button>
                )}
              </For>
            </Suspense>
          </div>
        </Show>
      </div>
    </Show>
  );
};
