const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('desktopBridge', {
    config: {
        get() {
            return ipcRenderer.invoke('config:get')
        },
        set(nextSettings) {
            return ipcRenderer.invoke('config:set', nextSettings)
        },
        reset() {
            return ipcRenderer.invoke('config:reset')
        },
    },
    discord: {
        setEnabled(enabled) {
            return ipcRenderer.invoke('discord:set-enabled', enabled)
        },
    },
    ui: {
        setExpanded(expanded) {
            return ipcRenderer.invoke('ui:set-expanded', expanded)
        },
        resizeYoutubeView() {
            return ipcRenderer.invoke('ui:resize-youtube-view')
        },
        closeApp() {
            return ipcRenderer.invoke('ui:close-app')
        },
        openSettings() {
            return ipcRenderer.invoke('ui:open-settings')
        },
        restartApp() {
            return ipcRenderer.invoke('ui:restart-app')
        },
        onOpenSettings(callback) {
            ipcRenderer.on('ui:open-settings', () => {
                if (typeof callback === 'function') callback()
            })
        },
        onMiniPop(callback) {
            ipcRenderer.on('ui:mini-pop', () => {
                if (typeof callback === 'function') callback()
            })
        },
    },
    player: {
        playPause() {
            return ipcRenderer.invoke('player:play-pause')
        },
        next() {
            return ipcRenderer.invoke('player:next')
        },
        previous() {
            return ipcRenderer.invoke('player:previous')
        },
        seek(fraction) {
            return ipcRenderer.invoke('player:seek', fraction)
        },
        onNowPlaying(callback) {
            ipcRenderer.on('player:now-playing', (_event, payload) => {
                if (typeof callback === 'function') callback(payload)
            })
        },
    },
})
