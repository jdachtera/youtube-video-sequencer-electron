import { render } from 'solid-js/web';
import { App } from './App';

(async () => {
  if (!window.yt) {
    window.global = window;
    const [yt, soundsDotCom] = await Promise.all([
      import('../../preload/src/youtube'),
      import('../../preload/src/sounds'),
    ]);

    window.yt = yt.default;
    window.soundsDotCom = soundsDotCom.default;

    window.host = {
      zoom: () => {
        //
      },
    } as any;
  }

  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  render(() => <App />, document.getElementById('root')!);
})();
