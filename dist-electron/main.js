import { ipcMain, desktopCapturer, app, BrowserWindow, nativeImage, Tray, Menu } from "electron";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { exec } from "node:child_process";
createRequire(import.meta.url);
const __dirname$1 = path.dirname(fileURLToPath(import.meta.url));
process.env.APP_ROOT = path.join(__dirname$1, "..");
const VITE_DEV_SERVER_URL = process.env["VITE_DEV_SERVER_URL"];
const MAIN_DIST = path.join(process.env.APP_ROOT, "dist-electron");
const RENDERER_DIST = path.join(process.env.APP_ROOT, "dist");
process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, "public") : RENDERER_DIST;
let win;
let tray;
let isQuitting = false;
function updateTrayMenu() {
  if (!tray) return;
  const contextMenu = Menu.buildFromTemplate([
    { label: "Floating Music Player", enabled: false },
    { type: "separator" },
    {
      label: (win == null ? void 0 : win.isVisible()) ? "Hide Window" : "Show Window",
      click: () => {
        if (win == null ? void 0 : win.isVisible()) {
          win.hide();
        } else {
          win == null ? void 0 : win.show();
          win == null ? void 0 : win.focus();
        }
      }
    },
    { type: "separator" },
    { label: "Quit", click: () => {
      isQuitting = true;
      app.quit();
    } }
  ]);
  tray.setContextMenu(contextMenu);
}
function createWindow() {
  win = new BrowserWindow({
    width: 120,
    height: 48,
    resizable: false,
    frame: false,
    movable: true,
    alwaysOnTop: true,
    icon: path.join(process.env.VITE_PUBLIC, "electron-vite.svg"),
    webPreferences: {
      preload: path.join(__dirname$1, "preload.mjs")
    }
  });
  win.webContents.on("did-finish-load", () => {
    win == null ? void 0 : win.webContents.send("main-process-message", (/* @__PURE__ */ new Date()).toLocaleString());
  });
  win.on("close", (event) => {
    if (win && !isQuitting) {
      event.preventDefault();
      win.hide();
    }
  });
  win.on("show", () => {
    updateTrayMenu();
  });
  win.on("hide", () => {
    updateTrayMenu();
  });
  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL);
  } else {
    win.loadFile(path.join(RENDERER_DIST, "index.html"));
  }
}
function createTray() {
  const iconPath = path.join(process.env.VITE_PUBLIC, "electron-vite.svg");
  const icon = nativeImage.createFromPath(iconPath);
  tray = new Tray(icon);
  tray.setToolTip("Floating Music Player");
  updateTrayMenu();
  tray.on("click", () => {
    if (win == null ? void 0 : win.isVisible()) {
      win.hide();
    } else {
      win == null ? void 0 : win.show();
      win == null ? void 0 : win.focus();
    }
  });
}
ipcMain.handle("get-desktop-sources", async () => {
  const sources = await desktopCapturer.getSources({ types: ["screen", "window"] });
  return sources.map((source) => ({
    id: source.id,
    name: source.name
  }));
});
ipcMain.on("audio-status-changed", (_, isActive) => {
  if (tray) {
    tray.setToolTip(`Floating Music Player - ${isActive ? "Music Playing" : "Idle"}`);
  }
});
ipcMain.on("media-play-pause", () => {
  if (process.platform === "win32") {
    exec('powershell -Command "(New-Object -ComObject WScript.Shell).SendKeys([char]179)"', (error) => {
      if (error) console.error("Failed to execute media command:", error);
    });
  }
});
ipcMain.on("toggle-window-size", () => {
  if (!win) return;
  const [width, height] = win.getSize();
  if (height < 100) {
    win.setResizable(true);
    win.setMinimumSize(120, 120);
    win.setSize(120, 120);
    win.setResizable(false);
  } else {
    win.setResizable(true);
    win.setMinimumSize(120, 48);
    win.setSize(120, 48);
    win.setResizable(false);
  }
});
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
    win = null;
    tray = null;
  }
});
app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
app.whenReady().then(() => {
  createWindow();
  createTray();
});
export {
  MAIN_DIST,
  RENDERER_DIST,
  VITE_DEV_SERVER_URL
};
