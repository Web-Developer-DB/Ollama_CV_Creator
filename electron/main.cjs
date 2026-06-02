// Electron main process entrypoint. It owns the BrowserWindow lifecycle,
// registers IPC handlers, and coordinates Ollama shutdown during app exit.
const { app, BrowserWindow, shell } = require("electron");
const path = require("node:path");
const { registerIpcHandlers } = require("./ipc.cjs");
const { unloadLoadedOllamaModels } = require("./ollama-shutdown.cjs");

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

let quitAfterOllamaUnload = false;
let ollamaUnloadPromise;

const reportOllamaShutdownResult = (result) => {
  if (!result.error && result.failedModels.length === 0) {
    return;
  }

  console.warn(
    "[ollama-shutdown] App quit continued after Ollama model unload warning.",
    {
      loadedModels: result.loadedModels.length,
      unloadedModels: result.unloadedModels.length,
      failedModels: result.failedModels.length,
      error: result.error
    }
  );
};

const unloadOllamaBeforeQuit = (event) => {
  if (quitAfterOllamaUnload) {
    return;
  }

  event.preventDefault();

  if (!ollamaUnloadPromise) {
    ollamaUnloadPromise = unloadLoadedOllamaModels()
      .then(reportOllamaShutdownResult)
      .catch((error) => {
        console.warn(
          "[ollama-shutdown] App quit continued after shutdown cleanup failed.",
          error
        );
      })
      .finally(() => {
        quitAfterOllamaUnload = true;
        app.quit();
      });
  }
};

app.on("before-quit", unloadOllamaBeforeQuit);

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
