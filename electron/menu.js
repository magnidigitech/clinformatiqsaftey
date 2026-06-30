// ─── PharmaVigil – Application Menu ──────────────────────────────────────────
// Builds the native menu bar for the Electron window.
// ──────────────────────────────────────────────────────────────────────────────

const { Menu, app, shell } = require('electron')

const DOCS_URL = 'https://github.com/pharmavigil/docs'
const REPO_URL = 'https://github.com/pharmavigil/pharmavigil'

/**
 * Builds and sets the application menu.
 * @param {import('electron').BrowserWindow} mainWindow
 */
function createMenu (mainWindow) {
  const isMac = process.platform === 'darwin'

  /** @type {import('electron').MenuItemConstructorOptions[]} */
  const template = [
    // ─── File ──────────────────────────────────────────────────────────────
    {
      label: 'File',
      submenu: [
        {
          label: 'New Case',
          accelerator: 'CmdOrCtrl+N',
          click: () => {
            mainWindow.webContents.send('menu:new-case')
          },
        },
        {
          label: 'Save',
          accelerator: 'CmdOrCtrl+S',
          click: () => {
            mainWindow.webContents.send('menu:save')
          },
        },
        { type: 'separator' },
        isMac
          ? { role: 'close', label: 'Close Window' }
          : { role: 'quit', label: 'Quit PharmaVigil' },
      ],
    },

    // ─── Edit ──────────────────────────────────────────────────────────────
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { type: 'separator' },
        { role: 'selectAll' },
      ],
    },

    // ─── View ──────────────────────────────────────────────────────────────
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload', label: 'Force Reload' },
        { role: 'toggleDevTools', label: 'Toggle Developer Tools' },
        { type: 'separator' },
        { role: 'zoomIn', label: 'Zoom In' },
        { role: 'zoomOut', label: 'Zoom Out' },
        { role: 'resetZoom', label: 'Reset Zoom' },
        { type: 'separator' },
        { role: 'togglefullscreen', label: 'Toggle Fullscreen' },
      ],
    },

    // ─── Help ──────────────────────────────────────────────────────────────
    {
      label: 'Help',
      submenu: [
        {
          label: 'About PharmaVigil',
          click: async () => {
            const { dialog } = require('electron')
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'About PharmaVigil',
              message: 'PharmaVigil',
              detail: [
                `Version: ${app.getVersion()}`,
                `Electron: ${process.versions.electron}`,
                `Node.js: ${process.versions.node}`,
                `Chromium: ${process.versions.chrome}`,
                '',
                'Pharmacovigilance Case Processing Training Platform',
                '© 2024-2026 PharmaVigil Contributors',
              ].join('\n'),
              buttons: ['OK'],
            })
          },
        },
        {
          label: 'Documentation',
          click: async () => {
            await shell.openExternal(DOCS_URL)
          },
        },
        { type: 'separator' },
        {
          label: 'Learn More',
          click: async () => {
            await shell.openExternal(REPO_URL)
          },
        },
      ],
    },
  ]

  // macOS: prepend application menu
  if (isMac) {
    template.unshift({
      label: app.name,
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' },
      ],
    })
  }

  const menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)
}

module.exports = { createMenu }
