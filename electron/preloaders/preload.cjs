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
    UI_FORCE_QUIT: 'ui:force-quit',
    UI_RESTART_APP: 'ui:restart-app',
    UI_OPEN_SETTINGS: 'ui:open-settings',
    UI_MINI_POP: 'ui:mini-pop',
    UI_SET_PINNED: 'ui:set-pinned',
    UI_SET_POSTER_ONLY_MODE: 'ui:set-poster-only-mode',
    PLAYER_PLAY_PAUSE: 'player:play-pause',
    PLAYER_NEXT: 'player:next',
    PLAYER_PREVIOUS: 'player:previous',
    PLAYER_SEEK: 'player:seek',
    PLAYER_LIKE_CURRENT: 'player:like-current',
    PLAYER_TOGGLE_LOOP: 'player:toggle-loop',
    PLAYER_SET_VOLUME: 'player:set-volume',
    PLAYER_SET_MUTED: 'player:set-muted',
    PLAYER_GET_VOLUME: 'player:get-volume',
    PLAYER_NOW_PLAYING: 'player:now-playing',
    LOGS_SAVE: 'logs:save',
    LOGS_COPY: 'logs:copy',
    LOGS_ADD_RENDERER_ERROR: 'logs:add-renderer-error',
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
        forceQuit() {
            return ipcRenderer.invoke(IpcChannel.UI_FORCE_QUIT)
        },
        openSettings() {
            return ipcRenderer.invoke(IpcChannel.UI_OPEN_SETTINGS)
        },
        setPinned(pinned) {
            return ipcRenderer.invoke(IpcChannel.UI_SET_PINNED, pinned)
        },
        setPosterOnlyMode(enabled) {
            return ipcRenderer.invoke(IpcChannel.UI_SET_POSTER_ONLY_MODE, enabled)
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
    logs: {
        save() {
            return ipcRenderer.invoke(IpcChannel.LOGS_SAVE)
        },
        copy() {
            return ipcRenderer.invoke(IpcChannel.LOGS_COPY)
        },
        reportError(message) {
            return ipcRenderer.invoke(IpcChannel.LOGS_ADD_RENDERER_ERROR, message)
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
        likeCurrentTrack() {
            return ipcRenderer.invoke(IpcChannel.PLAYER_LIKE_CURRENT)
        },
        toggleLoop() {
            return ipcRenderer.invoke(IpcChannel.PLAYER_TOGGLE_LOOP)
        },
        onNowPlaying(callback) {
            ipcRenderer.on(IpcChannel.PLAYER_NOW_PLAYING, (_event, payload) => {
                if (typeof callback === 'function') callback(payload)
            })
        },
    },
})
