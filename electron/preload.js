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
});

