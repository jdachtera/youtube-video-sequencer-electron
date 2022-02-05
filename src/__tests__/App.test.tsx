import '@testing-library/jest-dom';
import 'jest-canvas-mock';

import { render } from 'solid-testing-library';
import { App } from '../renderer/App';

describe('App', () => {
  it('should render', () => {
    expect(render(() => <App />)).toBeTruthy();
  });
});
