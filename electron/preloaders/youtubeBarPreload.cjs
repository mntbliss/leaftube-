const { contextBridge, ipcRenderer } = require('electron')

// inlined cause of bitch ass electron cant properly handle paths in preload.
// NOTE: keep in sync with ../constants/ipc-channels.js
const IpcChannel = {
    UI_SET_EXPANDED: 'ui:set-expanded',
    UI_CLOSE_APP: 'ui:close-app',
    UI_OPEN_SETTINGS: 'ui:open-settings',
}

contextBridge.exposeInMainWorld('leafYoutubeBar', {
    shrink() {
        ipcRenderer.invoke(IpcChannel.UI_SET_EXPANDED, false)
    },
    closeApp() {
        ipcRenderer.invoke(IpcChannel.UI_CLOSE_APP)
    },
    openSettings() {
        ipcRenderer.invoke(IpcChannel.UI_OPEN_SETTINGS)
    },
})
