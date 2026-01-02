import { app, BrowserWindow, shell, ipcMain } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Removed ipcMain.on('print-page') as we use window.print() in renderer for better UI.

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false, // Security best practice
      contextIsolation: true, // Required for contextBridge
      webSecurity: true,
      preload: path.join(__dirname, 'preload.js') // ربط ملف الجسر
    },
    // استخدام أيقونة png للنافذة
    icon: path.join(__dirname, '../public/assets/icon.png')
  });

  // Remove menu bar for cleaner app look
  win.setMenuBarVisibility(false);

  // Load the built app
  if (process.env.NODE_ENV === 'development') {
    win.loadURL('http://localhost:5173');
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  // Open external links in default browser (fallback)
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});