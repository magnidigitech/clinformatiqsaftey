// ─── PharmaVigil – Electron Main Process ─────────────────────────────────────
// This file bootstraps the Electron shell.  In development it proxies to the
// Vite dev-server; in production it loads the built SPA from disk.
// ──────────────────────────────────────────────────────────────────────────────

const { app, BrowserWindow, ipcMain, dialog } = require('electron')
const path = require('node:path')
const { createMenu } = require('./menu')

// ─── Constants ───────────────────────────────────────────────────────────────
const IS_DEV = !app.isPackaged
const DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL || 'http://localhost:5173'
const MIN_WIDTH = 1280
const MIN_HEIGHT = 800
const DEFAULT_WIDTH = 1400
const DEFAULT_HEIGHT = 900

// ─── Globals ─────────────────────────────────────────────────────────────────
/** @type {BrowserWindow | null} */
let mainWindow = null

// ─── Window Factory ──────────────────────────────────────────────────────────
function createWindow () {
  mainWindow = new BrowserWindow({
    width: DEFAULT_WIDTH,
    height: DEFAULT_HEIGHT,
    minWidth: MIN_WIDTH,
    minHeight: MIN_HEIGHT,
    title: 'Clinformatiq',
    icon: path.join(__dirname, '../public/fc_logo.png'),
    backgroundColor: '#0f172a', // Tailwind slate-900 – avoids white flash
    show: false,                // show after ready-to-show to avoid flicker
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: false,
    },
  })

  // Build the application menu
  createMenu(mainWindow)

  // Graceful display – show only once content is painted
  mainWindow.once('ready-to-show', () => {
    mainWindow.show()
    mainWindow.focus()
  })

  // ─── Load Content ────────────────────────────────────────────────────────
  if (IS_DEV) {
    mainWindow.loadURL(DEV_SERVER_URL)
    mainWindow.webContents.openDevTools({ mode: 'bottom' })
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  // ─── Window Events ──────────────────────────────────────────────────────
  mainWindow.on('closed', () => {
    mainWindow = null
  })

  // Prevent external navigation in production
  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (!IS_DEV) {
      event.preventDefault()
    }
  })

  // Block new-window requests (popups)
  mainWindow.webContents.setWindowOpenHandler(() => {
    return { action: 'deny' }
  })
}

// ─── IPC Handlers ────────────────────────────────────────────────────────────
// Dialog: open file
ipcMain.handle('dialog:open', async (_event, options) => {
  if (!mainWindow) return { canceled: true, filePaths: [] }
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: options?.filters || [
      { name: 'JSON Files', extensions: ['json'] },
      { name: 'All Files', extensions: ['*'] },
    ],
  })
  return result
})

// App info
ipcMain.handle('app-info', () => {
  return {
    name: app.getName(),
    version: app.getVersion(),
    electron: process.versions.electron,
    node: process.versions.node,
    chrome: process.versions.chrome,
    platform: process.platform,
    arch: process.arch,
  }
})

// Generic data channel (future use)
ipcMain.handle('get-data', async (_event, key) => {
  // Placeholder for future data retrieval logic
  return null
})

ipcMain.on('save-data', (_event, payload) => {
  // Placeholder for future data persistence logic
  console.log('[main] save-data received:', payload?.type)
})

// ─── App Lifecycle ───────────────────────────────────────────────────────────
app.setName('Clinformatiq')

app.whenReady().then(() => {
  createWindow()

  // macOS: re-create window when dock icon is clicked and no windows exist
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

// Quit when all windows are closed (except macOS)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// Security: prevent additional webContents creation
app.on('web-contents-created', (_event, contents) => {
  contents.on('will-attach-webview', (event) => {
    event.preventDefault()
  })
})
