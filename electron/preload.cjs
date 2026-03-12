const { contextBridge, ipcRenderer } = require('electron')

async function getConfig() {
  const config = await ipcRenderer.invoke('config:get')
  return config
}

async function setDiscordEnabled(enabled) {
  const result = await ipcRenderer.invoke('discord:set-enabled', enabled)
  return result
}

async function setExpanded(expanded) {
  const result = await ipcRenderer.invoke('ui:set-expanded', expanded)
  return result
}

async function resizeYoutubeView() {
  await ipcRenderer.invoke('ui:resize-youtube-view')
}

async function playerPlayPause() {
  await ipcRenderer.invoke('player:play-pause')
}

async function playerNext() {
  await ipcRenderer.invoke('player:next')
}

async function playerPrevious() {
  await ipcRenderer.invoke('player:previous')
}

async function playerSeek(fraction) {
  await ipcRenderer.invoke('player:seek', fraction)
}

function onNowPlaying(callback) {
  ipcRenderer.on('player:now-playing', (_event, payload) => {
    if (typeof callback === 'function') callback(payload)
  })
}

contextBridge.exposeInMainWorld('desktopBridge', {
  getConfig,
  setDiscordEnabled,
  setExpanded,
  resizeYoutubeView,
  playerPlayPause,
  playerNext,
  playerPrevious,
   playerSeek,
  onNowPlaying
})
