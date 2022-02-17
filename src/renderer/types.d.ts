import type { ExposedVars } from 'main/exposedVars';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-empty-interface
  interface Window extends ExposedVars {}
}
