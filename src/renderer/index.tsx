import { render } from 'solid-js/web';
import { App } from './App';

render(() => <App />, document.getElementById('root')!);

/**
 * Hot Module Replacement (HMR) - Remove this snippet to remove HMR.
 * Learn more: https://www.snowpack.dev/#hot-module-replacement
 *
 * Note: Solid doesn't support state preservation on hot reload as of yet
 */
