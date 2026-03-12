const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('desktopBridge', {
  config: {
    get() {
      return ipcRenderer.invoke('config:get')
    }
  },
  discord: {
    setEnabled(enabled) {
      return ipcRenderer.invoke('discord:set-enabled', enabled)
    }
  },
  ui: {
    setExpanded(expanded) {
      return ipcRenderer.invoke('ui:set-expanded', expanded)
    },
    resizeYoutubeView() {
      return ipcRenderer.invoke('ui:resize-youtube-view')
    }
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
    }
  }
})
