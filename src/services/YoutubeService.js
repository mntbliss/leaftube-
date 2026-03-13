export function playPause() {
    if (!window.desktopBridge) return
    return window.desktopBridge.player.playPause()
}

export function next() {
    if (!window.desktopBridge) return
    return window.desktopBridge.player.next()
}

export function previous() {
    if (!window.desktopBridge) return
    return window.desktopBridge.player.previous()
}

export function seekToFraction(fraction) {
    if (!window.desktopBridge) return
    return window.desktopBridge.player.seek(fraction)
}
