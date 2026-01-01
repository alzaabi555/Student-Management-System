import { contextBridge, shell } from 'electron';

contextBridge.exposeInMainWorld('electron', {
  openExternal: (url) => shell.openExternal(url)
});