const path = require('path');
const { app, BrowserWindow } = require('electron');
require('dotenv').config({ path: path.join(__dirname, 'config/config.env') });

if (process.env.NODE_ENV !== 'production') {
  require('electron-reload')(__dirname, {
    electron: path.join(__dirname, 'node_modules', '.bin', 'electron'),
    hardResetMethod: 'exit',
  });
}

// Example window
function createWindow() {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true,
    },
  });

  win.loadURL('http://localhost:4556'); // your frontend dev server
}

app.whenReady().then(createWindow);
