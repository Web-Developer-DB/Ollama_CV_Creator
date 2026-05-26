const { contextBridge } = require("electron");

contextBridge.exposeInMainWorld("desktopApi", {
  runtime: {
    platform: process.platform,
    isElectron: true
  }
});
