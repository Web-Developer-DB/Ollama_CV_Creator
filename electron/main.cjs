const { app, BrowserWindow, shell } = require("electron");
const path = require("node:path");
const { registerIpcHandlers } = require("./ipc.cjs");

const rendererUrl =
  process.env.ELECTRON_RENDERER_URL || "http://127.0.0.1:3000";
const shouldOpenDevTools = ["1", "true"].includes(
  (process.env.ELECTRON_OPEN_DEVTOOLS || "").toLowerCase()
);

if (process.platform === "linux") {
  app.disableHardwareAcceleration();
  app.commandLine.appendSwitch("disable-gpu");
}

const createMainWindow = async () => {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 960,
    minHeight: 680,
    title: "Ollama CV Creator",
    backgroundColor: "#f4f7fb",
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, "preload.cjs"),
      sandbox: false
    }
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url);

    return { action: "deny" };
  });

  await mainWindow.loadURL(rendererUrl);

  if (!app.isPackaged && shouldOpenDevTools) {
    mainWindow.webContents.openDevTools({ mode: "detach" });
  }
};

app.whenReady().then(async () => {
  registerIpcHandlers({ rendererUrl });
  await createMainWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      void createMainWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
