const { contextBridge, ipcRenderer } = require("electron");

// Expose protected methods that allow the renderer process to use
// the APIs without exposing the entire object
contextBridge.exposeInMainWorld("electronAPI", {
  minimize: () => ipcRenderer.send("window-minimize"),
  close: () => ipcRenderer.send("window-close"),
  hide: () => ipcRenderer.send("window-hide"),
  show: () => ipcRenderer.send("window-show"),
  exportData: (data) => ipcRenderer.invoke("export-data", data),
  importData: (callback) => {
    ipcRenderer.invoke("import-data").then((data) => {
      if (data) callback(data);
    });
  },
  getAlwaysOnTop: () => ipcRenderer.invoke("get-always-on-top"),
  setAlwaysOnTop: (value) => ipcRenderer.invoke("set-always-on-top", value),
  getLaunchAtStartup: () => ipcRenderer.invoke("get-launch-at-startup"),
  setLaunchAtStartup: (value) => ipcRenderer.invoke("set-launch-at-startup", value),
  openExternal: (url) => ipcRenderer.invoke("open-external", url),
  selectImage: () => ipcRenderer.invoke("select-image"),
  // Auto-update APIs
  checkForUpdates: () => ipcRenderer.invoke("check-for-updates"),
  downloadUpdate: () => ipcRenderer.invoke("download-update"),
  installUpdate: () => ipcRenderer.invoke("install-update"),
  getUpdateStatus: () => ipcRenderer.invoke("get-update-status"),
  onUpdateStatus: (callback) => {
    ipcRenderer.on("update-status", (event, status) => callback(status));
  },
  onUpdateDownloadProgress: (callback) => {
    ipcRenderer.on("update-download-progress", (event, progress) => callback(progress));
  },
  removeUpdateListeners: () => {
    ipcRenderer.removeAllListeners("update-status");
    ipcRenderer.removeAllListeners("update-download-progress");
  },
});

