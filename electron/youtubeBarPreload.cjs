const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('leafYoutubeBar', {
    shrink() {
        ipcRenderer.invoke('ui:set-expanded', false)
    },
    closeApp() {
        ipcRenderer.invoke('ui:close-app')
    },
    openSettings() {
        ipcRenderer.invoke('ui:open-settings')
    },
})
