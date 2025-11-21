const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
    runScript: (language, code) => ipcRenderer.invoke('run-script', { language, code }),
    getSystemInfo: () => ipcRenderer.invoke('get-system-info'),
    platform: process.platform
});
