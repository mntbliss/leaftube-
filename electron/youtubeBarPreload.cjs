const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('leafYoutubeBar', {
    shrink() {
        ipcRenderer.invoke('ui:set-expanded', false)
    },
})
