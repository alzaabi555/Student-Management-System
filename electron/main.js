
import { app, BrowserWindow, shell, ipcMain } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function createWindow() {
  // استخدام icon.png بدلاً من icon.ico لضمان التوافق مع ملفات المشروع المرفقة
  const iconPath = process.env.NODE_ENV === 'development'
    ? path.join(__dirname, '../public/assets/icon.png')
    : path.join(__dirname, '../dist/assets/icon.png');

  const win = new BrowserWindow({
    width: 1280,
    height: 850,
    show: false, // Don't show immediately to prevent white flash
    backgroundColor: '#f3f3f3', // Matches the app background color
    title: 'نظام مدرستي',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
      preload: path.join(__dirname, 'preload.js')
    },
    icon: iconPath // تعيين الأيقونة
  });

  win.setMenuBarVisibility(false);

  // Load the built app
  if (process.env.NODE_ENV === 'development') {
    win.loadURL('http://localhost:5173');
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  // Smooth Opening: Show window only when content is ready
  win.once('ready-to-show', () => {
    win.show();
    win.focus();
  });

  // Open external links in default browser
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
