const { contextBridge, ipcRenderer } = require("electron");

const invoke = (channel, payload) => ipcRenderer.invoke(channel, payload);

contextBridge.exposeInMainWorld("desktopApi", {
  runtime: {
    platform: process.platform,
    isElectron: true
  },
  ai: {
    status: (request) => invoke("ai:status", request),
    modelControl: (request) => invoke("ai:model-control", request),
    extractProfile: (request) => invoke("ai:extract-profile", request),
    analyzeJob: (request) => invoke("ai:analyze-job", request),
    generateCv: (request) => invoke("ai:generate-cv", request),
    generateCoverLetter: (request) =>
      invoke("ai:generate-cover-letter", request)
  },
  storage: {
    listProjects: () => invoke("storage:list-projects"),
    saveProject: (project) => invoke("storage:save-project", project),
    deleteProject: (id) => invoke("storage:delete-project", id)
  }
});
