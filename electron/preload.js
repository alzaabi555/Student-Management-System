import { contextBridge, shell, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electron', {
  openExternal: (url) => shell.openExternal(url),
  // Print functionality is now handled natively via window.print()
});