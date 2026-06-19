import { render } from 'solid-js/web';
import { App } from './App';

(async () => {
  if (!window.yt) {
    window.global = window;
    const yt = await import('../../preload/src/youtube');

    window.yt = yt.default;

    window.host = {
      zoom: () => {
        //
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;
  }

  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  render(() => <App />, document.getElementById('root')!);
})();
