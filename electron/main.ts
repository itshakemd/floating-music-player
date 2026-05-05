import { app, BrowserWindow, Tray, Menu, nativeImage } from 'electron'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const require = createRequire(import.meta.url)
const __dirname = path.dirname(fileURLToPath(import.meta.url))

// The built directory structure
//
// ├─┬─┬ dist
// │ │ └── index.html
// │ │
// │ ├─┬ dist-electron
// │ │ ├── main.js
// │ │ └── preload.mjs
// │
process.env.APP_ROOT = path.join(__dirname, '..')

// 🚧 Use ['ENV_NAME'] avoid vite:define plugin - Vite@2.x
export const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']
export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron')
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist')

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, 'public') : RENDERER_DIST

let win: BrowserWindow | null
let tray: Tray | null
let isQuitting = false

function updateTrayMenu() {
  if (!tray) return
  const contextMenu = Menu.buildFromTemplate([
    { label: 'Floating Music Player', enabled: false },
    { type: 'separator' },
    { 
      label: win?.isVisible() ? 'Hide Window' : 'Show Window', 
      click: () => {
        if (win?.isVisible()) {
          win.hide()
        } else {
          win?.show()
          win?.focus()
        }
      } 
    },
    { type: 'separator' },
    { label: 'Quit', click: () => {
      isQuitting = true
      app.quit()
    }}
  ])
  tray.setContextMenu(contextMenu)
}

function createWindow() {
  win = new BrowserWindow({
    width: 400,
    height: 600,
    resizable: false,
    frame: false,
    movable: true,
    icon: path.join(process.env.VITE_PUBLIC, 'electron-vite.svg'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
    },
  })

  // Test active push message to Renderer-process.
  win.webContents.on('did-finish-load', () => {
    win?.webContents.send('main-process-message', (new Date).toLocaleString())
  })

  // Hide window instead of closing it
  win.on('close', (event) => {
    if (win && !isQuitting) {
      event.preventDefault()
      win.hide()
    }
  })

  win.on('show', () => {
    updateTrayMenu()
  })

  win.on('hide', () => {
    updateTrayMenu()
  })

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL)
  } else {
    // win.loadFile('dist/index.html')
    win.loadFile(path.join(RENDERER_DIST, 'index.html'))
  }
}

function createTray() {
  const iconPath = path.join(process.env.VITE_PUBLIC, 'electron-vite.svg')
  const icon = nativeImage.createFromPath(iconPath)
  
  tray = new Tray(icon)
  
  tray.setToolTip('Floating Music Player')
  updateTrayMenu()

  tray.on('click', () => {
    if (win?.isVisible()) {
      win.hide()
    } else {
      win?.show()
      win?.focus()
    }
  })
}

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
    win = null
    tray = null
  }
})

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

app.whenReady().then(() => {
  createWindow()
  createTray()
})
