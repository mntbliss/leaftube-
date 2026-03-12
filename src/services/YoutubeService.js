export function playPause() {
  if (!window.desktopBridge) return
  return window.desktopBridge.playerPlayPause()
}

export function next() {
  if (!window.desktopBridge) return
  return window.desktopBridge.playerNext()
}

export function previous() {
  if (!window.desktopBridge) return
  return window.desktopBridge.playerPrevious()
}

export function seekToFraction(fraction) {
  if (!window.desktopBridge) return
  return window.desktopBridge.playerSeek(fraction)
}

