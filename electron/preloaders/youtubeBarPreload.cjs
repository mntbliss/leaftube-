const { contextBridge, ipcRenderer } = require('electron')

// inlined cause of bitch ass electron cant properly handle paths in preload.
// NOTE: keep in sync with ../constants/ipc-channels.js
const IpcChannel = {
    UI_SET_EXPANDED: 'ui:set-expanded',
    UI_CLOSE_APP: 'ui:close-app',
    UI_OPEN_SETTINGS: 'ui:open-settings',
    UI_YOUTUBE_NAVIGATE: 'ui:youtube-navigate',
    UI_YOUTUBE_SEARCH: 'ui:youtube-search',
    UI_YOUTUBE_OPEN_SIGN_IN: 'ui:youtube-open-sign-in',
    UI_YOUTUBE_OPEN_APP_MENU: 'ui:youtube-open-app-menu',
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
    goHome() {
        ipcRenderer.invoke(IpcChannel.UI_YOUTUBE_NAVIGATE, '/')
    },
    goRecommendations() {
        ipcRenderer.invoke(IpcChannel.UI_YOUTUBE_NAVIGATE, '/explore')
    },
    goSaved() {
        ipcRenderer.invoke(IpcChannel.UI_YOUTUBE_NAVIGATE, '/library')
    },
    runSearch(query) {
        ipcRenderer.invoke(IpcChannel.UI_YOUTUBE_SEARCH, query)
    },
    openSignIn() {
        ipcRenderer.invoke(IpcChannel.UI_YOUTUBE_OPEN_SIGN_IN)
    },
    openAppMenu() {
        ipcRenderer.invoke(IpcChannel.UI_YOUTUBE_OPEN_APP_MENU)
    },
})
