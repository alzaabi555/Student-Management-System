
const { ipcRenderer } = require('electron');

// تعريض وظائف محددة وآمنة لواجهة الويب
window.electron = {
  openExternal: (url) => {
    ipcRenderer.send('open-external', url);
  }
};
