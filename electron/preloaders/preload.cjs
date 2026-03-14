const { contextBridge, ipcRenderer } = require('electron')

// inlined cause of bitch ass electron cant properly handle paths in preload.
// NOTE: keep in sync with ../constants/ipc-channels.js
const IpcChannel = {
    CONFIG_GET: 'config:get',
    CONFIG_SET: 'config:set',
    CONFIG_RESET: 'config:reset',
    DISCORD_SET_ENABLED: 'discord:set-enabled',
    UI_SET_EXPANDED: 'ui:set-expanded',
    UI_RESIZE_YOUTUBE_VIEW: 'ui:resize-youtube-view',
    UI_CLOSE_APP: 'ui:close-app',
    UI_RESTART_APP: 'ui:restart-app',
    UI_OPEN_SETTINGS: 'ui:open-settings',
    UI_MINI_POP: 'ui:mini-pop',
    PLAYER_PLAY_PAUSE: 'player:play-pause',
    PLAYER_NEXT: 'player:next',
    PLAYER_PREVIOUS: 'player:previous',
    PLAYER_SEEK: 'player:seek',
    PLAYER_SET_VOLUME: 'player:set-volume',
    PLAYER_SET_MUTED: 'player:set-muted',
    PLAYER_GET_VOLUME: 'player:get-volume',
    PLAYER_NOW_PLAYING: 'player:now-playing',
}

contextBridge.exposeInMainWorld('desktopBridge', {
    config: {
        get() {
            return ipcRenderer.invoke(IpcChannel.CONFIG_GET)
        },
        set(nextSettings) {
            return ipcRenderer.invoke(IpcChannel.CONFIG_SET, nextSettings)
        },
        reset() {
            return ipcRenderer.invoke(IpcChannel.CONFIG_RESET)
        },
    },
    discord: {
        setEnabled(enabled) {
            return ipcRenderer.invoke(IpcChannel.DISCORD_SET_ENABLED, enabled)
        },
    },
    ui: {
        setExpanded(expanded) {
            return ipcRenderer.invoke(IpcChannel.UI_SET_EXPANDED, expanded)
        },
        resizeYoutubeView() {
            return ipcRenderer.invoke(IpcChannel.UI_RESIZE_YOUTUBE_VIEW)
        },
        closeApp() {
            return ipcRenderer.invoke(IpcChannel.UI_CLOSE_APP)
        },
        openSettings() {
            return ipcRenderer.invoke(IpcChannel.UI_OPEN_SETTINGS)
        },
        restartApp() {
            return ipcRenderer.invoke(IpcChannel.UI_RESTART_APP)
        },
        onOpenSettings(callback) {
            ipcRenderer.on(IpcChannel.UI_OPEN_SETTINGS, () => {
                if (typeof callback === 'function') callback()
            })
        },
        onMiniPop(callback) {
            ipcRenderer.on(IpcChannel.UI_MINI_POP, () => {
                if (typeof callback === 'function') callback()
            })
        },
    },
    player: {
        playPause() {
            return ipcRenderer.invoke(IpcChannel.PLAYER_PLAY_PAUSE)
        },
        next() {
            return ipcRenderer.invoke(IpcChannel.PLAYER_NEXT)
        },
        previous() {
            return ipcRenderer.invoke(IpcChannel.PLAYER_PREVIOUS)
        },
        seek(fraction) {
            return ipcRenderer.invoke(IpcChannel.PLAYER_SEEK, fraction)
        },
        setVolume(fraction) {
            return ipcRenderer.invoke(IpcChannel.PLAYER_SET_VOLUME, fraction)
        },
        setMuted(isMuted) {
            return ipcRenderer.invoke(IpcChannel.PLAYER_SET_MUTED, isMuted)
        },
        getVolume() {
            return ipcRenderer.invoke(IpcChannel.PLAYER_GET_VOLUME)
        },
        onNowPlaying(callback) {
            ipcRenderer.on(IpcChannel.PLAYER_NOW_PLAYING, (_event, payload) => {
                if (typeof callback === 'function') callback(payload)
            })
        },
    },
})
