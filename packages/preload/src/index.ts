import { contextBridge } from 'electron';

import exposedVars from './exposedVars';

Object.entries(exposedVars).forEach(([key, value]) => {
  console.log(key, value);
  contextBridge.exposeInMainWorld(key, value);
});
